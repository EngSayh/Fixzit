#!/bin/bash
# Dev Server Keep-Alive Script
# Monitors and automatically restarts the Next.js dev server if it crashes
# Usage: bash scripts/dev-server-keepalive.sh

# Portable temporary directory (supports Linux, macOS, WSL)
TMPDIR="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}"
LOG_FILE="$TMPDIR/next-dev.log"
PID_FILE="$TMPDIR/next-dev.pid"
CHECK_INTERVAL=10  # Check every 10 seconds

echo "🚀 Starting Next.js Dev Server Keep-Alive Monitor"
echo "📝 Log file: $LOG_FILE"
echo "� PID file: $PID_FILE"
echo "�🔍 Checking every ${CHECK_INTERVAL}s"
echo ""

# Function to start the server
start_server() {
    echo "[$(date '+%H:%M:%S')] Starting Next.js dev server..."
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    local server_pid=$!
    
    # Wait briefly and verify process started successfully
    sleep 2
    if ps -p "$server_pid" > /dev/null 2>&1; then
        echo "$server_pid" > "$PID_FILE"
        echo "[$(date '+%H:%M:%S')] ✓ Server started with PID: $server_pid"
        return 0
    else
        echo "[$(date '+%H:%M:%S')] ✗ Server failed to start (PID $server_pid not found)"
        return 1
    fi
}

# Function to check if server is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        
        # Validate PID is a number
        if ! [[ "$pid" =~ ^[0-9]+$ ]]; then
            echo "[$(date '+%H:%M:%S')] ⚠️  Invalid PID in $PID_FILE: $pid"
            return 1
        fi
        
        # Check if process exists and is our Next.js process
        if ps -p "$pid" > /dev/null 2>&1; then
            # Verify it's actually the Next.js dev server (not just any process with that PID)
            if ps -p "$pid" -o cmd --no-headers 2>/dev/null | grep -q "next dev"; then
                return 0  # Running
            fi
        fi
    fi
    return 1  # Not running
}

# Function to check if port 3000 is responding
is_responding() {
    # Add timeout to prevent hanging on unresponsive server
    # Suppress stderr to avoid cluttering logs
    local http_code
    http_code=$(curl --max-time 3 -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
    [[ "$http_code" =~ ^(200|301|302)$ ]]
    return $?
}

# Function to safely kill server process
kill_server() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        
        # Validate PID
        if [[ "$pid" =~ ^[0-9]+$ ]]; then
            echo "[$(date '+%H:%M:%S')] Killing server process (PID: $pid)..."
            
            if kill "$pid" 2>/dev/null; then
                # Wait up to 5 seconds for graceful shutdown
                local waited=0
                while ps -p "$pid" > /dev/null 2>&1 && [ $waited -lt 5 ]; do
                    sleep 1
                    waited=$((waited + 1))
                done
                
                # Force kill if still running
                if ps -p "$pid" > /dev/null 2>&1; then
                    echo "[$(date '+%H:%M:%S')] ⚠️  Graceful shutdown failed, force killing..."
                    kill -9 "$pid" 2>/dev/null
                    sleep 1
                fi
                
                # Verify process is gone
                if ps -p "$pid" > /dev/null 2>&1; then
                    echo "[$(date '+%H:%M:%S')] ✗ Failed to kill process $pid (may require manual intervention)"
                    return 1
                else
                    echo "[$(date '+%H:%M:%S')] ✓ Server process terminated"
                    rm -f "$PID_FILE"
                    return 0
                fi
            else
                echo "[$(date '+%H:%M:%S')] ⚠️  Process $pid already terminated"
                rm -f "$PID_FILE"
                return 0
            fi
        fi
    fi
    return 0
}

# Start the server initially
if ! start_server; then
    echo "[$(date '+%H:%M:%S')] ✗ Initial server start failed. Exiting."
    exit 1
fi
sleep 5  # Give it time to fully start

# Monitor loop
while true; do
    if ! is_running; then
        echo "[$(date '+%H:%M:%S')] ⚠️  Server process not found! Restarting..."
        kill_server  # Clean up any stale processes
        if ! start_server; then
            echo "[$(date '+%H:%M:%S')] ⚠️  Restart failed. Waiting ${CHECK_INTERVAL}s before retry..."
        fi
        sleep 5
    elif ! is_responding; then
        echo "[$(date '+%H:%M:%S')] ⚠️  Server not responding on port 3000! Restarting..."
        kill_server
        sleep 2
        if ! start_server; then
            echo "[$(date '+%H:%M:%S')] ⚠️  Restart failed. Waiting ${CHECK_INTERVAL}s before retry..."
        fi
        sleep 5
    else
        # Server is healthy
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null)
        if [[ "$pid" =~ ^[0-9]+$ ]]; then
            local mem_usage
            mem_usage=$(ps -p "$pid" -o %mem --no-headers 2>/dev/null | tr -d ' ')
            echo "[$(date '+%H:%M:%S')] ✓ Server healthy (PID: $pid, MEM: ${mem_usage}%)"
        fi
    fi
    
    sleep "$CHECK_INTERVAL"
done
