#!/bin/bash
# Fix Terminal Script - Remove corrupted PowerShell

echo "🔧 Fixing Terminal Configuration..."
echo ""

# Remove corrupted PowerShell
echo "1. Removing corrupted PowerShell..."
sudo rm -f /usr/local/bin/pwsh 2>/dev/null && echo "   ✅ Removed /usr/local/bin/pwsh" || echo "   ℹ️  Already removed"
sudo rm -rf /usr/local/microsoft/powershell 2>/dev/null && echo "   ✅ Removed PowerShell directory" || echo "   ℹ️  Already removed"
sudo rm -rf /opt/microsoft/powershell 2>/dev/null && echo "   ✅ Cleaned /opt/microsoft" || echo "   ℹ️  Already clean"

echo ""
echo "2. Verifying bash is available..."
which bash && echo "   ✅ Bash found at: $(which bash)"

echo ""
echo "3. Testing bash..."
bash -c 'echo "   ✅ Bash works!"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Terminal fixed! Close all terminals and open a new one."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Close ALL existing terminals"
echo "  2. Press Ctrl+Shift+\` to open a NEW terminal"
echo "  3. You should see bash without errors"
echo ""
