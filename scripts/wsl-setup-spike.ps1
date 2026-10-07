# Explicitly authorized disposable GitHub runner experiment only.
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force artifacts | Out-Null
$report = [ordered]@{ installExit = $null; launchExit = $null; journeyExit = $null; stage = 'install'; result = 'BLOCKED'; rebootPerformed = $false; interactiveUserSetupTested = $false }
function Save-Report { $report | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 artifacts/wsl-setup.json }
try {
    # --web-download avoids the Microsoft Store. --no-launch avoids first-user interactive setup.
    & wsl.exe --install -d Ubuntu --web-download --no-launch 2>&1 | Out-File -Encoding utf8 artifacts/wsl-install.log
    $report.installExit = $LASTEXITCODE
    Save-Report
    if ($LASTEXITCODE -ne 0) { throw "WSL install failed or needs elevation/reboot: $LASTEXITCODE" }
    $report.stage = 'launch'
    & wsl.exe -d Ubuntu -u root --exec sh -lc 'uname -a; cat /etc/os-release' 2>&1 | Out-File -Encoding utf8 artifacts/wsl-launch.log
    $report.launchExit = $LASTEXITCODE
    Save-Report
    if ($LASTEXITCODE -ne 0) { throw "Ubuntu cannot launch on this runner (possible reboot/virtualization requirement): $LASTEXITCODE" }
    $report.stage = 'journey'
    $linuxPath = (& wsl.exe -d Ubuntu -u root --exec wslpath -a "$PWD").Trim()
    if ($LASTEXITCODE -ne 0 -or -not $linuxPath) { throw 'Cannot resolve checkout path inside WSL' }
    & wsl.exe -d Ubuntu -u root --exec bash "$linuxPath/scripts/wsl-journey.sh" "$linuxPath" "$env:A100_VERSION" 2>&1 | Out-File -Encoding utf8 artifacts/wsl-journey.log
    $report.journeyExit = $LASTEXITCODE
    if ($LASTEXITCODE -ne 0) { throw "WSL package journey failed: $LASTEXITCODE" }
    $report.stage = 'non-root-journey'
    & wsl.exe -d Ubuntu -u root --exec bash "$linuxPath/scripts/wsl-user-journey.sh" "$linuxPath" "$env:A100_VERSION" 2>&1 | Out-File -Encoding utf8 artifacts/wsl-user-setup.log
    $report.nonRootExit = $LASTEXITCODE
    if ($LASTEXITCODE -ne 0) { throw "Non-root WSL journey failed: $LASTEXITCODE" }
    $report.stage = 'windows-loopback'
    & ./scripts/wsl-loopback.ps1
    $report.result = 'PASS'
    $report.stage = 'completed'
    Save-Report
    'PASS: published package journey inside Ubuntu/WSL. CI root bootstrap bypasses interactive user creation; real-user setup and Windows-browser access are not certified.' | Out-File -Append $env:GITHUB_STEP_SUMMARY
} catch {
    $report.error = $_.Exception.Message
    Save-Report
    "BLOCKED/FAILED at $($report.stage): $($_.Exception.Message). No reboot or elevation attempted." | Out-File -Append $env:GITHUB_STEP_SUMMARY
    throw
}
