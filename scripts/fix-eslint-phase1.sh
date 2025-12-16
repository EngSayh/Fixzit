#!/bin/bash
# ============================================================================
# ABSOLUTE PERFECTION: Fix ALL ESLint Warnings - Phase 1
# Fix unused variables and escape characters
# ============================================================================

set -e

echo "🎯 FIXING ESLINT WARNINGS - PHASE 1: Unused Variables & Escapes"
echo "================================================================="

# Fix unused 'err' variables in catch blocks
echo "Fixing unused error variables..."
find app/api -name "*.ts" -type f -exec sed -i 's/} catch (err) {/} catch (_err) {/g' {} \; 2>/dev/null || true
find app/api -name "*.ts" -type f -exec sed -i 's/} catch (e) {/} catch (_e) {/g' {} \; 2>/dev/null || true
find lib -name "*.ts" -type f -exec sed -i 's/} catch (err) {/} catch (_err) {/g' {} \; 2>/dev/null || true

# Fix specific unused variables
echo "Fixing specific unused variables..."
[ -f app/api/ats/moderation/route.ts ] && sed -i 's/const user = await/const _user = await/g' app/api/ats/moderation/route.ts
[ -f app/api/ats/jobs/\\[id\\]/publish/route.ts ] && sed -i 's/const userId = /const _userId = /g' "app/api/ats/jobs/[id]/publish/route.ts"
[ -f app/api/billing/charge-recurring/route.ts ] && sed -i 's/const client = /const _client = /g' app/api/billing/charge-recurring/route.ts

# Fix escape characters
echo "Fixing unnecessary escape characters..."
[ -f lib/utils/timestamp.ts ] && sed -i 's/\\!/!/g' lib/utils/timestamp.ts

# Remove @ts-nocheck
echo "Removing @ts-nocheck comments..."
[ -f src/server/models/SearchSynonym.ts ] && sed -i '/^\/\/ @ts-nocheck/d; /^\/\/@ts-nocheck/d' src/server/models/SearchSynonym.ts

echo "✅ Phase 1 Complete!"
echo ""
echo "Running lint to check progress..."
npm run lint 2>&1 | grep -E "Warning:|✖" | tail -5
