# Fixzit Development Server Startup Script
# Handles OneDrive file locking issues

Write-Host "🚀 Starting Fixzit Development Server..." -ForegroundColor Cyan

# Set environment variables
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NODE_ENV = "development"

# MongoDB Configuration - Use mock database for development
$env:MONGODB_URI = ""
$env:MONGODB_DB = "fixzit"
$env:ENABLE_MOCK_DB = "true"

# Disable QA Agent for now
$env:NEXT_PUBLIC_QA_AGENT = "0"

# Start the development server
npm run dev
