#!/usr/bin/env pwsh
Write-Host "`n=== GITHUB SECRETS SETUP ===" -ForegroundColor Cyan
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI not installed. Install: https://cli.github.com/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ GitHub CLI found" -ForegroundColor Green
Write-Host "`nReading secrets from .env.local..." -ForegroundColor Yellow
$envContent = Get-Content .env.local
$secrets = @{}
foreach ($line in $envContent) {
    if ($line -match '^([A-Z_]+)=(.+)$') {
        $key = $matches[1]
        $value = $matches[2]
        if ($value -and $value -notmatch 'your_.*_here' -and $value -notmatch '^http://localhost') {
            $secrets[$key] = $value
        }
    }
}
Write-Host "Found $($secrets.Count) secrets" -ForegroundColor Green
Write-Host "`nUploading to GitHub..." -ForegroundColor Yellow
foreach ($key in $secrets.Keys) {
    $value = $secrets[$key]
    # Removed masked logging for security
    try {
        $value | gh secret set $key
        Write-Host "  ✅ Set secret for '$key'" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed: $key" -ForegroundColor Red
    }
}
Write-Host "`n✅ Complete! View at: Settings → Secrets and variables → Actions" -ForegroundColor Green
gh secret list


