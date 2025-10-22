#!/bin/bash

# Bash script to update remaining database connections
# This handles bracket notation in file paths properly

files=(
    "/workspaces/Fixzit/app/api/work-orders/[id]/comments/route.ts"
    "/workspaces/Fixzit/app/api/work-orders/[id]/materials/route.ts"  
    "/workspaces/Fixzit/app/api/work-orders/[id]/checklists/route.ts"
    "/workspaces/Fixzit/app/api/work-orders/[id]/checklists/toggle/route.ts"
    "/workspaces/Fixzit/app/api/work-orders/[id]/assign/route.ts"
    "/workspaces/Fixzit/app/api/work-orders/[id]/status/route.ts"
    "/workspaces/Fixzit/app/api/vendors/[id]/route.ts"
    "/workspaces/Fixzit/app/api/properties/[id]/route.ts"
    "/workspaces/Fixzit/app/api/assets/[id]/route.ts"
    "/workspaces/Fixzit/app/api/cms/pages/[slug]/route.ts"
    "/workspaces/Fixzit/app/api/projects/[id]/route.ts"
    "/workspaces/Fixzit/app/api/ats/applications/[id]/route.ts"
    "/workspaces/Fixzit/app/api/ats/jobs/[id]/apply/route.ts"
    "/workspaces/Fixzit/app/api/ats/jobs/[id]/publish/route.ts"
    "/workspaces/Fixzit/app/api/rfqs/[id]/publish/route.ts"
    "/workspaces/Fixzit/app/api/rfqs/[id]/bids/route.ts"
    "/workspaces/Fixzit/app/api/support/tickets/[id]/route.ts"
    "/workspaces/Fixzit/app/api/support/tickets/[id]/reply/route.ts"
)

updated=0
errors=0

for file in "${files[@]}"; do
    echo "Processing: $file"
    
    if [ -f "$file" ]; then
        # Create backup
        cp "$file" "$file.bak"
        
        # Replace import statements
        sed -i 's/import { connectDb } from "@\/src\/lib\/mongo";/import { connectToDatabase } from "@\/src\/lib\/mongodb-unified";/g' "$file"
        
        # Replace function calls
        sed -i 's/await connectDb()/await connectToDatabase()/g' "$file"
        sed -i 's/connectDb()/connectToDatabase()/g' "$file"
        
        echo "✅ Updated: $file"
        ((updated++))
    else
        echo "⚠️ File not found: $file"
        ((errors++))
    fi
done

echo ""
echo "=== SUMMARY ==="
echo "Updated: $updated files"
echo "Errors: $errors files"