#!/usr/bin/env bash
#
# VS Code Memory Guard - Prevents out-of-memory crashes (error code 5)
#
# Purpose: Monitor and manage VS Code processes to prevent memory exhaustion
# Usage: bash scripts/vscode-memory-guard.sh [--kill-duplicates] [--limit-tsserver] [--monitor]
#
# Root Causes of VS Code Error Code 5:
# 1. Multiple dev servers running simultaneously
# 2. TypeScript language server unbounded memory growth
# 3. Extension host memory leaks
# 4. Large file operations without streaming
#
# This script:
# - Detects and kills duplicate dev servers
# - Monitors tsserver memory and restarts if exceeds threshold
# - Provides real-time memory monitoring
# - Implements memory limits for Node processes
#

set -euo pipefail

# Configuration — keep values in sync with .vscode/settings.json
read_vscode_tsserver_limit() {
    if ! command -v node >/dev/null 2>&1; then
        return 0
    fi
    if [ ! -f ".vscode/settings.json" ]; then
        return 0
    fi
    node <<'NODE'
const fs = require('fs');
try {
  const config = JSON.parse(fs.readFileSync('.vscode/settings.json', 'utf8'));
  const limit = config['typescript.tsserver.maxTsServerMemory'];
  if (Number.isFinite(limit)) {
    process.stdout.write(String(limit));
  }
} catch {
  // Ignore parse errors; caller will fall back to default
}
NODE
}

readonly CONFIGURED_TSSERVER_LIMIT="$(read_vscode_tsserver_limit)"
readonly DEFAULT_TSSERVER_LIMIT="${CONFIGURED_TSSERVER_LIMIT:-8192}"
readonly MEMORY_THRESHOLD_MB="${TSERVER_LIMIT_MB:-$DEFAULT_TSSERVER_LIMIT}"  # VS Code tsserver cap (defaults to 8GB)
readonly EXTENSION_HOST_LIMIT_MB="${EXT_HOST_LIMIT_MB:-$MEMORY_THRESHOLD_MB}"  # Mirror tsserver limit unless overridden
readonly CHECK_INTERVAL_SECONDS=60  # Monitor every minute
readonly LOG_FILE="${LOG_FILE:-/tmp/vscode-memory-guard.log}"

# Colors
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

# Get memory usage in MB for a process
get_process_memory_mb() {
    local pid=$1
    if ps -p "$pid" > /dev/null 2>&1; then
        ps -p "$pid" -o rss= | awk '{print int($1/1024)}'
    else
        echo "0"
    fi
}

# Kill duplicate dev servers (keeps newest)
kill_duplicate_dev_servers() {
    log_info "Checking for duplicate dev servers..."
    
    # Find all next-server processes
    local pids
    pids=$(ps aux | grep "next-server" | grep -v grep | awk '{print $2, $10}' | sort -k2 -n || true)
    
    if [ -z "$pids" ]; then
        log_info "No dev servers found"
        return 0
    fi
    
    # Count processes
    local count
    count=$(echo "$pids" | wc -l)
    
    if [ "$count" -le 1 ]; then
        log_info "Only 1 dev server running - OK"
        return 0
    fi
    
    log_warn "Found $count dev servers running - killing older instances..."
    
    # Kill all but the newest (last line)
    echo "$pids" | head -n -1 | while read -r pid start_time; do
        local mem_mb
        mem_mb=$(get_process_memory_mb "$pid")
        log_warn "Killing duplicate dev server PID $pid (started $start_time, memory: ${mem_mb}MB)"
        kill "$pid" 2>/dev/null || log_error "Failed to kill PID $pid"
    done
    
    log_info "Cleanup complete - ${count} duplicate(s) removed"
}

