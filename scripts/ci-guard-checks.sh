#!/usr/bin/env bash
set -euo pipefail

fail=0

# Block committed .only in tests
if rg --glob "*.{ts,tsx,js,jsx}" "\.only\(" tests app components server lib >/tmp/guard-only.txt; then
  echo "❌ Found .only in test or app code (remove before merging):"
  cat /tmp/guard-only.txt
  fail=1
fi

# Report skipped tests (informational)
if rg --glob "*.{ts,tsx,js,jsx}" "test\.skip\(|it\.skip\(" tests app >/tmp/guard-skip.txt; then
  echo "ℹ️ Skipped tests detected (ensure reason/owner):"
  head -n 50 /tmp/guard-skip.txt
fi

exit $fail
