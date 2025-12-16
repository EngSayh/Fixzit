#!/usr/bin/env bash
set -euo pipefail

# Inventory & Duplicate Detection Script
# Generates file inventory, export map, and hotspot analysis

OUT_DIR="docs/inventory"
mkdir -p "$OUT_DIR"

echo "🔍 Generating file inventory..."
echo "# File Inventory ($(date -Is))" > "$OUT_DIR/inventory.txt"
git ls-files >> "$OUT_DIR/inventory.txt"
echo "✅ Inventory written to $OUT_DIR/inventory.txt"

echo ""
echo "🔍 Scanning exports..."
if command -v rg &> /dev/null; then
  rg --line-number --no-heading "export (const|function|class|interface|type|default) " \
    -g "!**/*.min.*" -g "!**/node_modules/**" -g "!**/.next/**" > "$OUT_DIR/exports.txt" || true
  echo "✅ Exports written to $OUT_DIR/exports.txt"
else
  echo "⚠️  ripgrep (rg) not found. Skipping export scan."
fi

echo ""
echo "🔍 Scanning payment hotspots..."
if command -v rg &> /dev/null; then
rg --line-number --no-heading "(createPaymentPage|verifyPayment|validateCallback)" \
    -g "!**/node_modules/**" -g "!**/.next/**" -S > "$OUT_DIR/hotspots.txt" || true
  echo "✅ Hotspots written to $OUT_DIR/hotspots.txt"
else
  echo "⚠️  ripgrep (rg) not found. Skipping hotspot scan."
fi

echo ""
echo "🔍 Detecting duplicate filenames..."
git ls-files | xargs -n1 basename | sort | uniq -d > "$OUT_DIR/duplicate-names.txt" || true
echo "✅ Duplicate names written to $OUT_DIR/duplicate-names.txt"

echo ""
echo "📊 Inventory Summary:"
echo "   Files: $(wc -l < "$OUT_DIR/inventory.txt")"
if [ -f "$OUT_DIR/exports.txt" ]; then
  echo "   Exports: $(wc -l < "$OUT_DIR/exports.txt")"
fi
if [ -f "$OUT_DIR/hotspots.txt" ]; then
  echo "   Payment hotspots: $(wc -l < "$OUT_DIR/hotspots.txt")"
fi
if [ -f "$OUT_DIR/duplicate-names.txt" ]; then
  DUPS=$(wc -l < "$OUT_DIR/duplicate-names.txt")
  if [ "$DUPS" -gt 0 ]; then
    echo "   ⚠️  Duplicate filenames: $DUPS"
  else
    echo "   ✅ No duplicate filenames"
  fi
fi

echo ""
echo "✅ Inventory complete!"
