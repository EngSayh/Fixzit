#!/usr/bin/env bash
#
# Memory Optimization Script for Fixzit Development Environment
# 
# PURPOSE:
# - Prevent VS Code crashes (error code 5: out of memory)
# - Kill duplicate/orphaned processes
# - Clean up dev caches
# - Provide memory usage report
#
# USAGE:
#   bash scripts/optimize-memory.sh
#   bash scripts/optimize-memory.sh --aggressive  # Kill more aggressively
#
# GOVERNANCE: Complies with Fixzit Stabilization Protocol Phase-2

set -euo pipefail

OS="$(uname -s)"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FIXZIT MEMORY OPTIMIZATION & PROCESS CLEANUP               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

AGGRESSIVE=false
if [[ "${1:-}" == "--aggressive" ]]; then
  AGGRESSIVE=true
  echo -e "${YELLOW}⚠️  AGGRESSIVE mode enabled - will kill more processes${NC}"
  echo ""
fi

# ============================================================================
# 1. MEMORY USAGE REPORT
# ============================================================================
echo -e "${GREEN}📊 Current Memory Usage:${NC}"
if [ "$OS" = "Darwin" ]; then
  vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+)[^\d]+(\d+)/ and printf("%-20s % 16.2f MB\n", "$1:", $2 * $size / 1048576);'
else
  free -h || echo "free command not available on this OS"
fi
echo ""

echo -e "${GREEN}📈 Top 10 Memory-Consuming Processes:${NC}"
printf "%-15s %6s %5s %10s %s\n" "USER" "PID" "MEM%" "RSS(KB)" "COMMAND"
if [ "$OS" = "Darwin" ]; then
  set +o pipefail
  ps aux | awk 'NR>1' | sort -nrk4 | head -10 | awk '{printf "%-15s %6s %5s %10s %s\n", $1, $2, $4, $6, substr($0, index($0,$11))}'
  set -o pipefail
else
  set +o pipefail
  ps aux --sort=-%mem | tail -n +2 | head -10 | awk '{printf "%-15s %6s %5s %10s %s\n", $1, $2, $4, $6, substr($0, index($0,$11))}'
  set -o pipefail
fi
echo ""

# ============================================================================
# 2. IDENTIFY DUPLICATE PROCESSES
# ============================================================================
echo -e "${GREEN}🔍 Checking for duplicate processes...${NC}"

# Count TypeScript servers
TS_SERVERS=$(pgrep -f "tsserver.js" | wc -l)
if [ "$TS_SERVERS" -gt 2 ]; then
  echo -e "${YELLOW}⚠️  Found $TS_SERVERS TypeScript servers (expected: 1-2)${NC}"
  if [ "$AGGRESSIVE" = true ]; then
    echo -e "${RED}   Killing older TypeScript servers...${NC}"
    # Keep the 2 newest, kill the rest
    pgrep -f "tsserver.js" | head -n -2 | xargs -r kill -9 2>/dev/null || true
    echo -e "${GREEN}   ✅ Cleaned up duplicate TypeScript servers${NC}"
  else
    echo -e "${YELLOW}   Run with --aggressive to kill duplicate TypeScript servers${NC}"
  fi
else
  echo -e "${GREEN}✅ TypeScript servers: $TS_SERVERS (OK)${NC}"
fi

# Count Next.js dev servers
NEXT_SERVERS=$(pgrep -f "next-server" | wc -l)
if [ "$NEXT_SERVERS" -gt 1 ]; then
  echo -e "${YELLOW}⚠️  Found $NEXT_SERVERS Next.js dev servers (expected: 1)${NC}"
  if [ "$AGGRESSIVE" = true ]; then
    echo -e "${RED}   Keeping newest, killing older Next.js servers...${NC}"
    pgrep -f "next-server" | head -n -1 | xargs -r kill -15 2>/dev/null || true
    sleep 2
    # Force kill if still running
    pgrep -f "next-server" | head -n -1 | xargs -r kill -9 2>/dev/null || true
    echo -e "${GREEN}   ✅ Cleaned up duplicate Next.js servers${NC}"
  else
    echo -e "${YELLOW}   Run with --aggressive to kill duplicate Next.js servers${NC}"
  fi
else
  echo -e "${GREEN}✅ Next.js dev servers: $NEXT_SERVERS (OK)${NC}"
fi

# Count VS Code extension hosts
EXT_HOSTS=$(pgrep -f "extensionHost" | wc -l)
if [ "$EXT_HOSTS" -gt 2 ]; then
  echo -e "${YELLOW}⚠️  Found $EXT_HOSTS VS Code extension hosts (expected: 1-2)${NC}"
  echo -e "${YELLOW}   This usually indicates crashed/orphaned processes${NC}"
  if [ "$AGGRESSIVE" = true ]; then
    echo -e "${RED}   Keeping newest 2, killing older extension hosts...${NC}"
    pgrep -f "extensionHost" | head -n -2 | xargs -r kill -15 2>/dev/null || true
    sleep 2
    pgrep -f "extensionHost" | head -n -2 | xargs -r kill -9 2>/dev/null || true
    echo -e "${GREEN}   ✅ Cleaned up orphaned extension hosts${NC}"
    echo -e "${YELLOW}   NOTE: VS Code may need to reload the window${NC}"
  else
    echo -e "${YELLOW}   Run with --aggressive to kill orphaned extension hosts${NC}"
    echo -e "${YELLOW}   WARNING: This will require VS Code window reload${NC}"
  fi
