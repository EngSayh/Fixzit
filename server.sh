#!/bin/bash
# Quick Server Management Script for Fixzit

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_status() {
    echo -e "${YELLOW}=== Server Status ===${NC}"
    
    # Check if server is running
    if ps aux | grep "node.*server.js" | grep -v grep > /dev/null; then
        echo -e "${GREEN}✓ Server is running${NC}"
        ps aux | grep "node.*server.js" | grep -v grep | awk '{print "  PID: " $2 " | Memory: " $6 " KB"}'
    else
        echo -e "${RED}✗ Server is not running${NC}"
    fi
    
    # Check if port is listening
    echo ""
    if netstat -tlnp 2>/dev/null | grep :3000 > /dev/null || ss -tlnp 2>/dev/null | grep :3000 > /dev/null; then
        echo -e "${GREEN}✓ Port 3000 is listening${NC}"
        netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000
    else
        echo -e "${RED}✗ Port 3000 is not listening${NC}"
    fi
    
    # Test HTTP response
    echo ""
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Server is responding (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}✗ Server is not responding (HTTP $HTTP_CODE)${NC}"
    fi
    
    # Show access URLs
    echo ""
    echo -e "${YELLOW}=== Access URLs ===${NC}"
    echo "Local (terminal): http://localhost:3000"
    if [ ! -z "$CODESPACE_NAME" ]; then
        echo "Browser: https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
        echo ""
        echo "💡 Tip: Click the 🌐 globe icon in the PORTS tab to open in browser"
    fi
}

start_server() {
    echo -e "${YELLOW}=== Starting Server ===${NC}"
    
    # Kill any existing server
    if ps aux | grep "node.*server.js" | grep -v grep > /dev/null; then
        echo "Stopping existing server..."
        pkill -f "node.*server.js"
        sleep 2
    fi
    
    # Start new server
    if ! cd /workspaces/Fixzit; then
        echo -e "${RED}✗ Error: Failed to change to /workspaces/Fixzit directory${NC}" >&2
        exit 1
    fi
    echo "Starting production server..."
    HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production nohup node .next/standalone/server.js > server.log 2>&1 &
    
    sleep 3
    
    # Verify
    if ps aux | grep "node.*server.js" | grep -v grep > /dev/null; then
        echo -e "${GREEN}✓ Server started successfully${NC}"
        show_status
    else
        echo -e "${RED}✗ Failed to start server${NC}"
        echo "Check logs: tail -20 server.log"
    fi
}

stop_server() {
    echo -e "${YELLOW}=== Stopping Server ===${NC}"
    if ps aux | grep "node.*server.js" | grep -v grep > /dev/null; then
        pkill -f "node.*server.js"
        sleep 1
        echo -e "${GREEN}✓ Server stopped${NC}"
    else
        echo -e "${YELLOW}Server was not running${NC}"
    fi
}

restart_server() {
    stop_server
    echo ""
    start_server
}

show_logs() {
    echo -e "${YELLOW}=== Server Logs (last 30 lines) ===${NC}"
    if [ -f server.log ]; then
        tail -30 server.log
    else
        echo -e "${RED}No log file found${NC}"
    fi
}

rebuild_and_start() {
    echo -e "${YELLOW}=== Rebuilding and Starting ===${NC}"
    
    # Stop server
    stop_server
    echo ""
    
    # Save current directory and change to project root
    local ORIGINAL_DIR="$PWD"
    if ! cd /workspaces/Fixzit; then
        echo -e "${RED}✗ Error: Failed to change to project directory /workspaces/Fixzit${NC}" >&2
        exit 1
    fi
    
    # Clean and build
    echo "Cleaning build directory..."
    rm -rf .next
    
    echo "Building production bundle..."
    npm run build
    
    local BUILD_EXIT_CODE=$?
    
    # Restore original directory
    cd "$ORIGINAL_DIR" || true
    
    if [ $BUILD_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ Build successful${NC}"
        echo ""
        start_server
    else
        echo -e "${RED}✗ Build failed${NC}"
        exit 1
    fi
}

quick_test() {
    echo -e "${YELLOW}=== Quick Test ===${NC}"
    echo "Testing homepage..."
    
    RESPONSE=$(curl -s -o /tmp/response.html -w "%{http_code}" http://localhost:3000)
    
    if [ "$RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓ Server is working (HTTP $RESPONSE)${NC}"
        echo ""
        echo "Response headers:"
        curl -s -I http://localhost:3000 | head -10
        echo ""
        echo "Page size: $(wc -c < /tmp/response.html) bytes"
    else
        echo -e "${RED}✗ Server returned HTTP $RESPONSE${NC}"
    fi
}

show_help() {
    cat << EOF
${YELLOW}Fixzit Server Management${NC}

Usage: ./server.sh [command]

Commands:
  status    - Show server status and access URLs
  start     - Start the production server
  stop      - Stop the server
  restart   - Restart the server
  logs      - Show server logs (last 30 lines)
  rebuild   - Clean, rebuild, and start server
  test      - Quick HTTP test
  help      - Show this help message

Examples:
  ./server.sh status
  ./server.sh restart
  ./server.sh logs

For live logs: tail -f server.log
EOF
}

# Main command handler
case "$1" in
    status)
        show_status
        ;;
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    logs)
        show_logs
        ;;
    rebuild)
        rebuild_and_start
        ;;
    test)
        quick_test
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
