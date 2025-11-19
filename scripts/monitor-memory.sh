#!/bin/bash
# Monitor VS Code and Node memory usage to prevent crashes
# Usage: bash scripts/monitor-memory.sh

set -euo pipefail

echo "🔍 Memory Monitoring - VS Code Crash Prevention"
echo "==============================================="
echo ""

# Detect OS
OS="$(uname -s)"

# Total system memory
echo "📊 System Memory:"
if [ "$OS" = "Darwin" ]; then
  # macOS
  vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+)[^\d]+(\d+)/ and printf("%-20s % 16.2f MB\n", "$1:", $2 * $size / 1048576);'
else
  # Linux
  free -h | grep -E "Mem:|Swap:"
fi
echo ""

# Top memory consuming processes
echo "🔥 Top 10 Memory-Consuming Processes:"
if [ "$OS" = "Darwin" ]; then
  # macOS
  set +o pipefail
  ps aux | sort -k4 -r | head -11 | awk 'BEGIN {printf "%-8s %-7s %-7s %s\n", "PID", "MEM%", "RSS(MB)", "COMMAND"} NR>1 {printf "%-8s %-7s %-7.1f %s\n", $2, $4, $6/1024, $11}'
  set -o pipefail
else
  # Linux
  set +o pipefail
  ps aux --sort=-%mem | head -11 | awk 'BEGIN {printf "%-8s %-7s %-7s %s\n", "PID", "MEM%", "RSS(MB)", "COMMAND"} NR>1 {printf "%-8s %-7s %-7.1f %s\n", $2, $4, $6/1024, $11}'
  set -o pipefail
fi
echo ""

# Node processes specifically
echo "⚙️  Node.js Processes:"
ps aux | grep -E "[n]ode|[t]sserver" | awk '{printf "PID: %-8s MEM: %-6s%%  RSS: %-8.1fMB  CMD: %s\n", $2, $4, $6/1024, $11}' || echo "  No Node.js processes found"
echo ""

# Check if memory is critically low
if [ "$OS" = "Darwin" ]; then
  # macOS - use vm_stat with actual page size
  VM_STAT_OUTPUT="$(vm_stat)"
  PAGE_SIZE_BYTES=$(echo "$VM_STAT_OUTPUT" | head -1 | awk '{for (i=1;i<=NF;i++) if ($i ~ /^[0-9]+$/) {print $i; exit}}')
  PAGE_SIZE_BYTES=${PAGE_SIZE_BYTES:-4096}
  FREE_PAGES=$(echo "$VM_STAT_OUTPUT" | awk '/Pages free/ {gsub("\\.", "", $3); print $3}')
  INACTIVE_PAGES=$(echo "$VM_STAT_OUTPUT" | awk '/Pages inactive/ {gsub("\\.", "", $3); print $3}')
  SPECULATIVE_PAGES=$(echo "$VM_STAT_OUTPUT" | awk '/Pages speculative/ {gsub("\\.", "", $3); print $3}')
  FREE_PAGES=${FREE_PAGES:-0}
  INACTIVE_PAGES=${INACTIVE_PAGES:-0}
  SPECULATIVE_PAGES=${SPECULATIVE_PAGES:-0}
  TOTAL_AVAILABLE_PAGES=$((FREE_PAGES + INACTIVE_PAGES + SPECULATIVE_PAGES))
  AVAILABLE_BYTES=$((TOTAL_AVAILABLE_PAGES * PAGE_SIZE_BYTES))
  AVAILABLE_MB=$(awk -v bytes="$AVAILABLE_BYTES" 'BEGIN {printf "%.0f", bytes/1048576}')
  TOTAL_MEM_MB=$(sysctl -n hw.memsize | awk '{printf "%.0f", $1/1048576}')
  PERCENT_AVAILABLE=$(awk -v avail="$AVAILABLE_MB" -v total="$TOTAL_MEM_MB" 'BEGIN {if (total == 0) {print 0} else {printf "%.0f", (avail/total)*100}}')
else
  # Linux
  AVAILABLE_MEM=$(free | grep Mem | awk '{print $7}')
  TOTAL_MEM=$(free | grep Mem | awk '{print $2}')
  PERCENT_AVAILABLE=$(awk "BEGIN {printf \"%.0f\", ($AVAILABLE_MEM/$TOTAL_MEM)*100}")
fi

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
