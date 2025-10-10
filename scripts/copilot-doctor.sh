#!/usr/bin/env bash
set -euo pipefail

echo "=== Copilot Connectivity Doctor ==="
echo "Running from: $(pwd)"
echo "Date: $(date)"

echo -e "\n=== Proxy environment variables ==="
env | grep -Ei '^(http|https)_proxy|no_proxy' || echo "(none set)"

echo -e "\n=== Curl HEAD checks for Copilot endpoints ==="
for u in \
  https://api.github.com \
  https://github.com/login \
  https://copilot-proxy.githubusercontent.com \
  https://www.githubcopilot.com \
  https://origin-tracker.githubusercontent.com
do
  echo -n "$u -> "
  curl -I --max-time 10 -sS "$u" 2>&1 | head -n 1 || echo "ERR"
done

echo -e "\n=== OpenSSL handshake test (api.github.com:443) ==="
( echo | openssl s_client -connect api.github.com:443 -servername api.github.com -brief 2>&1 ) | head -n 5 || echo "Failed to connect via OpenSSL"

echo -e "\n=== Git proxy + CA config ==="
git config --global -l 2>/dev/null | grep -E 'http\.proxy|https\.proxy|sslCAInfo' || echo "(no git-level proxy/CA configured)"

echo -e "\n=== VS Code server Copilot extensions ==="
ls -1 ~/.vscode-server/extensions 2>/dev/null | grep -i 'copilot' || echo "(Copilot extensions not found in ~/.vscode-server/extensions)"

echo -e "\n=== Node.js version ==="
node --version || echo "Node not found"

echo -e "\n=== Network interfaces ==="
ip addr show 2>/dev/null | grep -E 'inet ' || ifconfig 2>/dev/null | grep -E 'inet ' || echo "Could not determine network info"

echo -e "\n=== DNS resolution test ==="
for host in api.github.com copilot-proxy.githubusercontent.com; do
  echo -n "$host -> "
  getent hosts $host 2>/dev/null | awk '{print $1}' || echo "Failed to resolve"
done

echo -e "\n=== ✅ Doctor complete ==="
echo "If any endpoint shows ERR, check your firewall/proxy settings."
echo "Required endpoints: https://docs.github.com/en/copilot/managing-copilot/configure-personal-settings/configuring-network-settings-for-github-copilot"
