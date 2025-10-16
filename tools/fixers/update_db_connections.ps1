# PowerShell script to update all remaining database connections

$files = @(
    "/workspaces/Fixzit/app/api/work-orders/[id]/comments/route.ts",
    "/workspaces/Fixzit/app/api/work-orders/[id]/materials/route.ts", 
    "/workspaces/Fixzit/app/api/work-orders/[id]/route.ts",
    "/workspaces/Fixzit/app/api/work-orders/[id]/checklists/route.ts",
    "/workspaces/Fixzit/app/api/work-orders/[id]/checklists/toggle/route.ts",
    "/workspaces/Fixzit/app/api/work-orders/[id]/assign/route.ts",
    "/workspaces/Fixzit/app/api/work-orders/[id]/status/route.ts",
    "/workspaces/Fixzit/app/api/vendors/[id]/route.ts",
    "/workspaces/Fixzit/app/api/qa/health/route.ts",
    "/workspaces/Fixzit/app/api/qa/reconnect/route.ts",
    "/workspaces/Fixzit/app/api/properties/[id]/route.ts",
    "/workspaces/Fixzit/app/api/assets/[id]/route.ts",
    "/workspaces/Fixzit/app/api/cms/pages/[slug]/route.ts",
    "/workspaces/Fixzit/app/api/payments/callback/route.ts",
    "/workspaces/Fixzit/app/api/payments/create/route.ts",
    "/workspaces/Fixzit/app/api/projects/[id]/route.ts",
    "/workspaces/Fixzit/app/api/ats/applications/[id]/route.ts",
    "/workspaces/Fixzit/app/api/ats/jobs/[id]/apply/route.ts",
    "/workspaces/Fixzit/app/api/ats/jobs/[id]/publish/route.ts",
    "/workspaces/Fixzit/app/api/ats/convert-to-employee/route.ts",
    "/workspaces/Fixzit/app/api/ats/moderation/route.ts",
    "/workspaces/Fixzit/app/api/rfqs/[id]/publish/route.ts",
    "/workspaces/Fixzit/app/api/rfqs/[id]/bids/route.ts",
    "/workspaces/Fixzit/app/api/support/tickets/[id]/route.ts",
    "/workspaces/Fixzit/app/api/support/tickets/[id]/reply/route.ts"
)

$updated = 0
$errors = 0

foreach ($file in $files) {
    Write-Host "Processing: $file"
    
    if (Test-Path $file) {
        try {
            # Read content
            $content = Get-Content $file -Raw
            
            # Replace import statements
            $content = $content -replace 'import \{ connectDb \} from "@/src/lib/mongo";', 'import { connectToDatabase } from "@/src/lib/mongodb-unified";'
            $content = $content -replace 'import \{ connectDb \} from ''@/src/lib/mongo'';', 'import { connectToDatabase } from "@/src/lib/mongodb-unified";'
            
            # Replace function calls
            $content = $content -replace 'await connectDb\(\)', 'await connectToDatabase()'
            $content = $content -replace 'connectDb\(\)', 'connectToDatabase()'
            
            # Write back
            Set-Content $file $content -NoNewline
            $updated++
            Write-Host "✅ Updated: $file" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Error updating $file : $_" -ForegroundColor Red
            $errors++
        }
    }
    else {
        Write-Host "⚠️ File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Updated: $updated files" -ForegroundColor Green
Write-Host "Errors: $errors files" -ForegroundColor Red