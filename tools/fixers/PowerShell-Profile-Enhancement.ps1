function Write-HereString {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Path $Path -Parent
    if ($dir -and !(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $Content | Set-Content -Path $Path -Encoding UTF8
    Write-Host "✅ Wrote: $Path" -ForegroundColor Green
}
Set-Alias -Name heredoc -Value Write-HereString
Write-Host "✅ PowerShell heredoc functions loaded" -ForegroundColor Cyan
