#!/bin/bash
# =============================================================================
# VS CODE MEMORY EMERGENCY CLEANUP
# =============================================================================
# Run this immediately when VS Code memory usage is excessive
# This script will free up memory without losing work
#
# Usage: ./scripts/emergency-memory-cleanup.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

check_memory() {
  print_header "Current Memory Status"
  
  if command -v ps &> /dev/null; then
    echo "Top memory consumers:"
    ps aux | head -1
    ps aux | sort -rn -k 4 | grep -E "Code|node|pnpm|next" | head -10
  fi
  
  if command -v du &> /dev/null; then
    echo ""
    echo "Disk space in project:"
    du -sh . 2>/dev/null || echo "Unable to calculate"
  fi
}

cleanup_build_artifacts() {
  print_header "Step 1: Clean Build Artifacts"
  
  local cleaned=0
  
  # Next.js build cache
  if [ -d ".next" ]; then
    print_info "Removing .next/ ($(du -sh .next 2>/dev/null | cut -f1))"
    rm -rf .next
    cleaned=$((cleaned + 1))
  fi
  
  # Turbo cache
  if [ -d ".turbo" ]; then
    print_info "Removing .turbo/ ($(du -sh .turbo 2>/dev/null | cut -f1))"
    rm -rf .turbo
    cleaned=$((cleaned + 1))
  fi
  
  # TypeScript build info
  if [ -f "tsconfig.tsbuildinfo" ]; then
    print_info "Removing tsconfig.tsbuildinfo"
    rm -f tsconfig.tsbuildinfo
    cleaned=$((cleaned + 1))
  fi
  
  # Test artifacts
  if [ -d "coverage" ]; then
    print_info "Removing coverage/ ($(du -sh coverage 2>/dev/null | cut -f1))"
    rm -rf coverage
    cleaned=$((cleaned + 1))
  fi
  
  if [ -d "playwright-report" ]; then
    print_info "Removing playwright-report/"
    rm -rf playwright-report
    cleaned=$((cleaned + 1))
  fi
  
  if [ -d "test-results" ]; then
    print_info "Removing test-results/"
    rm -rf test-results
    cleaned=$((cleaned + 1))
  fi
  
  # Build outputs
  if [ -d "dist" ]; then
    print_info "Removing dist/"
    rm -rf dist
    cleaned=$((cleaned + 1))
  fi
  
  if [ -d "out" ]; then
    print_info "Removing out/"
    rm -rf out
    cleaned=$((cleaned + 1))
  fi
  
  print_success "Cleaned $cleaned directories"
}

