#!/bin/bash
# =============================================================================
# COPY-PASTE THIS TO START 3-HOUR UNATTENDED E2E TESTING
# =============================================================================

echo "🚀 Starting 3-Hour Unattended E2E Testing System..."
echo ""
echo "📋 Pre-Flight Checklist..."
echo ""

# Check if port 3000 is free
if lsof -i :3000 > /dev/null 2>&1; then
    echo "❌ Port 3000 is in use. Kill the process:"
    lsof -i :3000
    echo ""
    echo "Run: kill -9 \$(lsof -t -i:3000)"
    exit 1
else
    echo "✅ Port 3000 is free"
fi

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Run: pnpm install"
    exit 1
else
    echo "✅ Dependencies installed"
fi

# Check Playwright browsers
if ! compgen -G "$HOME/.cache/ms-playwright/chromium-*" > /dev/null; then
    echo "⚠️  Playwright browsers not found. Installing..."
    npx playwright install --with-deps chromium
fi
echo "✅ Playwright browsers ready"

# Check TypeScript
echo ""
echo "📋 Running TypeScript check..."
if ! pnpm typecheck > /dev/null 2>&1; then
    echo "❌ TypeScript errors found. Fix them first:"
    pnpm typecheck
    exit 1
fi
echo "✅ TypeScript check passed"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ ALL CHECKS PASSED - SYSTEM READY"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "🎬 STARTING IN 5 SECONDS..."
echo ""
echo "What will happen:"
echo "  • Keep system awake for 3 hours"
echo "  • Start Next.js dev server"
echo "  • Run verification loops (~12 cycles)"
echo "  • Test 168 scenarios (14 pages × 6 roles × 2 locales)"
echo "  • Validate TypeScript, ESLint, i18n, E2E"
echo "  • Save reports to: playwright-report/"
echo "  • Save logs to: tests/loop-runner.log"
echo ""
echo "Press Ctrl+C NOW to cancel, or wait to start..."
sleep 5

echo ""
echo "🚀 LAUNCHING..."
echo ""

# Create logs directory
mkdir -p tests/logs

# Start keep-alive in background
(
    for i in {1..180}; do
        echo "⏱️  Keep-alive: $i/180 min" | tee -a tests/logs/keep-alive.log
        sleep 60
    done
) &
KEEPALIVE_PID=$!

# Start dev server in background
echo "🔧 Starting Next.js dev server..."
pnpm dev > tests/logs/dev-server.log 2>&1 &
DEV_SERVER_PID=$!

# Wait for dev server to be ready
echo "⏳ Waiting for dev server..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Dev server ready!"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "❌ Dev server failed to start. Check tests/logs/dev-server.log"
        kill $KEEPALIVE_PID $DEV_SERVER_PID 2>/dev/null
        exit 1
    fi
done

# Start the E2E loop
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "🎯 STARTING 3-HOUR E2E VERIFICATION LOOP"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "You can now leave for 3 hours ☕"
echo ""
echo "To check progress while away:"
echo "  • tail -f tests/loop-runner.log"
echo "  • tail -f tests/logs/dev-server.log"
echo ""
echo "To stop manually: kill $DEV_SERVER_PID $KEEPALIVE_PID"
echo ""

# Run the loop
pnpm test:e2e:loop

# Cleanup
echo ""
echo "🎉 3-HOUR TEST COMPLETE!"
echo ""
echo "Cleaning up processes..."
kill $KEEPALIVE_PID $DEV_SERVER_PID 2>/dev/null

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "📊 RESULTS AVAILABLE AT:"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  • HTML Report:    playwright-report/index.html"
echo "  • Execution Log:  tests/loop-runner.log"
echo "  • Dev Server Log: tests/logs/dev-server.log"
echo "  • Keep-Alive Log: tests/logs/keep-alive.log"
echo ""
echo "Open HTML report: npx playwright show-report playwright-report"
echo ""
echo "✅ DONE!"
