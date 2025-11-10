#!/usr/bin/env bash
# Wait for Next.js dev server to be ready
# Usage: ./scripts/wait-for-server.sh [timeout_seconds] [url]

TIMEOUT=${1:-60}
URL=${2:-http://localhost:3000/api/health}
ELAPSED=0
INTERVAL=2

echo "⏳ Waiting for server at $URL (timeout: ${TIMEOUT}s)..."

while [ $ELAPSED -lt $TIMEOUT ]; do
  if curl -sf "$URL" > /dev/null 2>&1; then
    echo "✅ Server is ready! (${ELAPSED}s)"
    exit 0
  fi
  
  echo "   Still waiting... (${ELAPSED}s / ${TIMEOUT}s)"
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo "❌ Timeout: Server not ready after ${TIMEOUT}s"
exit 1
