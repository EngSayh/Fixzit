#!/bin/bash
# VS Code Optimizer for MacBook Pro - Prevents Code 5 Crashes
# Run this script when VS Code becomes unstable or before heavy development sessions

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         VS Code Optimizer for MacBook Pro (36GB RAM)         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# 1. Clean up stale socket files
echo "🧹 Cleaning stale socket files..."
SOCKET_COUNT=$(find /var/folders -name "*.sock" -user $(whoami) 2>/dev/null | wc -l | tr -d ' ')
find /var/folders -name "*.sock" -user $(whoami) -mmin +60 -delete 2>/dev/null || true
echo "   Cleaned sockets older than 60 minutes (found $SOCKET_COUNT total)"

# 2. Kill orphaned TypeScript servers
echo "🔪 Killing orphaned TypeScript servers..."
pkill -f "tsserver.*--enableTelemetry" 2>/dev/null || true
pkill -f "typescript-language-features" 2>/dev/null || true
sleep 1

# 3. Clean up orphaned MongoDB test instances
echo "🗄️  Cleaning orphaned MongoDB instances..."
pkill -f "mongod.*mongo-mem" 2>/dev/null || true

# 4. Clean up orphaned node processes (older than 2 hours with no parent)
echo "🔧 Cleaning orphaned Node.js processes..."
ps aux | grep node | grep -v "Code Helper" | grep -v grep | awk '$10 > "2:00" {print $2}' | xargs kill 2>/dev/null || true

# 5. Clear VS Code cache (preserves settings)
echo "🗑️  Clearing VS Code caches..."
rm -rf ~/Library/Application\ Support/Code/Cache/* 2>/dev/null || true
rm -rf ~/Library/Application\ Support/Code/CachedData/* 2>/dev/null || true
rm -rf ~/Library/Application\ Support/Code/CachedExtensions/* 2>/dev/null || true
rm -rf ~/Library/Application\ Support/Code/CachedExtensionVSIXs/* 2>/dev/null || true

# 6. Clear workspace storage for very old entries (older than 7 days)
echo "📦 Cleaning old workspace storage..."
find ~/Library/Application\ Support/Code/User/workspaceStorage -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

# 7. Increase file descriptor limits for current session
echo "📈 Increasing file descriptor limits..."
ulimit -n 65536 2>/dev/null || ulimit -n 10240 2>/dev/null || true
echo "   Current limit: $(ulimit -n)"

# 8. Report current state
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 Current System State:"
echo "═══════════════════════════════════════════════════════════════"
echo "   VS Code processes: $(pgrep -f 'Code' | wc -l | tr -d ' ')"
echo "   Node.js processes: $(pgrep -f 'node' | wc -l | tr -d ' ')"
echo "   Shell processes:   $(pgrep -f 'zsh|bash' | wc -l | tr -d ' ')"
echo "   Open file limit:   $(ulimit -n)"
echo "   Free memory:       $(vm_stat | grep 'Pages free' | awk '{print $3}' | tr -d '.' | awk '{print int($1*4096/1024/1024/1024)"GB"}')"
echo ""
echo "✅ Optimization complete! Restart VS Code for best results."
