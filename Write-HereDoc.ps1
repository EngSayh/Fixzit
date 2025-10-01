# PowerShell Heredoc Helper Script
param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath,
    [Parameter(Mandatory=$true)]
    [string]$Content
)
$directory = Split-Path -Path $FilePath -Parent
if ($directory -and !(Test-Path -Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
}
$Content | Out-File -FilePath $FilePath -Encoding UTF8 -NoNewline
Write-Host "✅ Successfully wrote to: $FilePath" -ForegroundColor Green