else
  echo -e "${GREEN}✅ VS Code extension hosts: $EXT_HOSTS (OK)${NC}"
fi

echo ""

# ============================================================================
# 3. CLEAN UP CACHES
# ============================================================================
echo -e "${GREEN}🧹 Cleaning up development caches...${NC}"

# Next.js cache
if [ -d ".next/cache" ]; then
  CACHE_SIZE=$(du -sh .next/cache 2>/dev/null | cut -f1)
  echo -e "   Next.js cache: $CACHE_SIZE"
  rm -rf .next/cache
  echo -e "${GREEN}   ✅ Cleaned Next.js cache${NC}"
fi

# Node modules cache
if [ -d "node_modules/.cache" ]; then
  CACHE_SIZE=$(du -sh node_modules/.cache 2>/dev/null | cut -f1)
  echo -e "   node_modules/.cache: $CACHE_SIZE"
  rm -rf node_modules/.cache
  echo -e "${GREEN}   ✅ Cleaned node_modules cache${NC}"
fi

# Playwright cache (if exists and large)
if [ -d "playwright-report" ]; then
  CACHE_SIZE=$(du -sh playwright-report 2>/dev/null | cut -f1)
  echo -e "   Playwright reports: $CACHE_SIZE"
  find playwright-report -type f -mtime +7 -delete 2>/dev/null || true
  echo -e "${GREEN}   ✅ Cleaned old Playwright reports${NC}"
fi

# TypeScript build info
if [ -f "tsconfig.tsbuildinfo" ]; then
  rm -f tsconfig.tsbuildinfo
  echo -e "${GREEN}   ✅ Cleaned TypeScript build info${NC}"
fi

echo ""

# ============================================================================
# 4. VERIFY MEMORY LIMITS
# ============================================================================
echo -e "${GREEN}🔧 Verifying memory configuration...${NC}"

# Check build memory configuration in package.json scripts
if grep -q "next-build.mjs" package.json; then
  echo -e "${GREEN}✅ Build uses adaptive memory script (scripts/next-build.mjs)${NC}"
elif grep -q "NODE_OPTIONS.*max-old-space-size" package.json; then
  echo -e "${GREEN}✅ NODE_OPTIONS memory limit set in package.json${NC}"
else
  echo -e "${YELLOW}⚠️  Build memory limit NOT detected in package.json${NC}"
  echo -e "${YELLOW}   Add scripts/next-build.mjs or NODE_OPTIONS=--max-old-space-size=8192${NC}"
fi

# Check VS Code settings
if [ -f ".vscode/argv.json" ]; then
  if grep -q "max-old-space-size" .vscode/argv.json; then
    echo -e "${GREEN}✅ VS Code memory limit set in argv.json${NC}"
  else
    echo -e "${YELLOW}⚠️  VS Code memory limit NOT set in argv.json${NC}"
    echo -e "${YELLOW}   Add --max-old-space-size=8192 to .vscode/argv.json${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  .vscode/argv.json not found${NC}"
  echo -e "${YELLOW}   Create with: echo '{\"max-old-space-size\": 8192}' > .vscode/argv.json${NC}"
fi

echo ""

# ============================================================================
# 5. FINAL MEMORY REPORT
# ============================================================================
echo -e "${GREEN}📊 Memory Usage After Cleanup:${NC}"
free -h || echo "free command not available"
echo ""

# Calculate available memory percentage
if command -v free &> /dev/null; then
  AVAILABLE_MB=$(free -m | awk 'NR==2 {print $7}')
  TOTAL_MB=$(free -m | awk 'NR==2 {print $2}')
  AVAILABLE_PCT=$((AVAILABLE_MB * 100 / TOTAL_MB))
  
  if [ "$AVAILABLE_PCT" -lt 20 ]; then
    echo -e "${RED}🚨 CRITICAL: Only $AVAILABLE_PCT% memory available${NC}"
    echo -e "${RED}   VS Code crash risk is HIGH${NC}"
    echo -e "${RED}   Consider: 1) Restart VS Code, 2) Close unused apps, 3) Reboot${NC}"
  elif [ "$AVAILABLE_PCT" -lt 30 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Only $AVAILABLE_PCT% memory available${NC}"
    echo -e "${YELLOW}   Monitor memory usage closely${NC}"
  else
    echo -e "${GREEN}✅ Memory status: $AVAILABLE_PCT% available (healthy)${NC}"
  fi
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Memory optimization complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
