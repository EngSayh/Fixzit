#!/bin/bash
# Auto-cleanup script for VS Code Copilot/Codex sessions
# Clears stale data and kills orphaned processes

WORKSPACE_STORAGE="$HOME/Library/Application Support/Code/User/workspaceStorage"

echo "🧹 Fixzit Session Cleanup - $(date)"

# 0. Kill orphaned build/test processes (main memory hog)
echo "Killing orphaned processes..."
pkill -9 -f "next build" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null  
pkill -9 -f "vitest" 2>/dev/null
pkill -9 -f "mongo_killer" 2>/dev/null
pkill -9 -f "mongod.*27017" 2>/dev/null
echo "✓ Killed orphaned next/vitest/mongo processes"

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
