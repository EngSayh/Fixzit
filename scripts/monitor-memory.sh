#!/bin/bash
# Monitor VS Code and Node memory usage to prevent crashes
# Usage: bash scripts/monitor-memory.sh

set -euo pipefail

echo "🔍 Memory Monitoring - VS Code Crash Prevention"
echo "==============================================="
echo ""

# Total system memory
echo "📊 System Memory:"
free -h | grep -E "Mem:|Swap:"
echo ""

# Top memory consuming processes
echo "🔥 Top 10 Memory-Consuming Processes:"
ps aux --sort=-%mem | head -11 | awk 'BEGIN {printf "%-8s %-7s %-7s %s\n", "PID", "MEM%", "RSS(MB)", "COMMAND"} NR>1 {printf "%-8s %-7s %-7.1f %s\n", $2, $4, $6/1024, $11}'
echo ""

# Node processes specifically
echo "⚙️  Node.js Processes:"
ps aux | grep -E "[n]ode|[t]sserver" | awk '{printf "PID: %-8s MEM: %-6s%%  RSS: %-8.1fMB  CMD: %s\n", $2, $4, $6/1024, $11}'
echo ""

# Check if memory is critically low
AVAILABLE_MEM=$(free | grep Mem | awk '{print $7}')
TOTAL_MEM=$(free | grep Mem | awk '{print $2}')
PERCENT_AVAILABLE=$(awk "BEGIN {printf \"%.0f\", ($AVAILABLE_MEM/$TOTAL_MEM)*100}")

echo "💾 Available Memory: $PERCENT_AVAILABLE%"

if [ "$PERCENT_AVAILABLE" -lt 20 ]; then
  echo ""
  echo "⚠️  WARNING: Low memory! ($PERCENT_AVAILABLE% available)"
  echo "   Consider:"
  echo "   1. Restart TypeScript server: Cmd+Shift+P → 'Restart TypeScript Server'"
  echo "   2. Close unused editor tabs"
  echo "   3. Kill zombie processes: pkill -f 'tsserver|eslint'"
  echo "   4. Restart VS Code"
elif [ "$PERCENT_AVAILABLE" -lt 40 ]; then
  echo ""
  echo "⚡ Moderate memory usage ($PERCENT_AVAILABLE% available)"
  echo "   Watch for memory spikes during builds/linting"
else
  echo ""
  echo "✅ Memory usage healthy ($PERCENT_AVAILABLE% available)"
fi

echo ""
echo "🔧 Quick Fixes:"
echo "   - Restart TS Server: pkill -f tsserver"
echo "   - Clean cache: pnpm run cleanup:cache"
echo "   - Kill dev server: pkill -f 'next-server'"
echo ""
