#!/bin/bash
# CI Test Sharding Script
# Runs server and client vitest projects sequentially for faster CI execution
# @phase F

set -e

echo "🧪 Fixzit CI Test Sharding Script"
echo "================================="
echo ""

# Configuration
# Constrain concurrency and extend MongoMemoryServer timeouts to avoid flakiness in CI
export SERVER_MAX_WORKERS="${SERVER_MAX_WORKERS:-1}"
export CLIENT_MAX_WORKERS="${CLIENT_MAX_WORKERS:-2}"
export MONGOMS_TIMEOUT="${MONGOMS_TIMEOUT:-60000}"
export MONGOMS_DOWNLOAD_TIMEOUT="${MONGOMS_DOWNLOAD_TIMEOUT:-60000}"
export MONGOMS_START_TIMEOUT="${MONGOMS_START_TIMEOUT:-60000}"
export MONGO_MEMORY_LAUNCH_TIMEOUT="${MONGO_MEMORY_LAUNCH_TIMEOUT:-60000}"
export MONGOMS_STARTUP_TIMEOUT="${MONGOMS_STARTUP_TIMEOUT:-60000}"
SERVER_OPTIONS="--reporter=dot --silent --maxWorkers=${SERVER_MAX_WORKERS} --fileParallelism=false"
CLIENT_OPTIONS="--reporter=dot --silent --maxWorkers=${CLIENT_MAX_WORKERS}"
SERVER_PROJECT="server"
CLIENT_PROJECT="client"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Timer
START_TIME=$(date +%s)

# Function to run tests for a project
run_tests() {
    local project=$1
    local options=$2
    local start=$(date +%s)
    
    echo -e "${YELLOW}▶ Running $project tests...${NC}"
    
    if pnpm vitest run --project=$project $options; then
        local end=$(date +%s)
        local duration=$((end - start))
        echo -e "${GREEN}✓ $project tests passed in ${duration}s${NC}"
        return 0
    else
        local end=$(date +%s)
        local duration=$((end - start))
        echo -e "${RED}✗ $project tests failed after ${duration}s${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo "📦 Project: Fixzit"
    echo "🔧 Node: $(node --version)"
    echo "📦 pnpm: $(pnpm --version)"
    echo ""
    
    # Check if MongoMemoryServer is cached
    if [ -d "$HOME/.cache/mongodb-binaries" ]; then
        echo -e "${GREEN}✓ MongoMemoryServer binaries cached${NC}"
    else
        echo -e "${YELLOW}⚠ MongoMemoryServer will download binaries (first run)${NC}"
    fi
    echo ""
    
    # Run server tests first (usually heavier)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    run_tests "$SERVER_PROJECT" "$SERVER_OPTIONS"
    SERVER_EXIT=$?
    echo ""
    
    # Run client tests
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    run_tests "$CLIENT_PROJECT" "$CLIENT_OPTIONS"
    CLIENT_EXIT=$?
    echo ""
    
    # Summary
    END_TIME=$(date +%s)
    TOTAL_DURATION=$((END_TIME - START_TIME))
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ $SERVER_EXIT -eq 0 ]; then
        echo -e "   Server: ${GREEN}PASSED${NC}"
    else
        echo -e "   Server: ${RED}FAILED${NC}"
    fi
    
    if [ $CLIENT_EXIT -eq 0 ]; then
        echo -e "   Client: ${GREEN}PASSED${NC}"
    else
        echo -e "   Client: ${RED}FAILED${NC}"
    fi
    
    echo ""
    echo "⏱  Total Duration: ${TOTAL_DURATION}s"
    echo ""
    
    # Exit with failure if any project failed
    if [ $SERVER_EXIT -ne 0 ] || [ $CLIENT_EXIT -ne 0 ]; then
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ All tests passed${NC}"
        exit 0
    fi
}

# Run main function
main "$@"
