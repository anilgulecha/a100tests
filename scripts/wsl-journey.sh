#!/usr/bin/env bash
# Disposable CI distro only. Real-user installer UX is NOT implemented here.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl ca-certificates xz-utils ripgrep fd-find
node_version=24.21.0
case "$(uname -m)" in x86_64) arch=x64;; aarch64) arch=arm64;; *) echo 'BLOCKED: unsupported architecture'; exit 3;; esac
mkdir -p /opt/a100-node-download
cd /opt/a100-node-download
file="node-v${node_version}-linux-${arch}.tar.xz"
curl --fail --location --max-time 120 --output "$file" "https://nodejs.org/dist/v${node_version}/$file"
curl --fail --location --max-time 120 --output SHASUMS256.txt "https://nodejs.org/dist/v${node_version}/SHASUMS256.txt"
grep "  ${file}$" SHASUMS256.txt | sha256sum --check -
tar -xJf "$file" -C /opt
export PATH="/opt/node-v${node_version}-linux-${arch}/bin:$PATH"
node --version
# Linux-owned source/state/dependencies; don't install node_modules on /mnt/c.
mkdir -p /root/a100tests
cp -R "$1"/. /root/a100tests/
cd /root/a100tests
rm -rf node_modules artifacts
npm ci --ignore-scripts --no-audit --no-fund
export A100_VERSION="$2"
node --input-type=module -e 'if(!/^\d+\.\d+\.\d+$/.test(process.env.A100_VERSION))process.exit(1)'
npm install --no-save --ignore-scripts --no-audit --no-fund "@kalviumjr/agent100@$A100_VERSION"
npx playwright install --with-deps chromium
mkdir -p artifacts
set -o pipefail
npm test 2>&1 | tee artifacts/wsl-tests.log
cp -R artifacts "$1"/
