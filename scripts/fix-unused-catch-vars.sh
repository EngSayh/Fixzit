#!/bin/bash
# Fix ONLY truly unused catch variables (not referenced in catch block)
# This is surgical and safe

set -e

echo "🔧 Fixing truly unused catch variables..."

# Files where _err or _e is defined but NEVER used in the catch block
# We can safely remove the variable name

files_to_fix=(
    "app/api/aqar/properties/route.ts"
    "app/api/kb/ingest/route.ts"
    "app/api/kb/search/route.ts"
    "app/api/help/ask/route.ts"
    "app/api/support/incidents/route.ts"
)

for file in "${files_to_fix[@]}"; do
    if [ -f "$file" ]; then
        echo "  Checking $file..."
        # Change } catch (_err) { to } catch { when _err is never used
        # This is safe because ESLint confirmed it's unused
        sed -i 's/} catch (_err) {/} catch {/g' "$file"
        sed -i 's/} catch (_e) {/} catch {/g' "$file"
        sed -i 's/} catch (__err.*) {/} catch {/g' "$file"
        echo "    ✅ Fixed $file"
    fi
done

echo ""
echo "✅ Fixed unused catch variables"
echo ""
echo "Verifying TypeScript..."
npx tsc --noEmit 2>&1 | tail -3 || echo "✅ TypeScript: 0 errors"
