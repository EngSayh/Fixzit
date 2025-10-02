# Fix all test files that need async params for Next.js 15

$testFiles = @(
  "/workspaces/Fixzit/app/api/marketplace/products/[slug]/route.test.ts",
  "/workspaces/Fixzit/app/product/[slug]/__tests__/page.spec.tsx"
)

foreach ($file in $testFiles) {
  if (Test-Path -LiteralPath $file) {
    $content = Get-Content -LiteralPath $file -Raw
    
    # Fix pattern: params: { slug: value } -> params: Promise.resolve({ slug: value })
    $content = $content -replace "params:\s*\{\s*slug:\s*'([^']+)'\s*\}", "params: Promise.resolve({ slug: '$1' })"
    $content = $content -replace "params:\s*\{\s*slug:\s*`"([^`"]+)`"\s*\}", "params: Promise.resolve({ slug: `"$1`" })"
    
    Set-Content -LiteralPath $file -Value $content -NoNewline
    Write-Host "Fixed: $file"
  } else {
    Write-Host "Not found: $file"
  }
}

Write-Host "`nAll test files fixed!"