# Monitor and restart tsserver if memory exceeds threshold
check_tsserver_memory() {
    log_debug "Checking tsserver memory usage..."
    
    # Find all tsserver processes
    local tsserver_pids
    tsserver_pids=$(ps aux | grep "tsserver.js" | grep -v grep | awk '{print $2}' || true)
    
    if [ -z "$tsserver_pids" ]; then
        log_debug "No tsserver processes found"
        return 0
    fi
    
    for pid in $tsserver_pids; do
        local mem_mb
        mem_mb=$(get_process_memory_mb "$pid")
        
        log_debug "tsserver PID $pid: ${mem_mb}MB"
        
        if [ "$mem_mb" -gt "$MEMORY_THRESHOLD_MB" ]; then
            log_warn "tsserver PID $pid exceeds threshold (${mem_mb}MB > ${MEMORY_THRESHOLD_MB}MB)"
            log_warn "Restarting tsserver to prevent memory crash..."
            
            # Kill tsserver - VSCode will auto-restart it
            kill "$pid" 2>/dev/null || log_error "Failed to kill tsserver PID $pid"
            
            log_info "tsserver restarted successfully"
            return 0
        fi
    done
    
    log_debug "All tsserver processes within memory limits"
}

# Monitor extension host memory
check_extension_host_memory() {
    log_debug "Checking extension host memory usage..."
    
    # Find extension host process
    local ext_host_pid
    ext_host_pid=$(ps aux | grep "extensionHost" | grep -v grep | awk '{print $2}' | head -1 || true)
    
    if [ -z "$ext_host_pid" ]; then
        log_debug "No extension host process found"
        return 0
    fi
    
    local mem_mb
    mem_mb=$(get_process_memory_mb "$ext_host_pid")
    
    log_debug "Extension host PID $ext_host_pid: ${mem_mb}MB"
    
    if [ "$mem_mb" -gt "$EXTENSION_HOST_LIMIT_MB" ]; then
        log_error "Extension host exceeds threshold (${mem_mb}MB > ${EXTENSION_HOST_LIMIT_MB}MB)"
        log_error "⚠️  WARNING: Extension host memory is critically high!"
        log_error "⚠️  Consider disabling unused extensions to prevent crashes"
        log_error "⚠️  Recommended: Restart VS Code to clear memory"
        return 1
    fi
    
    log_debug "Extension host within memory limits"
}

# Display current memory status
show_memory_status() {
    echo ""
    echo "======================================"
    echo "  VS Code Memory Status"
    echo "======================================"
    echo ""
    
    # System memory
    echo "System Memory:"
    free -h 2>/dev/null || vm_stat | head -5
    echo ""
    
    # Top memory consumers
    echo "Top Memory Consumers:"
    echo "----------------------------------------"
    printf "%-10s %-8s %-8s %s\\n" "PID" "MEM%" "MEM(MB)" "COMMAND"
    echo "----------------------------------------"
    
    set +o pipefail
    ps aux | awk 'NR>1' | sort -nrk 4 | head -10 | while read -r _user pid _pcpu pmem vsz rss _tty _stat _start _time cmd; do
        local mem_mb=$((rss / 1024))
        local short_cmd
        short_cmd=$(echo "$cmd" | cut -c 1-50)
        printf "%-10s %-8s %-8s %s\\n" "$pid" "$pmem%" "${mem_mb}" "$short_cmd"
    done
    set -o pipefail
    
    echo ""
    
    # VS Code specific processes
    echo "VS Code Processes:"
    echo "----------------------------------------"
    
    # tsserver
    local tsserver_pids
    tsserver_pids=$(ps aux | grep "tsserver.js" | grep -v grep | awk '{print $2}' || true)
    if [ -n "$tsserver_pids" ]; then
        for pid in $tsserver_pids; do
            local mem_mb
            mem_mb=$(get_process_memory_mb "$pid")
            local status="OK"
            [ "$mem_mb" -gt "$MEMORY_THRESHOLD_MB" ] && status="${RED}HIGH${NC}"
            echo -e "  tsserver PID $pid: ${mem_mb}MB [$status]"
        done
    fi
    
    # Extension host
    local ext_host_pid
    ext_host_pid=$(ps aux | grep "extensionHost" | grep -v grep | awk '{print $2}' | head -1 || true)
    if [ -n "$ext_host_pid" ]; then
        local mem_mb
        mem_mb=$(get_process_memory_mb "$ext_host_pid")
        local status="OK"
        [ "$mem_mb" -gt "$EXTENSION_HOST_LIMIT_MB" ] && status="${RED}HIGH${NC}"
        echo -e "  Extension Host PID $ext_host_pid: ${mem_mb}MB [$status]"
    fi
    
    # Dev servers
    local dev_server_pids
    dev_server_pids=$(ps aux | grep "next-server" | grep -v grep | awk '{print $2}' || true)
    if [ -n "$dev_server_pids" ]; then
        local count
        count=$(echo "$dev_server_pids" | wc -l)
        echo "  Dev Servers: $count running"
        for pid in $dev_server_pids; do
            local mem_mb
            mem_mb=$(get_process_memory_mb "$pid")
            echo "    PID $pid: ${mem_mb}MB"
        done
    fi
    
    echo "======================================"
    echo ""
}

