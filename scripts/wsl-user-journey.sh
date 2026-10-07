#!/usr/bin/env bash
set -euo pipefail
# Provision a disposable non-root CI user; never the proposed production user-creation UX.
source_dir="$1"
version="$2"
id -u a100spike >/dev/null 2>&1 || useradd --create-home --shell /bin/bash a100spike
mkdir -p /home/a100spike/a100tests
tar -C "$source_dir" --exclude=node_modules --exclude=.git --exclude=artifacts -cf - . | tar -C /home/a100spike/a100tests -xf -
rm -rf /home/a100spike/a100tests/node_modules /home/a100spike/a100tests/artifacts
chown -R a100spike:a100spike /home/a100spike/a100tests
# Browser system dependencies were installed by root bootstrap, but browser/cache/package/state belong to this user.
runuser -u a100spike -- env PATH="/opt/node-v24.21.0-linux-x64/bin:/usr/local/bin:/usr/bin:/bin" A100_VERSION="$version" bash -c '
  set -euo pipefail
  cd "$HOME/a100tests"
  test "$(id -u)" != 0
  npm ci --ignore-scripts --no-audit --no-fund
  npm install --no-save --ignore-scripts --no-audit --no-fund "@kalviumjr/agent100@$A100_VERSION"
  npx playwright install chromium
  mkdir -p artifacts
  npm test 2>&1 | tee artifacts/wsl-user-tests.log
  node node_modules/@kalviumjr/agent100/bin/a100.mjs --version
'
cp /home/a100spike/a100tests/artifacts/wsl-user-tests.log "$source_dir/artifacts/"
