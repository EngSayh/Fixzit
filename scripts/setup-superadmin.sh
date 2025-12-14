#!/bin/bash
# Setup SuperAdmin - Wrapper Script
# Loads .env.local and runs the setup script

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🔐 SUPERADMIN SETUP - Wrapper Script${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo -e "${RED}❌ .env.local file not found${NC}"
  echo "   Create it first with MONGODB_URI"
  exit 1
fi

# Load .env.local (export all variables)
echo -e "${YELLOW}📁 Loading .env.local...${NC}"
set -a
source .env.local
set +a
echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo ""

# Check if SUPERADMIN_PASSWORD is provided
if [ -z "$SUPERADMIN_PASSWORD" ]; then
  echo -e "${RED}❌ Missing SUPERADMIN_PASSWORD${NC}"
  echo ""
  echo "Usage:"
  echo "  SUPERADMIN_PASSWORD=\"YourPassword123!\" bash scripts/setup-superadmin.sh"
  echo ""
  exit 1
fi

# Run the setup script
node scripts/setup-superadmin-simple.js
