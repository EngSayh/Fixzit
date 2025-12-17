#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

command -v rg >/dev/null 2>&1 || { echo "❌ ripgrep (rg) required"; exit 1; }

rm -rf .artifacts
mkdir -p .artifacts/{test,scan}

date -Iseconds | tee .artifacts/test/timestamp.txt
node -v | tee .artifacts/test/node.txt
pnpm -v | tee .artifacts/test/pnpm.txt
git rev-parse --short HEAD | tee .artifacts/test/commit.txt

# ---- P0: .artifacts must not be tracked ----
ART_TRACKED="$(git ls-files .artifacts | wc -l | tr -d ' ')"
echo "$ART_TRACKED" | tee .artifacts/scan/artifacts-tracked.count.txt
if [[ "$ART_TRACKED" != "0" ]]; then
  echo "❌ .artifacts is tracked. Run: git rm -r --cached .artifacts"
  exit 1
fi

# ---- Lint ----
echo "== LINT ==" | tee .artifacts/test/lint.log
if pnpm -s lint:prod >/dev/null 2>&1; then
  pnpm lint:prod 2>&1 | tee -a .artifacts/test/lint.log
else
  pnpm lint --max-warnings=0 2>&1 | tee -a .artifacts/test/lint.log
fi

# ---- Typecheck ----
echo "== TYPECHECK ==" | tee .artifacts/test/typecheck.log
pnpm typecheck 2>&1 | tee -a .artifacts/test/typecheck.log

# ---- Tests (unfiltered) ----
echo "== VITEST ==" | tee .artifacts/test/vitest-full.log
pnpm vitest run --reporter=default 2>&1 | tee -a .artifacts/test/vitest-full.log

# P0: fail on hoist errors
rg -n "Cannot access .* before initialization" .artifacts/test/vitest-full.log \
  | tee .artifacts/scan/hoist-errors.txt || true
if [[ -s .artifacts/scan/hoist-errors.txt ]]; then
  echo "❌ vi.mock hoisting errors detected."
  exit 1
fi

# ---- Build ----
echo "== BUILD ==" | tee .artifacts/test/build.log
pnpm build 2>&1 | tee -a .artifacts/test/build.log

# ---- P0: Secret scan (filename-only, credential-shaped) ----
MONGO_CRED_RE='mongodb(\+srv)?:\/\/[^@\s:]+:[^@\s]+@'
PRIVKEY_RE='BEGIN (RSA|EC|OPENSSH) PRIVATE KEY'
AWS_RE='AKIA[0-9A-Z]{16}'
BEARER_RE='Bearer\s+[A-Za-z0-9._~+/=-]{30,}'
ENV_ASSIGN_RE='(AUTH_SECRET|NEXTAUTH_SECRET|TAQNYAT_BEARER_TOKEN|SENDGRID_API_KEY|TAP_SECRET(_KEY)?|PAYTABS(_SERVER_KEY)?)\s*=\s*["'\'' ]?[A-Za-z0-9._~+/=-]{20,}'

rg -l --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!.artifacts/**' \
  -e "$MONGO_CRED_RE|$PRIVKEY_RE|$AWS_RE|$BEARER_RE|$ENV_ASSIGN_RE" \
  . | tee .artifacts/scan/secret-scan.repo.files.txt || true

if [[ -s .artifacts/scan/secret-scan.repo.files.txt ]]; then
  echo "❌ Potential secrets detected (filenames listed). Treat as P0."
  exit 1
fi

# ---- Scans (untruncated) ----
rg -n "@vitest-environment node" tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/env-node.full.txt || true

# Server-only import leak into app/**/*.tsx must be zero
rg -n "from ['\"](mongoose|mongodb|bullmq|ioredis)['\"]|require\(['\"](mongoose|mongodb|bullmq|ioredis)['\"]\)" app -g "*.tsx" \
  | tee .artifacts/scan/server-only-imports.app-tsx.txt || true
if [[ -s .artifacts/scan/server-only-imports.app-tsx.txt ]]; then
  echo "❌ Server-only imports detected in app/**/*.tsx (client leak risk)."
  exit 1
fi

rg -n "\bimport\(" tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/dynamic-imports-tests.full.txt || true

rg -n 'from ["\x27](\.\./\.\./)?app/|from ["\x27]@/app/' tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/test-imports-app-pages.full.txt || true

rg -n 'vi\.mock\(|vi\.doMock\(|vi\.hoisted\(' tests -g "*.ts" -g "*.tsx" \
  | tee .artifacts/scan/mocks.full.txt || true

wc -l .artifacts/scan/*.txt | tee .artifacts/scan/counts.txt || true

echo "✅ MERGE GATE PASSED"
echo "Artifacts: .artifacts/test + .artifacts/scan"
