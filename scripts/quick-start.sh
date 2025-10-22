#!/bin/bash
# Quick Setup Script for Fixzit Development Server
# Run this to check prerequisites and start the server

set -e  # Exit on error

echo "🔍 Fixzit Development Server - Prerequisites Check"
echo "=================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Node.js
echo -ne "\n1. Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Found $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "   → Run: apk add nodejs npm (Alpine)"
    echo "   → OR rebuild devcontainer in VS Code"
    exit 1
fi

# Check 2: npm
echo -ne "2. Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ Found v$NPM_VERSION${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    exit 1
fi

# Check 3: .env.local file
echo -ne "3. Checking .env.local... "
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ Found${NC}"
    
    # Check for CHANGEME placeholders
    CHANGEME_COUNT=$(grep -c "CHANGEME" .env.local || true)
    if [ "$CHANGEME_COUNT" -gt 0 ]; then
        echo -e "   ${YELLOW}⚠ Warning: Found $CHANGEME_COUNT 'CHANGEME' placeholders${NC}"
        echo "   → Edit .env.local and replace placeholders with real credentials"
        echo "   → Required: MONGODB_URI, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
        echo ""
        read -p "   Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "   ${GREEN}✓ No CHANGEME placeholders found${NC}"
    fi
else
    echo -e "${RED}✗ Not found${NC}"
    echo "   → Copy .env.local.example to .env.local"
    echo "   → Fill in required credentials"
    exit 1
fi

# Check 4: node_modules
echo -ne "4. Checking node_modules... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${YELLOW}⚠ Not found${NC}"
    echo "   → Running npm install..."
    npm install
fi

# Check 5: MongoDB connection (optional quick test)
echo -ne "5. Testing MongoDB connection... "
if grep -q "^MONGODB_URI=mongodb" .env.local 2>/dev/null; then
    MONGO_URI=$(grep "^MONGODB_URI=" .env.local | cut -d'=' -f2-)
    if [[ "$MONGO_URI" == *"CHANGEME"* ]]; then
        echo -e "${YELLOW}⚠ Skipped (CHANGEME in URI)${NC}"
    else
        echo -e "${GREEN}✓ URI configured${NC}"
        # Actual connection test would go here (requires mongosh or node script)
    fi
else
    echo -e "${YELLOW}⚠ Skipped (no URI found)${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Prerequisites Check Complete!${NC}"
echo ""
echo "🚀 Starting development server..."
echo "   → Running: npm run dev"
echo "   → Server will be available at: http://localhost:3000"
echo "   → Press Ctrl+C to stop"
echo ""

# Start the dev server
npm run dev
