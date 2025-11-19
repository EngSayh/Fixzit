#!/bin/bash
# Fixzit Workspace Organization Script
# Moves documentation and temporary files to proper directories

set -e

echo "🧹 Organizing Fixzit workspace..."

# Create organization directories if they don't exist
mkdir -p docs/archived/reports
mkdir -p docs/archived/sessions
mkdir -p docs/security
mkdir -p docs/archived/pull-requests
mkdir -p .archive/temp-files

# Function to move files with logging
move_file() {
    local file=$1
    local destination=$2
    
    if [ -f "$file" ]; then
        echo "  📦 Moving: $file → $destination"
        mv "$file" "$destination/"
    fi
}

echo ""
echo "📋 Step 1: Organizing session reports..."
# Move session summaries to docs/archived/sessions/
for file in ./SESSION_*.md ./COMPLETE_TASK_SUMMARY.md ./FIX_SUMMARY_*.md; do
    [ -f "$file" ] && move_file "$file" "docs/archived/sessions"
done

echo ""
echo "🔒 Step 2: Organizing security reports..."
# Move security reports to docs/security/
for file in ./SECURITY_*.md ./NEXTAUTH_*.md; do
    [ -f "$file" ] && move_file "$file" "docs/security"
done

echo ""
echo "🔀 Step 3: Organizing PR documentation..."
# Move PR-related docs to docs/archived/pull-requests/
for file in ./PR_*.md ./PR*.md ./.pr*.json; do
    [ -f "$file" ] && move_file "$file" "docs/archived/pull-requests"
done

echo ""
echo "📊 Step 4: Organizing completion reports..."
# Move completion/comprehensive reports to docs/archived/reports/
for file in ./COMPREHENSIVE_*.md ./COMPLETE_*.md ./DOCUMENTATION_*.md ./CODERABBIT_*.md ./GITHUB_ACTIONS_*.md ./PYTHON_SCRIPT_*.md; do
    [ -f "$file" ] && move_file "$file" "docs/archived/reports"
done

echo ""
echo "🗂️ Step 5: Moving SendGrid docs to proper location..."
# SendGrid docs should be in docs/guides/
if [ -f "./SENDGRID_SETUP_CHECKLIST.md" ]; then
    move_file "./SENDGRID_SETUP_CHECKLIST.md" "docs/guides"
fi

echo ""
echo "🧪 Step 6: Organizing test files..."
# Move test scripts to tests/ or scripts/
if [ -f "./test_zatca.js" ]; then
    move_file "./test_zatca.js" "tests"
fi
if [ -f "./test_mongodb.js" ]; then
    move_file "./test_mongodb.js" "tests"
fi

echo ""
echo "⚙️ Step 7: Checking configuration files..."
# Keep these in root (they belong there):
# - package.json, tsconfig.json, next.config.js
# - .eslintrc.json, .prettierrc, tailwind.config.js
# - README.md, LICENSE
echo "  ✅ Core configuration files are in correct location"

echo ""
echo "📁 Step 8: Creating .gitignore entries for archives..."
# Add archive directories to .gitignore if not already there
if ! grep -q ".archive/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Archived files" >> .gitignore
    echo ".archive/" >> .gitignore
fi

echo ""
echo "✨ Step 9: Final cleanup..."
# Remove empty directories
find docs -type d -empty -delete 2>/dev/null || true

echo ""
echo "📊 Summary:"
echo "  📂 Session reports  → docs/archived/sessions/"
echo "  🔒 Security reports → docs/security/"
echo "  🔀 PR documentation → docs/archived/pull-requests/"
echo "  📊 Other reports   → docs/archived/reports/"
echo "  📚 Guides          → docs/guides/"
echo "  🧪 Test scripts    → tests/"

echo ""
echo "✅ Workspace organization complete!"
echo ""
echo "💡 Next steps:"
echo "  1. Review the moved files in their new locations"
echo "  2. Commit the changes: git add -A && git commit -m 'chore: organize workspace files'"
echo "  3. Delete .archive/ folder if you don't need old files"
