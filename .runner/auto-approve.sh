#!/usr/bin/env bash
# Auto-approve shim for Replit / Generic runners
# Log then run any passed command without interactive prompts.

LOG_FILE="logs/auto-approve.log"
mkdir -p logs

echo "$(date -Is) :: $@" >> "$LOG_FILE"

# Best-effort non-interactive defaults
export CI=1
export YES=1
export FORCE=1
export SKIP_CONFIRM=1
export DEBIAN_FRONTEND=noninteractive
export NPM_CONFIG_YES=true

# If a tool still prompts, feed "yes"
yes 2>/dev/null | "$@" || "$@"
