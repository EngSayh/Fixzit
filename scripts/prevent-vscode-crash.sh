#!/bin/bash
# VS Code Crash Prevention - Comprehensive Memory Management
# Addresses Error Code 5 (Out of Memory) root causes
# Usage: bash scripts/prevent-vscode-crash.sh

set -euo pipefail

echo "🛡️  VS Code Crash Prevention System"
echo "===================================="
echo ""

# 1. Check current memory status
echo "📊 Step 1: Memory Status Check"
bash scripts/monitor-memory.sh | grep -E "Available Memory:|Memory usage"
echo ""

# 2. Kill zombie processes
echo "🧹 Step 2: Kill Zombie Processes"
KILLED=0

# Kill duplicate dev servers (only if more than 1 exists AND not actively serving)
DEV_SERVER_COUNT=$(pgrep -f 'next-server' | wc -l || echo "0")
if [ "$DEV_SERVER_COUNT" -gt 1 ]; then
  echo "  - Found $DEV_SERVER_COUNT Next.js dev servers (expected 1)"
  echo "    Killing duplicates..."
  # Kill all but the newest process
  pgrep -f 'next-server' | head -n $((DEV_SERVER_COUNT - 1)) | xargs kill 2>/dev/null && KILLED=$((KILLED + 1)) || true
elif [ "$DEV_SERVER_COUNT" -eq 0 ]; then
  echo "  - No dev servers running"
else
  echo "  - Single dev server running (healthy)"
fi

# Kill orphaned TypeScript servers (more than 2 running)
TS_COUNT=$(pgrep -f 'tsserver' 2>/dev/null | wc -l || echo "0")
if [ "$TS_COUNT" -gt 2 ]; then
  echo "  - Found $TS_COUNT TypeScript servers (expected max 2)"
  echo "    Killing oldest ones..."
  pgrep -f 'tsserver' | head -n $((TS_COUNT - 2)) | xargs kill -9 2>/dev/null || true
  KILLED=$((KILLED + 1))
elif [ "$TS_COUNT" -eq 0 ]; then
  echo "  - No tsserver processes (may start on demand)"
else
  echo "  - $TS_COUNT TypeScript server(s) running (healthy)"
fi

# Kill orphaned eslint processes
if pgrep -f 'eslint' > /dev/null; then
  echo "  - Killing orphaned ESLint processes..."
  pkill -f 'eslint' && KILLED=$((KILLED + 1)) || true
fi

if [ "$KILLED" -eq 0 ]; then
  echo "  ✅ No zombie processes found"
else
  echo "  ✅ Killed $KILLED zombie process group(s)"
  sleep 2
fi
echo ""

# 3. Clean cache directories
echo "🗑️  Step 3: Clean Cache Directories"
bash scripts/cleanup-dev-cache.sh 2>/dev/null || echo "  (cleanup script not available)"
echo ""

# 4. Verify memory limits
echo "🔧 Step 4: Verify Memory Limits"

# Check package.json scripts
if grep -q "next-build.mjs" package.json; then
  echo "  ✅ package.json: Adaptive build memory script configured"
elif grep -q "NODE_OPTIONS.*8192" package.json; then
  echo "  ✅ package.json: 8GB limit configured"
else
  echo "  ⚠️  package.json: Build memory limit not detected!"
fi

# Check .vscode/settings.json
if grep -q "\"typescript.tsserver.maxTsServerMemory\": 8192" .vscode/settings.json; then
  echo "  ✅ TypeScript Server: 8GB limit configured"
else
  echo "  ⚠️  TypeScript Server: Missing 8GB limit!"
fi

# Check .vscode/argv.json
if [ -f ".vscode/argv.json" ] && grep -q "max-old-space-size=8192" .vscode/argv.json; then
  echo "  ✅ Extension Host: 8GB limit configured"
else
  echo "  ⚠️  Extension Host: Missing 8GB limit!"
fi

# Check terminal env
if grep -q "NODE_OPTIONS.*8192" .vscode/settings.json; then
  echo "  ✅ Terminal: 8GB limit configured"
else
  echo "  ⚠️  Terminal: Missing 8GB limit!"
fi
echo ""

# 5. File watcher audit
echo "📁 Step 5: File Watcher Audit"
TOTAL_FILES=$(find . -type f 2>/dev/null | wc -l)
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
echo "  Total files in workspace: $TOTAL_FILES"
echo "  TypeScript files: $TS_FILES"

if [ "$TOTAL_FILES" -gt 50000 ]; then
  echo "  ⚠️  WARNING: Very large workspace ($TOTAL_FILES files)"
  echo "     This may cause memory pressure on Extension Host"
  echo "     Consider using .vscodeignore or files.watcherExclude"
fi
echo ""

# 6. Final memory check
echo "📊 Step 6: Final Memory Status"
bash scripts/monitor-memory.sh | grep -E "Available Memory:|Memory usage"
echo ""

# 7. Recommendations
echo "💡 Recommendations:"
echo "   1. Always use 'pnpm dev:mem' instead of 'pnpm dev'"
echo "   2. Close unused editor tabs (limit: 10 per group)"
echo "   3. Run this script before long coding sessions"
echo "   4. If VS Code feels slow, restart TypeScript server:"
echo "      Cmd+Shift+P → 'TypeScript: Restart TS Server'"
echo "   5. Monitor memory: bash scripts/monitor-memory.sh"
echo ""

echo "✅ Crash prevention check complete!"
