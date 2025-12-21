#!/bin/bash
# Agent Pre-flight Check - Auto-triggered before any AI agent request
# Prevents VS Code Code 5 crashes by maintaining system health

LOGFILE="/tmp/agent-preflight.log"
LOCK_FILE="/tmp/agent-preflight.lock"

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
    exit 0
fi
touch "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOGFILE"
}

log "=== Pre-flight check started ==="

# 1. Check file descriptor usage
FD_COUNT=$(lsof -c Code 2>/dev/null | wc -l | tr -d ' ')
if [ "$FD_COUNT" -gt 5000 ]; then
    log "⚠️ High FD usage: $FD_COUNT - cleaning stale sockets"
    find /var/folders -name "*.sock" -user $(whoami) -mmin +30 -delete 2>/dev/null || true
fi

# 2. Check shell process count
SHELL_COUNT=$(pgrep -f 'zsh|bash' | wc -l | tr -d ' ')
if [ "$SHELL_COUNT" -gt 30 ]; then
    log "⚠️ Too many shells: $SHELL_COUNT - killing old zombies"
    # Kill zombie zsh processes older than 4 hours
    ps aux | grep zsh | grep -v grep | awk '$10 ~ /[0-9]+:[0-9]+/ && $10 > "4:00" {print $2}' | xargs kill 2>/dev/null || true
fi

# 3. Check memory pressure
FREE_PAGES=$(vm_stat | grep 'Pages free' | awk '{print $3}' | tr -d '.')
FREE_MB=$((FREE_PAGES * 4096 / 1024 / 1024))
if [ "$FREE_MB" -lt 2048 ]; then
    log "⚠️ Low memory: ${FREE_MB}MB - clearing VS Code cache"
    rm -rf ~/Library/Application\ Support/Code/Cache/* 2>/dev/null || true
    rm -rf ~/Library/Application\ Support/Code/CachedData/* 2>/dev/null || true
fi

# 4. Kill orphaned tsserver processes (keep max 2)
TSSERVER_COUNT=$(pgrep -f tsserver | wc -l | tr -d ' ')
if [ "$TSSERVER_COUNT" -gt 4 ]; then
    log "⚠️ Too many tsservers: $TSSERVER_COUNT - killing extras"
    pkill -f "tsserver.*--enableTelemetry" 2>/dev/null || true
fi

# 5. Kill orphaned MongoDB test instances
MONGO_COUNT=$(pgrep -f "mongod.*mongo-mem" | wc -l | tr -d ' ')
if [ "$MONGO_COUNT" -gt 2 ]; then
    log "⚠️ Orphaned MongoDB: $MONGO_COUNT - cleaning"
    pkill -f "mongod.*mongo-mem" 2>/dev/null || true
fi

# 6. Ensure file descriptor limit is high
CURRENT_LIMIT=$(ulimit -n)
if [ "$CURRENT_LIMIT" -lt 65536 ]; then
    ulimit -n 65536 2>/dev/null || true
    log "📈 Increased FD limit from $CURRENT_LIMIT to $(ulimit -n)"
fi

log "✅ Pre-flight complete (FD: $FD_COUNT, Shells: $SHELL_COUNT, FreeMB: $FREE_MB)"