cleanup_logs() {
  print_header "Step 2: Clean Log Files"
  
  local count=0
  
  # Find and remove log files
  if command -v find &> /dev/null; then
    count=$(find . -name "*.log" -not -path "*/node_modules/*" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
      print_info "Removing $count log files"
      find . -name "*.log" -not -path "*/node_modules/*" -type f -delete 2>/dev/null
    fi
  fi
  
  # Temp files
  if [ -d "tmp" ]; then
    print_info "Removing tmp/"
    rm -rf tmp
  fi
  
  # System temp logs
  if [ -f "/tmp/route-verify.log" ]; then
    rm -f /tmp/route-verify.log
    print_info "Removed /tmp/route-verify.log"
  fi
  
  if [ -f "/tmp/tsc-check.log" ]; then
    rm -f /tmp/tsc-check.log
    print_info "Removed /tmp/tsc-check.log"
  fi
  
  if [ -f "/tmp/test-output.log" ]; then
    rm -f /tmp/test-output.log
    print_info "Removed /tmp/test-output.log"
  fi
  
  print_success "Cleaned logs and temp files"
}

cleanup_node_processes() {
  print_header "Step 3: Kill Hanging Node Processes"
  
  # Kill any orphaned Next.js processes
  if command -v lsof &> /dev/null; then
    if lsof -ti:3000 &> /dev/null; then
      print_info "Killing process on port 3000"
      lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    fi
    
    if lsof -ti:3001 &> /dev/null; then
      print_info "Killing process on port 3001"
      lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    fi
  fi
  
  # Count node processes
  if command -v ps &> /dev/null; then
    local node_count=$(ps aux | grep -E "node|next-server|tsx" | grep -v grep | wc -l | tr -d ' ')
    if [ "$node_count" -gt 5 ]; then
      print_warning "Found $node_count node processes running - consider closing terminals"
    else
      print_success "Node processes under control ($node_count running)"
    fi
  fi
}

optimize_typescript_server() {
  print_header "Step 4: Restart TypeScript Server"
  
  # Kill existing TS servers
  if command -v pkill &> /dev/null; then
    pkill -f "tsserver" 2>/dev/null || true
    print_info "Killed TypeScript language servers"
  fi
  
  print_warning "Restart VS Code after this script completes for full effect"
}

cleanup_pnpm_cache() {
  print_header "Step 5: Clean Package Manager Cache (Optional)"
  
  print_warning "This will remove pnpm store cache (can be re-downloaded)"
  echo -n "Proceed? (y/N): "
  read -r response
  
  if [[ "$response" =~ ^[Yy]$ ]]; then
    if command -v pnpm &> /dev/null; then
      print_info "Cleaning pnpm store..."
      pnpm store prune || print_error "Failed to prune pnpm store"
      print_success "pnpm cache cleaned"
    fi
  else
    print_info "Skipped pnpm cache cleanup"
  fi
}

cleanup_git_objects() {
  print_header "Step 6: Optimize Git Repository"
  
  if [ -d ".git" ]; then
    local git_size=$(du -sh .git 2>/dev/null | cut -f1)
    print_info "Current .git size: $git_size"
    
    print_warning "This will pack and optimize git objects"
    echo -n "Proceed? (y/N): "
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
      print_info "Running git gc..."
      git gc --aggressive --prune=now 2>&1 | head -5 || print_error "Git gc failed"
      
      local new_size=$(du -sh .git 2>/dev/null | cut -f1)
      print_success "Git optimized: $git_size → $new_size"
    else
      print_info "Skipped git optimization"
    fi
  fi
}

show_recommendations() {
  print_header "Recommendations"
  
  echo ""
  echo "Immediate actions:"
  echo "  1. Close all open editor tabs (Cmd+K W)"
  echo "  2. Restart VS Code completely"
  echo "  3. Close unused terminal sessions"
  echo "  4. Disable unused extensions temporarily"
  echo ""
  echo "VS Code settings already optimized in:"
  echo "  .vscode/settings.json"
  echo ""
  echo "If memory issues persist:"
  echo "  • Split work into multiple VS Code windows"
  echo "  • Use 'code --max-memory=4096' to limit VS Code memory"
  echo "  • Exclude large directories from TypeScript: tsconfig.json"
  echo "  • Disable 'typescript.tsserver.experimental.enableProjectDiagnostics'"
  echo ""
}

show_memory_stats() {
  print_header "Memory Status After Cleanup"
  
  if command -v du &> /dev/null; then
    echo "Project size: $(du -sh . 2>/dev/null | cut -f1)"
    
    if [ -d "node_modules" ]; then
      echo "node_modules: $(du -sh node_modules 2>/dev/null | cut -f1)"
    fi
    
    if [ -d ".next" ]; then
      echo ".next: $(du -sh .next 2>/dev/null | cut -f1)"
    else
      echo ".next: [cleaned]"
    fi
  fi
  
  echo ""
  if command -v ps &> /dev/null; then
    local vscode_mem=$(ps aux | grep -i "Visual Studio Code" | grep -v grep | awk '{sum+=$4} END {printf "%.1f", sum}')
    if [ -n "$vscode_mem" ] && [ "$vscode_mem" != "0.0" ]; then
      print_info "VS Code memory usage: ~${vscode_mem}% of RAM"
    fi
  fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                                                ║${NC}"
  echo -e "${RED}║          VS CODE EMERGENCY MEMORY CLEANUP                      ║${NC}"
  echo -e "${RED}║                                                                ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  check_memory
  cleanup_build_artifacts
  cleanup_logs
  cleanup_node_processes
  optimize_typescript_server
  cleanup_pnpm_cache
  cleanup_git_objects
  show_memory_stats
  show_recommendations
  
  echo ""
  print_success "Cleanup complete! Restart VS Code now."
  echo ""
}

main
