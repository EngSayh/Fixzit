#!/bin/bash
# Dev Server Keep-Alive Script
# Monitors and automatically restarts the Next.js dev server if it crashes
# Usage: bash scripts/dev-server-keepalive.sh

LOG_FILE="/tmp/next-dev.log"
PID_FILE="/tmp/next-dev.pid"
CHECK_INTERVAL=10  # Check every 10 seconds

echo "🚀 Starting Next.js Dev Server Keep-Alive Monitor"
echo "📝 Log file: $LOG_FILE"
echo "🔍 Checking every ${CHECK_INTERVAL}s"
echo ""

# Function to start the server
start_server() {
    echo "[$(date '+%H:%M:%S')] Starting Next.js dev server..."
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "[$(date '+%H:%M:%S')] ✓ Server started with PID: $(cat $PID_FILE)"
}

# Function to check if server is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            # Check if it's actually the Next.js process
            if ps -p "$PID" | grep -q "next dev"; then
                return 0  # Running
            fi
        fi
    fi
    return 1  # Not running
}

# Function to check if port 3000 is responding
is_responding() {
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"
    return $?
}

# Start the server initially
start_server
sleep 5  # Give it time to start

# Monitor loop
while true; do
    if ! is_running; then
        echo "[$(date '+%H:%M:%S')] ⚠️  Server process not found! Restarting..."
        start_server
        sleep 5
    elif ! is_responding; then
        echo "[$(date '+%H:%M:%S')] ⚠️  Server not responding on port 3000! Restarting..."
        # Kill the old process
        if [ -f "$PID_FILE" ]; then
            kill $(cat "$PID_FILE") 2>/dev/null
        fi
        pkill -f "next dev" 2>/dev/null
        sleep 2
        start_server
        sleep 5
    else
        # Server is healthy
        MEM_USAGE=$(ps -p $(cat "$PID_FILE") -o %mem --no-headers 2>/dev/null | tr -d ' ')
        echo "[$(date '+%H:%M:%S')] ✓ Server healthy (MEM: ${MEM_USAGE}%)"
    fi
    
    sleep "$CHECK_INTERVAL"
done
