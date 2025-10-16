#!/bin/bash
# Start Fixzit production server
# Usage: ./start-server.sh

set -e

echo "🚀 Starting Fixzit Production Server"
echo "====================================="

# Configuration
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production

# Create logs directory
mkdir -p logs

# Check if server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Server already running on port 3000"
    echo "   PID: $(lsof -t -i:3000)"
    echo "   Stop it first with: ./stop-server.sh"
    exit 1
fi

# Check MongoDB connection
if [ -z "$MONGODB_URI" ]; then
    if [ -f .env.local ]; then
        source .env.local
    else
        echo "❌ MONGODB_URI not set and .env.local not found"
        exit 1
    fi
fi

echo "✅ Configuration loaded"
echo "   PORT: $PORT"
echo "   HOSTNAME: $HOSTNAME"
echo "   MongoDB: ${MONGODB_URI:0:30}..."

# Copy static files to standalone (required for Next.js standalone mode)
echo ""
echo "📦 Copying static assets to standalone..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || echo "   ⚠️ Static files already exist or not built"
cp -r public .next/standalone/ 2>/dev/null || echo "   ⚠️ Public files already exist or not found"
echo "✅ Static assets ready"

# Start server in background
nohup node .next/standalone/server.js > logs/server.log 2>&1 &
SERVER_PID=$!

# Save PID
echo $SERVER_PID > server.pid

echo ""
echo "✅ Server started successfully!"
echo "   PID: $SERVER_PID"
echo "   URL: http://localhost:$PORT"
echo "   Logs: logs/server.log"
echo ""
echo "📊 Useful commands:"
echo "   Monitor logs: tail -f logs/server.log"
echo "   Check health: curl http://localhost:$PORT/api/health/database"
echo "   Stop server: ./stop-server.sh"
echo ""

# Wait a moment and verify
sleep 2

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Server is listening on port 3000"
    
    # Test health endpoint
    if curl -s http://localhost:3000/api/health/database > /dev/null 2>&1; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed (server may still be starting)"
    fi
else
    echo "❌ Server failed to start. Check logs:"
    tail -20 logs/server.log
    rm -f server.pid
    exit 1
fi

echo ""
echo "🎉 Server is ready!"
