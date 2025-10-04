# fix-imports.ps1 - Automated @/src/ to @/lib/ migration
$files = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Exclude node_modules | Where-Object { (Get-Content $_.FullName -Raw) -match "@/src/" }

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Replace @/src/lib/ with @/lib/
    $content = $content -replace '@/src/lib/', '@/lib/'
    
    # Replace @/src/server/ with @/server/
    $content = $content -replace '@/src/server/', '@/server/'
    
    # Replace @/src/models/ with @/models/
    $content = $content -replace '@/src/models/', '@/models/'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content
        $count++
        Write-Host "  ✓ Fixed: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`n✅ Fixed $count files" -ForegroundColor Green
