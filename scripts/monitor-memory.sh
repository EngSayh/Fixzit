#!/bin/bash
# Memory monitoring script to prevent VS Code crashes (error code 5)
# Root Cause: TypeScript language servers + Next.js dev server + extension hosts
# Usage: bash scripts/monitor-memory.sh [interval_seconds] [threshold_mb]

# Enable strict error checking for initialization only
set -e

INTERVAL=${1:-5}  # Check every 5 seconds by default
THRESHOLD_MB=${2:-12000}  # Alert if any process exceeds 12GB (75% of 16GB)
LOG_FILE="tmp/memory-monitor.log"

mkdir -p tmp

# Disable set -e for monitoring loop to handle transient errors gracefully
set +e

echo "🔍 Memory Monitor Started"
echo "   Interval: ${INTERVAL}s"
echo "   Threshold: ${THRESHOLD_MB} MB"
echo "   Log: ${LOG_FILE}"
echo "   Press Ctrl+C to stop"
echo ""

# Track minute for logging (log once per minute)
LAST_MINUTE_LOGGED=-1

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Get top memory-consuming processes (graceful failure)
  TOP_PROCESSES=$(ps aux --sort=-%mem 2>/dev/null | head -20 | awk '{print $2, $3, $4, $6/1024, $11}' | column -t) || true
  
  # Check for high memory usage (graceful failure)
  HIGH_MEM=$(ps aux 2>/dev/null | awk -v threshold="$THRESHOLD_MB" '$6/1024 > threshold {print $2, $6/1024, $11}') || true
  
  if [ -n "$HIGH_MEM" ]; then
    echo "⚠️  [$TIMESTAMP] HIGH MEMORY ALERT!"
    echo "$HIGH_MEM" | while read -r line; do
      PID=$(echo "$line" | awk '{print $1}')
      MEM_MB=$(echo "$line" | awk '{print $2}')
      PROCESS=$(echo "$line" | awk '{print $3}')
      
      echo "   PID $PID: ${MEM_MB} MB - $PROCESS"
      echo "[$TIMESTAMP] ALERT: PID $PID using ${MEM_MB} MB ($PROCESS)" >> "$LOG_FILE" 2>/dev/null || true
    done
    echo ""
  fi
  
  # Log summary exactly once per minute
  CURRENT_MINUTE=$(date '+%M')
  if [ "$CURRENT_MINUTE" != "$LAST_MINUTE_LOGGED" ]; then
    TOTAL_MEM=$(free -m 2>/dev/null | awk '/^Mem:/{print $3}') || echo "N/A"
    AVAILABLE_MEM=$(free -m 2>/dev/null | awk '/^Mem:/{print $7}') || echo "N/A"
    
    echo "📊 [$TIMESTAMP] Memory: ${TOTAL_MEM} MB used, ${AVAILABLE_MEM} MB available"
    echo "[$TIMESTAMP] Total: ${TOTAL_MEM} MB, Available: ${AVAILABLE_MEM} MB" >> "$LOG_FILE" 2>/dev/null || true
    
    LAST_MINUTE_LOGGED="$CURRENT_MINUTE"
  fi
  
  sleep "$INTERVAL"
done
