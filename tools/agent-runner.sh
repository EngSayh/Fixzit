#!/usr/bin/env bash
set -euo pipefail

# Agent Governor Command Wrapper (Non-Interactive)
# Only allowlisted commands run without prompts.

# Allowlist (regex). Only these run non-interactively.
ALLOW='^(npm|pnpm|yarn) (run )?(build|lint|test|typecheck|format|fixzit:|dev|start)$|^node scripts/|^tsx |^bun |^git (add|commit|checkout|restore|mv|rm|apply|status|diff|log)|^npx (eslint|prettier|tsc)|^bash scripts/'
DENY='(rm -rf /|mkfs|:(){:|:&};:|shutdown|reboot|curl .*sh |wget .*sh )'

CMD="$*"

if [[ "$CMD" =~ $DENY ]]; then
  echo "[BLOCKED] Dangerous command: $CMD"
  exit 2
fi

if [[ "$CMD" =~ $ALLOW ]]; then
  echo "[RUN] $CMD"
  eval "$CMD"
else
  echo "[BLOCKED] Not in allowlist. Use an npm script or CI."
  echo "Command: $CMD"
  exit 3
fi
