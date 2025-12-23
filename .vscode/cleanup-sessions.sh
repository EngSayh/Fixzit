#!/bin/bash
# Auto-cleanup script for VS Code Copilot/Codex sessions
# Clears stale data and kills orphaned processes
#
# ⚠️ WARNING: This script is for local development only.
# The pkill commands use SIGKILL (-9) which terminates immediately without cleanup.
# Process patterns are scoped to this workspace to minimize false matches.
# Do NOT run this in production or CI environments.

WORKSPACE_STORAGE="$HOME/Library/Application Support/Code/User/workspaceStorage"
WORKSPACE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🧹 Fixzit Session Cleanup - $(date)"
echo "📂 Workspace: $WORKSPACE_DIR"

# 0. Kill orphaned build/test processes (main memory hog)
# Uses SIGTERM first, then SIGKILL after 2 seconds if still running
echo "Killing orphaned processes..."

# Helper function for graceful kill
kill_gracefully() {
  local pattern="$1"
  local pids=$(pgrep -f "$pattern" 2>/dev/null | grep -v "$$")
  if [ -n "$pids" ]; then
    # Try SIGTERM first (graceful)
    echo "$pids" | xargs kill -15 2>/dev/null
    sleep 1
    # SIGKILL remaining
    echo "$pids" | xargs kill -9 2>/dev/null
  fi
}

# Scope process killing to workspace directory when possible
pgrep -f "node.*$WORKSPACE_DIR.*next" | xargs kill -15 2>/dev/null
sleep 1
pgrep -f "node.*$WORKSPACE_DIR.*next" | xargs kill -9 2>/dev/null

pgrep -f "node.*$WORKSPACE_DIR.*vitest" | xargs kill -15 2>/dev/null
sleep 1  
pgrep -f "node.*$WORKSPACE_DIR.*vitest" | xargs kill -9 2>/dev/null

# mongo_killer is a custom script, safe to kill broadly
pkill -9 -f "mongo_killer" 2>/dev/null
echo "✓ Killed orphaned next/vitest processes (workspace-scoped)"

# 1. Clean Copilot chat sessions older than 1 day
find "$WORKSPACE_STORAGE"/*/chatSessions -type f -mtime +1 -delete 2>/dev/null
find "$WORKSPACE_STORAGE"/*/chatEditingSessions -type f -mtime +1 -delete 2>/dev/null
echo "✓ Cleared old Copilot chat sessions (>1 day)"

# 2. Clean empty directories
find "$WORKSPACE_STORAGE"/*/chatSessions -type d -empty -delete 2>/dev/null
find "$WORKSPACE_STORAGE"/*/chatEditingSessions -type d -empty -delete 2>/dev/null

# 3. Clean TypeScript cache older than 7 days
find "$HOME/Library/Caches/typescript" -type f -mtime +7 -delete 2>/dev/null
echo "✓ Cleared old TypeScript cache (>7 days)"

# 4. Clean VS Code CachedData older than 7 days
find "$HOME/Library/Application Support/Code/CachedData" -type f -mtime +7 -delete 2>/dev/null
echo "✓ Cleared old VS Code cached data (>7 days)"

# 5. Clean Next.js cache if exists
if [ -d ".next/cache" ]; then
  find .next/cache -type f -mtime +3 -delete 2>/dev/null
  echo "✓ Cleared old Next.js cache (>3 days)"
fi

# 6. Report current sizes
echo ""
echo "📊 Current storage usage:"
du -sh "$WORKSPACE_STORAGE" 2>/dev/null | awk '{print "  Workspace Storage: " $1}'
du -sh "$HOME/Library/Caches/typescript" 2>/dev/null | awk '{print "  TypeScript Cache: " $1}'
du -sh "$HOME/.npm" 2>/dev/null | awk '{print "  npm Cache: " $1}'

echo ""
echo "✅ Cleanup complete"
