#!/bin/bash
# Memory monitoring script to prevent VS Code crashes (error code 5)
# Root Cause: TypeScript language servers + Next.js dev server + extension hosts
# Usage: bash scripts/monitor-memory.sh [interval_seconds] [threshold_mb]

set -e

INTERVAL=${1:-5}  # Check every 5 seconds by default
THRESHOLD_MB=${2:-12000}  # Alert if any process exceeds 12GB (75% of 16GB)
LOG_FILE="tmp/memory-monitor.log"

mkdir -p tmp

echo "🔍 Memory Monitor Started"
echo "   Interval: ${INTERVAL}s"
echo "   Threshold: ${THRESHOLD_MB} MB"
echo "   Log: ${LOG_FILE}"
echo "   Press Ctrl+C to stop"
echo ""

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Get top memory-consuming processes
  TOP_PROCESSES=$(ps aux --sort=-%mem | head -20 | awk '{print $2, $3, $4, $6/1024, $11}' | column -t)
  
  # Check for high memory usage
  HIGH_MEM=$(ps aux | awk -v threshold=$THRESHOLD_MB '$6/1024 > threshold {print $2, $6/1024, $11}')
  
  if [ -n "$HIGH_MEM" ]; then
    echo "⚠️  [$TIMESTAMP] HIGH MEMORY ALERT!"
    echo "$HIGH_MEM" | while read -r line; do
      PID=$(echo "$line" | awk '{print $1}')
      MEM_MB=$(echo "$line" | awk '{print $2}')
      PROCESS=$(echo "$line" | awk '{print $3}')
      
      echo "   PID $PID: ${MEM_MB} MB - $PROCESS"
      echo "[$TIMESTAMP] ALERT: PID $PID using ${MEM_MB} MB ($PROCESS)" >> "$LOG_FILE"
    done
    echo ""
  fi
  
  # Log summary every minute (12 iterations at 5s interval)
  if [ $(($(date +%s) % 60)) -lt $INTERVAL ]; then
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $3}')
    AVAILABLE_MEM=$(free -m | awk '/^Mem:/{print $7}')
    
    echo "📊 [$TIMESTAMP] Memory: ${TOTAL_MEM} MB used, ${AVAILABLE_MEM} MB available"
    echo "[$TIMESTAMP] Total: ${TOTAL_MEM} MB, Available: ${AVAILABLE_MEM} MB" >> "$LOG_FILE"
  fi
  
  sleep "$INTERVAL"
done
