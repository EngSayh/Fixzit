#!/bin/bash

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════╗
║     🧹 CLEANUP UNNECESSARY UPLOADED FILES 🧹                     ║
╚══════════════════════════════════════════════════════════════════╝

This script will remove files that were uploaded but are not needed:

1. 📊 Large Analysis/Report Files (4.3 MB)
   • pr83-reviews.json (1.7 MB)
   • comment-analysis.json (1.1 MB)
   • eslint-report.json (2.4 MB)
   • source_duplicates.txt (176 KB)
   • duplicate_files_temp.txt (26 KB)

2. 📦 Duplicate Package Dependencies (27 MB)
   • packages/fixzit-souq-server/node_modules/ (27 MB)

3. 📝 Temporary Log Files (87 KB)

4. 🔧 Old Scripts (250+ KB)

5. 📦 Redundant Lock Files (435 KB)
   • pnpm-lock.yaml (you're using npm, not pnpm)

TOTAL TO REMOVE: ~32 MB

EOF

read -p "Continue with cleanup? (yes/no): " response

if [[ "$response" != "yes" ]]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo ""
echo "📊 BEFORE:"
du -sh /workspaces/Fixzit
df -h /workspaces/Fixzit | awk 'NR==2{print "Disk: " $5 " (" $3 " used, " $4 " free)"}'
echo ""

echo "🗑️  Removing files..."
rm -f /workspaces/Fixzit/pr83-reviews.json
rm -f /workspaces/Fixzit/comment-analysis.json
rm -f /workspaces/Fixzit/_artifacts/eslint-report.json
rm -f /workspaces/Fixzit/source_duplicates.txt
rm -f /workspaces/Fixzit/duplicate_files_temp.txt
rm -rf /workspaces/Fixzit/packages/fixzit-souq-server/node_modules
rm -f /workspaces/Fixzit/*.log
rm -f /workspaces/Fixzit/typescript-errors-full.txt
rm -f /workspaces/Fixzit/merge-pr-*.ps1
rm -f /workspaces/Fixzit/merge-*.ps1
rm -f /workspaces/Fixzit/fix_*.py
rm -f /workspaces/Fixzit/fix-pr83-*.sh
rm -f /workspaces/Fixzit/fix-critical-errors.sh
rm -f /workspaces/Fixzit/test-tool*.sh
rm -f /workspaces/Fixzit/test-replace-debug.sh
rm -f /workspaces/Fixzit/diagnose-replace-issue.sh
rm -f /workspaces/Fixzit/verify-*.sh
rm -f /workspaces/Fixzit/pnpm-lock.yaml
rm -f /workspaces/Fixzit/test-basic.txt
rm -f /workspaces/Fixzit/test-system*.ps1
rm -f /workspaces/Fixzit/test-powershell-heredoc.ts
rm -f /workspaces/Fixzit/test-simple.mjs
rm -f /workspaces/Fixzit/analyze-*.js
rm -f /workspaces/Fixzit/check-imports.sh
rm -f /workspaces/Fixzit/create-guardrails.js
rm -f /workspaces/Fixzit/setup.js
rm -f /workspaces/Fixzit/fix-imports.*
rm -f /workspaces/Fixzit/fix_merge_conflicts.js
rm -f /workspaces/Fixzit/install-missing-packages.*
rm -f /workspaces/Fixzit/verify-imports.*
rm -f /workspaces/Fixzit/update_db_connections.*
rm -f /workspaces/Fixzit/fix-session-types.ps1
rm -f /workspaces/Fixzit/fix-test-params.ps1
rm -f /workspaces/Fixzit/fix_function_calls.sh
rm -f /workspaces/Fixzit/enterprise-merge.ps1
rm -f /workspaces/Fixzit/cleanup-mockdb.ps1
rm -f /workspaces/Fixzit/create-pr.sh
rm -f /workspaces/Fixzit/PowerShell-Profile-Enhancement.ps1
rm -f /workspaces/Fixzit/Write-HereDoc.ps1
rm -f /workspaces/Fixzit/tsconfig.tsbuildinfo
rm -rf /workspaces/Fixzit/playwright-report
rm -rf /workspaces/Fixzit/test-results

echo "✅ Done!"
echo ""
echo "📊 AFTER:"
du -sh /workspaces/Fixzit
df -h /workspaces/Fixzit | awk 'NR==2{print "Disk: " $5 " (" $3 " used, " $4 " free)"}'
echo ""
echo "Removed ~32 MB of unnecessary files"
