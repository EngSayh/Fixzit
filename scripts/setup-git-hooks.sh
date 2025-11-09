#!/bin/sh
# Setup git hooks for Fixzit project

echo "🔧 Setting up git hooks..."

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# Pre-commit hook: Run translation audit before committing

echo "🔍 Running translation audit..."

# Run audit and capture output
OUTPUT=$(node scripts/audit-translations.mjs 2>&1)
EXIT_CODE=$?

# Only block on actual gaps (not dynamic keys warning)
# Check if output contains actual errors (missing keys)
if echo "$OUTPUT" | grep -q "Catalog Parity.*❌\|Code Coverage.*❌"; then
  echo "$OUTPUT"
  echo ""
  echo "❌ Translation audit failed!"
  echo "   Please fix translation gaps before committing."
  echo "   Run: node scripts/audit-translations.mjs --fix"
  echo "   Then review and commit the changes."
  echo ""
  echo "To bypass this check (emergency only):"
  echo "   git commit --no-verify"
  exit 1
fi

# Show warning for dynamic keys but don't block
if echo "$OUTPUT" | grep -q "Dynamic Keys.*⚠️"; then
  echo "$OUTPUT"
  echo ""
  echo "⚠️  Warning: Dynamic template literal keys detected"
  echo "   These require manual review to ensure correctness"
  echo "   Proceeding with commit..."
fi

echo ""
echo "✅ Translation audit passed!"
exit 0
EOF

# Make executable
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks installed successfully!"
echo ""
echo "Pre-commit hook will now:"
echo "  - Run translation audit before each commit"
echo "  - Prevent commits if translation gaps detected"
echo "  - Maintain 100% EN-AR parity"
echo ""
echo "To bypass (not recommended): git commit --no-verify"
