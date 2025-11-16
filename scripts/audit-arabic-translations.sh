#!/bin/bash
# Script to find hardcoded Arabic text and suggest translation keys

echo "=== Scanning for Hardcoded Arabic Text in React Components ==="
echo ""

# Find all TypeScript/TSX files with Arabic characters
find app components services -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -Hn "[\u0600-\u06FF]" {} \; 2>/dev/null | \
  grep -v "node_modules" | \
  grep -v ".next" | \
  grep -v "TranslationContext" | \
  grep -v "i18n/dictionaries" | \
  head -100 > /tmp/arabic_text_audit.txt

echo "Found $(wc -l < /tmp/arabic_text_audit.txt) lines with Arabic text"
echo ""
echo "Sample findings:"
head -20 /tmp/arabic_text_audit.txt

echo ""
echo "Full audit saved to: /tmp/arabic_text_audit.txt"
echo ""
echo "=== Common Patterns ==="
echo ""
echo "1. Hardcoded strings (should use translation keys):"
grep -E "(\"|\').*[\u0600-\u06FF].*(\"|\')" /tmp/arabic_text_audit.txt | head -10

echo ""
echo "2. Component titles/headers:"
grep -E "<h[1-6]|<title|<label" /tmp/arabic_text_audit.txt | head -10

echo ""
echo "=== Recommendation ==="
echo "Replace hardcoded Arabic with:"
echo "  const { t } = useTranslation();"
echo "  <div>{t('key.path.here')}</div>"
