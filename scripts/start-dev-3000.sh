#!/bin/bash
# Force dev server to run on port 3000

echo "🛑 Stopping any existing dev servers..."
pkill -f "next dev" 2>/dev/null
node scripts/stop-dev.js 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null

echo "✓ Port 3000 cleared"
echo ""
echo "🚀 Starting dev server on port 3000..."

PORT=3000 pnpm dev
