#!/bin/bash

echo "============================================"
echo "CREATING DOWNLOADABLE EXPORT (without .git)"
echo "============================================"
echo ""

EXPORT_NAME="fixzit_export_$(date +%Y%m%d_%H%M%S).tar.gz"

echo "Creating clean export: $EXPORT_NAME"
echo "This will exclude: .git, node_modules, .next, dist, build, __pycache__"
echo ""

tar czf $EXPORT_NAME \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='attached_assets_backup.tar.gz' \
  .

echo ""
echo "✓ Export created: $EXPORT_NAME"
echo "Size: $(du -sh $EXPORT_NAME | cut -f1)"
echo ""
echo "You can now download this file!"