#!/bin/bash
# =============================================================================
# VS Code Memory Cleanup Script
# =============================================================================
# This script helps free up memory when VS Code is consuming too much RAM
# Usage: ./scripts/cleanup-memory.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo ""
  echo -e "${BLUE}================================================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}================================================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

check_memory_usage() {
  print_header "Current Memory Usage"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "VS Code Processes:"
    ps aux | grep -i "visual studio code\|electron\|code helper" | grep -v grep | awk '{printf "%-50s %6s MB\n", substr($11, 1, 50), int($6/1024)}' | head -10
    echo ""
    echo "Total Memory:"
    vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+)[^\d]+(\d+)/ and printf("%-16s % 16.2f MB\n", "$1:", $2 * $size / 1048576);'
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "VS Code Processes:"
    ps aux | grep -i "code" | grep -v grep | awk '{printf "%-50s %6s MB\n", substr($11, 1, 50), $6/1024}' | head -10
    echo ""
    echo "Total Memory:"
    free -h
  fi
  
  echo ""
}

cleanup_build_artifacts() {
  print_header "Step 1: Cleaning Build Artifacts"
  
  local dirs_to_clean=(
    ".next"
    ".turbo"
    "dist"
    "build"
    "out"
    "tmp"
    "_artifacts/coverage"
    "coverage"
    ".cache"
  )
  
  local cleaned=0
  local freed_mb=0
  
  for dir in "${dirs_to_clean[@]}"; do
    if [ -d "$dir" ]; then
      local size_before=$(du -sm "$dir" 2>/dev/null | cut -f1)
      print_info "Removing $dir (${size_before}MB)..."
      rm -rf "$dir"
      cleaned=$((cleaned + 1))
      freed_mb=$((freed_mb + size_before))
    fi
  done
  
  if [ $cleaned -gt 0 ]; then
    print_success "Cleaned $cleaned directories, freed ~${freed_mb}MB"
  else
    print_info "No build artifacts to clean"
  fi
}

cleanup_node_modules() {
  print_header "Step 2: Node Modules (Optional)"
  
  if [ -d "node_modules" ]; then
    local size=$(du -sh node_modules 2>/dev/null | cut -f1)
    print_warning "node_modules is $size"
    echo ""
    read -p "Do you want to remove node_modules? You'll need to run 'pnpm install' again (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      print_info "Removing node_modules..."
      rm -rf node_modules
      rm -f pnpm-lock.yaml
      print_success "node_modules removed. Run 'pnpm install' to reinstall"
    else
      print_info "Skipping node_modules cleanup"
    fi
  else
    print_info "node_modules not found"
  fi
}

cleanup_logs() {
  print_header "Step 3: Cleaning Logs and Temporary Files"
  
  local cleaned=0
  
  # Find and remove log files
  find . -name "*.log" -type f -not -path "*/node_modules/*" -delete && cleaned=$((cleaned + 1))
  
  # Remove test results
  rm -rf test-results playwright-report e2e-test-results jscpd-report && cleaned=$((cleaned + 1))
  
  # Remove temporary files
  rm -rf /tmp/route-verify*.log /tmp/tsc-check.log /tmp/test-output.log /tmp/notification-smoke.log 2>/dev/null && cleaned=$((cleaned + 1))
  
  if [ $cleaned -gt 0 ]; then
    print_success "Cleaned logs and temporary files"
  fi
}

stop_development_servers() {
  print_header "Step 4: Stopping Development Servers"
  
  # Check for Next.js dev server
  local next_pids=$(lsof -ti:3000 2>/dev/null || true)
  if [ -n "$next_pids" ]; then
    print_info "Stopping Next.js server on port 3000..."
    kill -9 $next_pids 2>/dev/null || true
    print_success "Next.js server stopped"
  fi
  
  # Check for common Node processes
  local node_procs=$(pgrep -f "node.*next|node.*tsx|node.*turbo" || true)
  if [ -n "$node_procs" ]; then
    print_warning "Found running Node processes:"
    ps -p $node_procs -o pid,command | head -5
    echo ""
    read -p "Kill these processes? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      kill $node_procs 2>/dev/null || true
      print_success "Node processes stopped"
    fi
  else
    print_info "No development servers running"
  fi
}

optimize_git() {
  print_header "Step 5: Git Optimization"
  
  if [ -d ".git" ]; then
    print_info "Running git garbage collection..."
    git gc --aggressive --prune=now 2>&1 | head -5
    print_success "Git repository optimized"
  fi
}

restart_vscode_recommendation() {
  print_header "Step 6: VS Code Restart Recommendation"
  
  print_warning "To fully free memory, you should:"
  echo ""
  echo "  1. Close all open editor tabs (Cmd+K W on Mac, Ctrl+K W on Linux/Windows)"
  echo "  2. Reload VS Code window (Cmd+Shift+P > Reload Window)"
  echo "  3. Or fully quit and restart VS Code"
  echo ""
  print_info "VS Code optimizations applied:"
  echo "  • TypeScript server memory reduced to 4GB"
  echo "  • Disabled expensive IntelliSense features"
  echo "  • Limited open editors to 5 tabs"
  echo "  • Excluded heavy directories from indexing"
  echo ""
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                                                                ║${NC}"
  echo -e "${BLUE}║            VS Code Memory Cleanup & Optimization              ║${NC}"
  echo -e "${BLUE}║                                                                ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  
  check_memory_usage
  cleanup_build_artifacts
  cleanup_logs
  stop_development_servers
  optimize_git
  cleanup_node_modules
  restart_vscode_recommendation
  
  echo ""
  print_success "Memory cleanup complete!"
  echo ""
  print_info "Check memory usage again with: ps aux | grep -i code"
  echo ""
}

main
