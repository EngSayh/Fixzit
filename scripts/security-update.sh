#!/bin/bash
# Security Update Script for Fixzit
# Updates all packages with known security fixes

set -e

echo "🔒 Starting Security Update Process..."
echo ""

# 1. Core Security Updates
echo "📦 Updating core dependencies with security fixes..."
pnpm update axios@latest
pnpm update mongoose@latest

# 2. AWS SDK Security Updates
echo "☁️ Updating AWS SDK packages..."
pnpm update @aws-sdk/client-s3@latest
pnpm update @aws-sdk/client-secrets-manager@latest
pnpm update @aws-sdk/s3-request-presigner@latest

# 3. Babel Security Patches
echo "🛠️ Updating Babel toolchain..."
pnpm update @babel/parser@latest
pnpm update @babel/preset-env@latest
pnpm update @babel/traverse@latest
pnpm update @babel/preset-react@latest
pnpm update @babel/preset-typescript@latest

# 4. Type definitions
echo "📝 Updating type definitions..."
pnpm update @types/qrcode@latest
pnpm update @types/node@latest

# 5. ESLint and dev tooling
echo "🔧 Updating ESLint and dev tooling..."
pnpm update eslint@latest
pnpm update eslint-config-next@latest
pnpm update eslint-plugin-unused-imports@latest

# 6. Testing tools
echo "🧪 Updating testing dependencies..."
pnpm update puppeteer@latest
pnpm update jsdom@latest
pnpm update @vitest/coverage-v8@latest

# 7. Run security audit
echo ""
echo "🔍 Running security audit..."
pnpm audit

# 8. Verify build
echo ""
echo "✅ Verifying build after updates..."
pnpm typecheck

echo ""
echo "✅ Security updates completed successfully!"
echo "📊 Run 'git diff package.json' to review changes"
echo "🚀 Commit with: git commit -m 'chore(deps): security updates and package maintenance'"
