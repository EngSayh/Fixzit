#!/bin/bash
# Safe Production Build Script
# Optimized for Codespaces: 2 CPUs, ~2.3GB free RAM

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== Safe Production Build ===${NC}"
echo "System: 2 CPUs, ~2.3GB free RAM"
echo ""

# 1. Check available memory
echo -e "${YELLOW}Checking system resources...${NC}"
FREE_MEM=$(free -m | awk '/^Mem:/{print $7}')
if [ "$FREE_MEM" -lt 2000 ]; then
    echo -e "${RED}Warning: Low memory ($FREE_MEM MB free)${NC}"
    echo "Attempting to free memory..."
    # Clear page cache (safe operation)
    sync
    echo 1 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || true
    FREE_MEM=$(free -m | awk '/^Mem:/{print $7}')
    echo "Available memory: $FREE_MEM MB"
fi

# 2. Kill any existing builds or servers
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -9 -f "next build" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
sleep 1

# 3. Clean build directory
echo -e "${YELLOW}Cleaning build directory...${NC}"
rm -rf .next
echo "✓ Clean"

# 4. Set optimal Node memory limit for this system
# With 2.3GB free, set Node to use max 2GB to leave room for system
export NODE_OPTIONS="--max-old-space-size=2048"
echo -e "${YELLOW}Node memory limit: 2048 MB${NC}"

# 5. Run build with memory monitoring
echo ""
echo -e "${YELLOW}Starting build...${NC}"
echo "Configuration:"
echo "  - Single-threaded (prevents memory spikes)"
echo "  - Optimized chunk splitting"
echo "  - No source maps (saves memory)"
echo ""

# Monitor memory during build
(
    while true; do
        sleep 10
        FREE=$(free -m | awk '/^Mem:/{print $7}')
        USED=$(free -m | awk '/^Mem:/{print $3}')
        echo "[$(date +%H:%M:%S)] Memory: ${USED}MB used, ${FREE}MB free"
    done
) &
MONITOR_PID=$!

# Run the build
if npm run build 2>&1 | tee build.log; then
    kill $MONITOR_PID 2>/dev/null || true
    echo ""
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
    
    # Show build stats
    if [ -f .next/BUILD_ID ]; then
        echo ""
        echo "Build ID: $(cat .next/BUILD_ID)"
        echo "Build size: $(du -sh .next | cut -f1)"
        echo ""
        echo -e "${GREEN}Ready to start server!${NC}"
    fi
else
    kill $MONITOR_PID 2>/dev/null || true
    echo ""
    echo -e "${RED}✗ Build failed${NC}"
    echo ""
    echo "Last 20 lines of build log:"
    tail -20 build.log
    echo ""
    echo "Check full log: cat build.log"
    exit 1
fi
