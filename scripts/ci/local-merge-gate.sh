#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

command -v rg >/dev/null 2>&1 || { echo "❌ ripgrep (rg) required"; exit 1; }

# ---- P0: Check .artifacts tracking BEFORE deletion ----
# Note: Removed audit guard - merge gate is audit-immune and parallel-safe
ART_TRACKED="$(git ls-files .artifacts 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$ART_TRACKED" != "0" ]]; then
  echo "❌ .artifacts is tracked by git. Run: git rm -r --cached .artifacts"
  exit 1
fi

# Now safe to clean
rm -rf .artifacts
mkdir -p .artifacts/{test,scan}

date -Iseconds | tee .artifacts/test/timestamp.txt
node -v | tee .artifacts/test/node.txt
pnpm -v | tee .artifacts/test/pnpm.txt
git rev-parse --short HEAD | tee .artifacts/test/commit.txt
echo "$ART_TRACKED" | tee .artifacts/scan/artifacts-tracked.count.txt

# ---- Timeout wrapper (optional, graceful fallback) ----
if command -v gtimeout >/dev/null 2>&1; then
  TMO=gtimeout
elif command -v timeout >/dev/null 2>&1; then
  TMO=timeout
else
  TMO=""
fi

run_timed() {
  local secs="$1"; shift
  if [[ -n "$TMO" ]]; then
    $TMO "$secs" "$@"
  else
    # No timeout available - run directly
    "$@"
  fi
}

# ---- Lint (direct tool, no audit chain) ----
echo "== LINT ==" | tee .artifacts/test/lint.log
run_timed 600 pnpm exec next lint 2>&1 | tee -a .artifacts/test/lint.log

# ---- Typecheck (direct tsc, no audit chain) ----
echo "== TYPECHECK ==" | tee .artifacts/test/typecheck.log
run_timed 900 pnpm exec tsc --noEmit 2>&1 | tee -a .artifacts/test/typecheck.log

# ---- Tests (direct vitest, no audit chain) ----
echo "== VITEST ==" | tee .artifacts/test/vitest-full.log
run_timed 1800 pnpm exec vitest run --reporter=default 2>&1 | tee -a .artifacts/test/vitest-full.log

# P0: fail on hoist errors
rg -n "Cannot access .* before initialization" .artifacts/test/vitest-full.log \
  | tee .artifacts/scan/hoist-errors.txt || true
if [[ -s .artifacts/scan/hoist-errors.txt ]]; then
  echo "❌ vi.mock hoisting errors detected."
  exit 1
fi

# ---- Build (keep as-is for production alignment) ----
echo "== BUILD ==" | tee .artifacts/test/build.log
run_timed 900 pnpm build 2>&1 | tee -a .artifacts/test/build.log

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
rg -n "from ['\"](mongoose|mongodb)['\"]|require\(['\"](mongoose|mongodb)['\"]\)" app -g "*.tsx" \
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

