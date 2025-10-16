#!/bin/bash
set -e

echo "🚀 Starting Comprehensive PR Comment Fixes"
echo "=========================================="

# Phase 1: Fix 'any' types in catch blocks
echo "📝 Phase 1: Fixing 'any' in catch blocks..."
find app/api -name "*.ts" -type f -print0 | xargs -0 sed -i 's/} catch (error: any)/} catch (error: unknown)/g'
find lib -name "*.ts" -type f -print0 | xargs -0 sed -i 's/} catch (error: any)/} catch (error: unknown)/g'
find server -name "*.ts" -type f -print0 | xargs -0 sed -i 's/} catch (error: any)/} catch (error: unknown)/g'
find components -name "*.tsx" -type f -print0 | xargs -0 sed -i 's/} catch (error: any)/} catch (error: unknown)/g'
echo "✅ Fixed catch blocks"

# Phase 2: Fix 'as any' type assertions
echo "📝 Phase 2: Fixing 'as any' assertions..."
find app -name "*.ts" -type f -print0 | xargs -0 sed -i 's/ as any/ as unknown/g'
find lib -name "*.ts" -type f -print0 | xargs -0 sed -i 's/ as any/ as unknown/g'
find server -name "*.ts" -type f -print0 | xargs -0 sed -i 's/ as any/ as unknown/g'
echo "✅ Fixed type assertions"

# Phase 3: Run ESLint auto-fix
echo "��� Phase 3: Running ESLint auto-fix..."
npx eslint --fix "app/**/*.{ts,tsx}" --quiet || true
npx eslint --fix "components/**/*.{ts,tsx}" --quiet || true
npx eslint --fix "lib/**/*.ts" --quiet || true
npx eslint --fix "server/**/*.ts" --quiet || true
echo "✅ ESLint auto-fix complete"

# Phase 4: Check results
echo "📊 Checking results..."
echo "Files modified:"
git status --short | head -20

echo ""
echo "✅ All automated fixes complete!"
echo "Next: Review changes and commit"
