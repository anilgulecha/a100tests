$ErrorActionPreference = 'Stop'
function Start-LinuxService {
    $info = [System.Diagnostics.ProcessStartInfo]::new()
    $info.FileName = 'wsl.exe'
    foreach ($arg in @('-d','Ubuntu','-u','a100spike','--exec','/opt/node-v24.21.0-linux-x64/bin/node','/home/a100spike/a100tests/scripts/wsl-loopback-server.mjs')) { $info.ArgumentList.Add($arg) }
    $info.UseShellExecute = $false
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = [System.Diagnostics.Process]::Start($info)
    $stderr = $process.StandardError.ReadToEndAsync()
    $line = $process.StandardOutput.ReadLineAsync()
    if (-not $line.Wait(30000)) { $process.Kill($true); throw 'WSL service startup deadline' }
    $ready = $line.Result | ConvertFrom-Json
    if (-not $ready.ready -or $ready.uid -eq 0) { $process.Kill($true); throw 'Expected ready non-root service' }
    return @{ process=$process; ready=$ready; stderr=$stderr }
}
function Stop-LinuxService($service) {
    $service.process.StandardInput.WriteLine('stop')
    if (-not $service.process.WaitForExit(15000)) { $service.process.Kill($true); throw 'WSL service shutdown deadline' }
    if ($service.process.ExitCode -ne 0) { throw "WSL server exited $($service.process.ExitCode): $($service.stderr.Result)" }
    $service.process.Dispose()
}
$service = Start-LinuxService
try {
    $hostInfo = Invoke-RestMethod -Uri http://127.0.0.1:4321/api/host -TimeoutSec 15
    if ($hostInfo.service.version -ne $env:A100_VERSION) { throw 'Windows localhost service version mismatch' }
    & node scripts/windows-browser.mjs 2>&1 | Out-File -Encoding utf8 artifacts/windows-browser.log
    if ($LASTEXITCODE -ne 0) { throw 'Windows Chromium journey failed' }
} finally { Stop-LinuxService $service }
# Relaunch Linux service, proving persisted user-owned state and control-path cleanup.
$service = Start-LinuxService
try {
    if (-not $service.ready.persisted) { throw 'Linux user-owned state did not survive relaunch' }
    $hostInfo = Invoke-RestMethod -Uri http://127.0.0.1:4321/api/host -TimeoutSec 15
    if ($hostInfo.service.version -ne $env:A100_VERSION) { throw 'Restarted service version mismatch' }
} finally { Stop-LinuxService $service }
@{ result='PASS'; nonRoot=$true; windowsLocalhost=$true; windowsChromium=$true; persistedAfterRelaunch=$true } | ConvertTo-Json | Set-Content artifacts/windows-loopback.json
