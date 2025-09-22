# Fixzit Development Server Startup Script
# Handles OneDrive file locking issues

Write-Host "🚀 Starting Fixzit Development Server..." -ForegroundColor Cyan

# Set environment variables
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NODE_ENV = "development"

# Disable QA Agent for now
$env:NEXT_PUBLIC_QA_AGENT = "0"

# Start the development server
npm run dev
