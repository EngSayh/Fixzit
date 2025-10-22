#!/bin/bash
# Stop Fixzit production server
# Usage: ./stop-server.sh

echo "🛑 Stopping Fixzit Production Server"
echo "====================================="

# Method 1: Try PID file first
if [ -f server.pid ]; then
    PID=$(cat server.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Found server with PID: $PID"
        kill $PID
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 $PID 2>/dev/null; then
                echo "✅ Server stopped gracefully"
                rm server.pid
                exit 0
            fi
            sleep 1
        done
        
        # Force kill if still running
        echo "⚠️  Server not responding, force killing..."
        kill -9 $PID 2>/dev/null
        rm server.pid
        echo "✅ Server force stopped"
        exit 0
    else
        echo "⚠️  PID file exists but process not running"
        rm server.pid
    fi
fi

# Method 2: Find by port
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    PID=$(lsof -t -i:3000)
    echo "Found server on port 3000 with PID: $PID"
    kill $PID
    
    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
            echo "✅ Server stopped gracefully"
            exit 0
        fi
        sleep 1
    done
    
    # Force kill if still running
    echo "⚠️  Server not responding, force killing..."
    kill -9 $PID 2>/dev/null
    echo "✅ Server force stopped"
    exit 0
fi

# Method 3: Find by process name
if ps aux | grep -v grep | grep "next-server" > /dev/null; then
    PID=$(ps aux | grep -v grep | grep "next-server" | awk '{print $2}')
    echo "Found next-server with PID: $PID"
    kill $PID
    echo "✅ Server stopped"
    exit 0
fi

echo "ℹ️  No server found running"
exit 0
