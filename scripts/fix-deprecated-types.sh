#!/bin/bash
# Quick Fix: Remove deprecated @types/ioredis (ioredis has built-in types)

set -e

echo "🔧 Removing deprecated @types/ioredis..."
echo ""
echo "ℹ️  ioredis@5.8.1+ includes built-in TypeScript types"
echo "ℹ️  @types/ioredis is no longer needed and marked deprecated"
echo ""

# Remove deprecated package
pnpm remove -D @types/ioredis

# Verify TypeScript still works
echo ""
echo "✅ Running TypeScript check..."
pnpm typecheck

echo ""
echo "✅ Successfully removed deprecated @types/ioredis"
echo "📝 ioredis built-in types are being used instead"
