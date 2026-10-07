# a100tests — public platform spike

Disposable, synthetic-only tests of **published** `@kalviumjr/agent100` packages. No A100 runtime source, credentials, curriculum, learner records or live inference. The tiny fixture is copied from A100's explicitly synthetic counter fixture and enables codemode.

## Run

Node >=24.21.0; install `rg` and `fd`/`fdfind` on PATH. On macOS: `brew install ripgrep fd`. On Ubuntu: `sudo apt-get install ripgrep fd-find`.

```sh
npm ci --ignore-scripts
npx playwright install --with-deps chromium
npm test
```

Manual Actions dispatch accepts an exact published version (default 1.5.1). Linux/macOS jobs install from npm, provision search prerequisites, then run serial tests with hard job/test deadlines. Public repo hosted-runner usage is subject to GitHub's terms and runner availability; this isn't an unlimited-compute promise.

## Coverage in this first spike

- Clean npm install and actual npx CLI startup, VERSION/service/schema agreement.
- Chromium loads the packaged studio without script errors.
- Real HTTP and local synthetic SSE inference; real file/edit/search/bash tools, paths with spaces/Unicode.
- Packaged QuickJS codemode, ordinary Stop and continuation, persistence after service restart.
- Missing search executables fail rather than silently succeeding.
- Native Windows probe detects WSL/distributions/Node; it makes **no setup changes**.

Stop is best effort, not OS isolation. No hostile process/crash campaigns. No cross-platform support certification until results are examined. No assertion of completed Windows/WSL journeys from a detection-only job.

## Windows / WSL

Inside WSL, use the Linux instructions. From native Windows, `npm run test:windows` exits **3 BLOCKED** if no WSL distribution with Node is available. Actions converts that expected blocked probe into an explicit job summary and JSON artifact, not a claimed Windows pass. Native A100's actual startup behaviour is not modified by this harness.

Proposed future terminal prompt: “Agent 100 requires WSL on Windows. May we help set it up, install Node inside it, and launch Agent 100 there?” No installation/reboot without explicit consent. Distribution selection, elevation, reboot/resume, state ownership and Windows-browser loopback reachability need real-machine work; hosted runner virtualization may not permit full WSL setup.

## Next steps after first results

1. Inspect Linux/macOS failures; propose minimal fixes upstream without rebuilding the package here.
2. Add frozen assessment/evaluation, re-provision-after-restart and browser Stop interaction coverage (current Stop is exercised through the real client).
3. Test a usable WSL machine's full npm/browser journey, then design opt-in installation UX separately.
4. Keep sanitized logs only, seven-day artifact retention. Assertions and fixture data are synthetic; do not upload runtime SQLite or real user state.
