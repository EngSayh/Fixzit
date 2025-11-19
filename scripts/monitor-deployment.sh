#!/bin/bash

# Monitor deployment readiness check progress
# Usage: ./scripts/monitor-deployment.sh

LOG_FILE="/tmp/route-verify.log"
CHECK_INTERVAL=10  # seconds

echo "🔍 Monitoring deployment readiness check..."
echo "📁 Log file: $LOG_FILE"
echo ""

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Log file not found yet. Waiting for deployment check to start..."
fi

LAST_LINE=""
LAST_COUNT=0

while true; do
  if [ -f "$LOG_FILE" ]; then
    CURRENT_LINE=$(tail -1 "$LOG_FILE" 2>/dev/null)
    CURRENT_COUNT=$(wc -l < "$LOG_FILE" 2>/dev/null)
    
    # Only print if there's new content
    if [ "$CURRENT_COUNT" -gt "$LAST_COUNT" ]; then
      clear
      echo "🔍 Deployment Check Monitor"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      
      # Show current progress
      if echo "$CURRENT_LINE" | grep -q "Generating static pages"; then
        PROGRESS=$(echo "$CURRENT_LINE" | grep -oE "[0-9]+/[0-9]+" | tail -1)
        echo "📊 Status: Generating Static Pages - $PROGRESS"
      elif echo "$CURRENT_LINE" | grep -q "Route Check Complete"; then
        echo "✅ Status: Route Verification Complete"
      elif echo "$CURRENT_LINE" | grep -q "Starting server"; then
        echo "🚀 Status: Starting Dev Server"
      elif echo "$CURRENT_LINE" | grep -q "Verifying route"; then
        echo "🔍 Status: Verifying Routes"
      else
        echo "⏳ Status: In Progress"
      fi
      
      echo ""
      echo "📋 Recent Output:"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      tail -15 "$LOG_FILE" | sed 's/^/  /'
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "Lines: $CURRENT_COUNT | Last check: $(date '+%H:%M:%S')"
      
      # Check if completed
      if tail -20 "$LOG_FILE" | grep -q "Route Check Complete\|All routes verified\|SUMMARY"; then
        echo ""
        echo "✅ Deployment check complete!"
        echo ""
        echo "📊 View full results:"
        echo "   cat /tmp/route-verify.log"
        exit 0
      fi
      
      LAST_COUNT=$CURRENT_COUNT
    fi
    
    LAST_LINE="$CURRENT_LINE"
  fi
  
  sleep $CHECK_INTERVAL
done