# Continuous monitoring mode
monitor_mode() {
    log_info "Starting continuous monitoring mode (interval: ${CHECK_INTERVAL_SECONDS}s)"
    log_info "Press Ctrl+C to stop"
    
    while true; do
        show_memory_status
        
        # Check for issues
        kill_duplicate_dev_servers
        check_tsserver_memory
        check_extension_host_memory || true  # Don't exit on warning
        
        log_info "Next check in ${CHECK_INTERVAL_SECONDS}s..."
        sleep "$CHECK_INTERVAL_SECONDS"
    done
}

# Apply memory limits to Node processes (VSCode settings)
apply_memory_limits() {
    log_info "Applying memory limits to VS Code settings..."
    
    local settings_file=".vscode/settings.json"
    
    # Ensure .vscode directory exists
    mkdir -p .vscode
    
    # Check if settings file exists
    if [ ! -f "$settings_file" ]; then
        log_info "Creating new settings file..."
        cat > "$settings_file" <<EOF
{
  "typescript.tsserver.maxTsServerMemory": ${MEMORY_THRESHOLD_MB},
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "typescript.disableAutomaticTypeAcquisition": true,
  "typescript.tsserver.watchOptions": {
    "excludeDirectories": ["**/node_modules", "**/.git", "**/dist", "**/.next"]
  },
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/**": true,
    "**/.next/**": true,
    "**/dist/**": true,
    "**/coverage/**": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/coverage": true
  }
}
EOF
        log_info "Settings file created with memory optimization"
    else
        log_info "Settings file already exists - please update manually if needed"
        log_info "Recommended settings:"
        log_info "  \"typescript.tsserver.maxTsServerMemory\": ${MEMORY_THRESHOLD_MB}"
        log_info '  "typescript.tsserver.experimental.enableProjectDiagnostics": false'
    fi
}

# Main function
main() {
    log_info "VS Code Memory Guard started"
    
    # Parse command line arguments
    local action="${1:-status}"
    
    case "$action" in
        --kill-duplicates)
            kill_duplicate_dev_servers
            ;;
        --limit-tsserver)
            check_tsserver_memory
            ;;
        --monitor)
            monitor_mode
            ;;
        --apply-limits)
            apply_memory_limits
            ;;
        --status|status)
            show_memory_status
            ;;
        --help|help)
            echo "Usage: $0 [option]"
            echo ""
            echo "Options:"
            echo "  --status           Show current memory status (default)"
            echo "  --kill-duplicates  Kill duplicate dev servers"
            echo "  --limit-tsserver   Check and restart tsserver if over limit"
            echo "  --monitor          Continuous monitoring mode"
            echo "  --apply-limits     Apply memory limits to VS Code settings"
            echo "  --help             Show this help message"
            echo ""
            echo "Root Causes of VS Code Error Code 5 (Out of Memory):"
            echo "  1. Multiple dev servers running simultaneously"
            echo "  2. TypeScript language server unbounded memory growth"
            echo "  3. Extension host memory leaks"
            echo "  4. Large file operations without streaming"
            echo ""
            echo "Prevention:"
            echo "  - Run with --kill-duplicates before starting work"
            echo "  - Use --monitor during long coding sessions"
            echo "  - Apply --apply-limits to VS Code settings"
            echo "  - Restart VS Code if extension host exceeds ${EXTENSION_HOST_LIMIT_MB}MB"
            ;;
        *)
            log_error "Unknown option: $action"
            log_error "Use --help for usage information"
            exit 1
            ;;
    esac
    
    log_info "VS Code Memory Guard completed"
}

# Run main function
main "$@"
