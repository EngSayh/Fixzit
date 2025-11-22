#!/usr/bin/env bash
# Simple guardrail: fail CI if hard-coded database URIs with credentials are checked into code.
# Scans source directories and ignores known test fixtures.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "🔍 Scanning for hard-coded secrets/URIs..."

PATTERNS=(
  "mongodb\\+srv://.*@"
  "mongodb://.*@"
  "postgres://.*@"
  "mysql://.*@"
  "amqp://.*@"
  "redis://.*@"
  "smtps?://.*@"
  # Cloud/provider keys
  "AKIA[0-9A-Z]{16}"
  "ASIA[0-9A-Z]{16}"
  "aws_secret_access_key\\s*[:=]\\s*['\"][A-Za-z0-9/+=]{35,}['\"]"
  "stripe_(live|test)_[A-Za-z0-9]{10,}"
  "sk_(live|test)_[A-Za-z0-9]{20,}"
  # Tokens / JWT-like
  "Authorization:\\s*['\"]Bearer\\s+[A-Za-z0-9-_\\.]{20,}['\"]"
  "eyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9._-]{10,}\\.[A-Za-z0-9._-]{10,}"
  # Email/SMS provider keys
  "apikey\\s*[:=]\\s*['\"][A-Za-z0-9-_]{16,}['\"]"
  "api_key\\s*[:=]\\s*['\"][A-Za-z0-9-_]{16,}['\"]"
  "SENDGRID_API_KEY\\s*[:=]\\s*['\"][A-Za-z0-9-_]{16,}['\"]"
  "MAILGUN_API_KEY\\s*[:=]\\s*['\"][A-Za-z0-9-_]{16,}['\"]"
  "TWILIO_AUTH_TOKEN\\s*[:=]\\s*['\"][A-Za-z0-9]{16,}['\"]"
  "TWILIO_ACCOUNT_SID\\s*[:=]\\s*['\"]AC[A-Za-z0-9]{32}['\"]"
  "GOOGLE_API_KEY\\s*[:=]\\s*['\"][A-Za-z0-9-_]{16,}['\"]"
  "SMTP_PASSWORD\\s*[:=]\\s*['\"][^'\"]{8,}['\"]"
  "AWS_SESSION_TOKEN\\s*[:=]\\s*['\"][A-Za-z0-9/+=]{16,}['\"]"
  "pk_(live|test)_[A-Za-z0-9]{10,}"
  "xox[baprs]-[A-Za-z0-9-]{10,}"
  "xoxc-[A-Za-z0-9-]{10,}"
  "xapp-[A-Za-z0-9-]{10,}"
  "xoxa-[A-Za-z0-9-]{10,}"
  "whsec_[A-Za-z0-9]{12,}"
  "gh[pousr]_[A-Za-z0-9]{20,}"
  "glpat-[A-Za-z0-9_-]{20,}"
  "HEROKU_API_KEY\\s*[:=]\\s*['\"][A-Za-z0-9_-]{20,}['\"]"
  "DO_TOKEN\\s*[:=]\\s*['\"][A-Za-z0-9_-]{20,}['\"]"
  "AZURE_(CLIENT_SECRET|PASSWORD)\\s*[:=]\\s*['\"][^'\"]{12,}['\"]"
  "AIza[0-9A-Za-z\\-_]{35}"
)

# Directories to scan (code only)
SCAN_PATHS=(
  "app"
  "components"
  "lib"
  "services"
  "scripts"
  "tools"
  "src"
  "server"
  "models"
)

# Allowed fixtures/patterns (avoid flagging test stubs)
ALLOW_GLOBS=(
  "!scripts/security/test-mongodb-security.sh"
  "!scripts/security/check-hardcoded-uris.sh"
  "!**/node_modules/**"
  "!**/.next/**"
  "!**/_artifacts/**"
  "!tests/**"
  "!qa/**"
  "!**/fixtures/**"
)

EXIT_CODE=0

for pattern in "${PATTERNS[@]}"; do
  RG_ARGS=()
  for g in "${ALLOW_GLOBS[@]}"; do
    RG_ARGS+=(--glob "$g")
  done

  if rg --no-heading --color never --pcre2 "$pattern" "${SCAN_PATHS[@]}" "${RG_ARGS[@]}"; then
    echo "❌ Hard-coded URI pattern detected: $pattern"
    EXIT_CODE=1
  fi
done

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "❌ Security scan failed: remove hard-coded credentials/secrets and use environment variables."
else
  echo "✅ No hard-coded secrets/URIs detected."
fi

exit "$EXIT_CODE"
