#!/bin/bash
# Fix VSCode Crashes - Memory Management Script
# Run this when VSCode becomes unstable

set -e

echo "🔧 VSCode Crash Fix Script"
echo "=========================="

# 1. Kill all VSCode processes cleanly
echo "1. Stopping VSCode processes..."
pkill -f "Visual Studio Code" || true
pkill -f "code-server" || true
pkill -f "node.*tsserver" || true
pkill -f "node.*eslint" || true
pkill -f "pylance" || true
sleep 2

# 2. Clear VSCode caches
echo "2. Clearing VSCode caches..."
rm -rf ~/.vscode-server/data/User/workspaceStorage/* || true
rm -rf ~/.vscode-server/data/User/globalStorage/* || true
rm -rf ~/.vscode-server/extensions/.obsolete || true
rm -rf /tmp/vscode-typescript* || true
rm -rf /tmp/eslint* || true

# 3. Clear Node/npm caches
echo "3. Clearing Node caches..."
rm -rf node_modules/.cache || true
rm -rf .next/cache || true
rm -rf .turbo || true

# 4. Optimize TypeScript server
echo "4. Creating TypeScript config for performance..."
cat > tsconfig.performance.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "incremental": true,
    "skipLibCheck": true,
    "skipDefaultLibCheck": true
  },
  "exclude": [
    "node_modules",
    ".next",
    "out",
    "build",
    "dist",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/__tests__/**"
  ]
}
EOF

# 5. Create memory-optimized settings
echo "5. Creating optimized VSCode settings..."
cat > .vscode/settings.memory-optimized.json << 'EOF'
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.next/**": true,
    "**/.turbo/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/bower_components": true,
    "**/*.code-search": true,
    "**/dist": true,
    "**/build": true,
    "**/.next": true
  },
  "typescript.tsserver.maxTsServerMemory": 4096,
  "typescript.disableAutomaticTypeAcquisition": true,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "eslint.run": "onSave",
  "extensions.autoUpdate": true,
  "extensions.autoCheckUpdates": true,
  "git.untrackedChanges": "hidden",
  "git.enableSmartCommit": true,
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.next": true
  }
}
EOF

# 6. List heavy extensions
echo "6. Checking installed extensions..."
code --list-extensions | grep -E "(qodo|coderabbit|copilot|pylance|typescript)" || true

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Restart VSCode/Codespace"
echo "  2. Disable heavy extensions temporarily:"
echo "     - CodeRabbit (if causing issues during reviews)"
echo "     - Qodo Merge Pro"
echo "  3. Use the optimized settings:"
echo "     cp .vscode/settings.memory-optimized.json .vscode/settings.json"
echo "  4. Consider splitting workspace into smaller folders"
echo ""
echo "🔍 To monitor memory:"
echo "  ps aux | grep -E '(code|node|typescript|pylance)' | head -20"
