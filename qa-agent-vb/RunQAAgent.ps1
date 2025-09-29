# Fixzit Quality Assurance Agent - Build and Run Script
# PowerShell script for building and executing the VB.NET QA Agent

param(
    [Parameter(Mandatory=$false)]
    [string]$Command = "analyze",
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = "/workspaces/Fixzit",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "qa-reports",
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose,
    
    [Parameter(Mandatory=$false)]
    [switch]$Clean,
    
    [Parameter(Mandatory=$false)]
    [switch]$Install
)

# Colors for output
$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Blue = [System.ConsoleColor]::Blue
$Cyan = [System.ConsoleColor]::Cyan

function Write-ColorOutput {
    param($Message, $Color = [System.ConsoleColor]::White)
    Write-Host $Message -ForegroundColor $Color
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 Checking prerequisites..." $Blue
    
    # Check .NET 8.0
    try {
        $dotnetVersion = dotnet --version
        if ($dotnetVersion -like "8.*") {
            Write-ColorOutput "✅ .NET 8.0 SDK found: $dotnetVersion" $Green
        } else {
            Write-ColorOutput "❌ .NET 8.0 SDK required, found: $dotnetVersion" $Red
            return $false
        }
    } catch {
        Write-ColorOutput "❌ .NET SDK not found. Please install .NET 8.0 SDK" $Red
        return $false
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-ColorOutput "✅ Node.js found: $nodeVersion" $Green
    } catch {
        Write-ColorOutput "⚠️  Node.js not found - E2E testing may fail" $Yellow
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-ColorOutput "✅ npm found: $npmVersion" $Green
    } catch {
        Write-ColorOutput "⚠️  npm not found - build verification may fail" $Yellow
    }
    
    return $true
}

function Install-Dependencies {
    Write-ColorOutput "📦 Installing dependencies..." $Blue
    
    # Restore .NET packages
    Write-ColorOutput "   Restoring .NET packages..." $Cyan
    dotnet restore QualityAssuranceAgent.sln
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ Failed to restore .NET packages" $Red
        exit 1
    }
    
    # Install Playwright browsers
    Write-ColorOutput "   Installing Playwright browsers..." $Cyan
    dotnet run --project QualityAssuranceAgent.Console -- init --project $ProjectPath
    
    Write-ColorOutput "✅ Dependencies installed successfully" $Green
}

function Build-Solution {
    Write-ColorOutput "🏗️  Building QA Agent solution..." $Blue
    
    $buildArgs = @("build", "QualityAssuranceAgent.sln")
    if ($Verbose) {
        $buildArgs += "--verbosity", "detailed"
    }
    
    & dotnet @buildArgs
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ Build failed" $Red
        exit 1
    }
    
    Write-ColorOutput "✅ Build completed successfully" $Green
}

function Clean-Solution {
    Write-ColorOutput "🧹 Cleaning solution..." $Blue
    
    dotnet clean QualityAssuranceAgent.sln
    
    # Remove output directories
    if (Test-Path "bin") { Remove-Item -Recurse -Force "bin" }
    if (Test-Path "obj") { Remove-Item -Recurse -Force "obj" }
    if (Test-Path $OutputPath) { Remove-Item -Recurse -Force $OutputPath }
    
    Write-ColorOutput "✅ Solution cleaned" $Green
}

function Run-QAAgent {
    param($Command, $ProjectPath, $OutputPath, $Verbose)
    
    Write-ColorOutput "🚀 Running Fixzit Quality Assurance Agent..." $Blue
    Write-ColorOutput "   Command: $Command" $Cyan
    Write-ColorOutput "   Project: $ProjectPath" $Cyan
    Write-ColorOutput "   Output: $OutputPath" $Cyan
    
    # Build run arguments
    $runArgs = @(
        "run", 
        "--project", "QualityAssuranceAgent.Console",
        "--",
        $Command,
        "--project", $ProjectPath,
        "--output", $OutputPath
    )
    
    if ($Verbose) {
        $runArgs += "--verbose"
    }
    
    # Execute the QA Agent
    $startTime = Get-Date
    & dotnet @runArgs
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ QA Agent completed successfully in $($duration.TotalMinutes.ToString('F2')) minutes" $Green
        
        # Show report locations
        if (Test-Path $OutputPath) {
            Write-ColorOutput "📊 Reports generated:" $Blue
            Get-ChildItem $OutputPath -File | ForEach-Object {
                Write-ColorOutput "   📋 $($_.FullName)" $Cyan
            }
        }
    } else {
        Write-ColorOutput "❌ QA Agent failed with exit code: $LASTEXITCODE" $Red
        exit 1
    }
}

function Show-Help {
    Write-ColorOutput @"
🎯 Fixzit Quality Assurance Agent - PowerShell Runner

USAGE:
    .\RunQAAgent.ps1 [OPTIONS]

COMMANDS:
    analyze      Run comprehensive quality analysis (default)
    build        Run build verification only
    e2e          Run E2E tests only
    incremental  Run incremental analysis
    init         Generate default configuration

OPTIONS:
    -Command <string>     QA command to run (default: analyze)
    -ProjectPath <string> Path to project to analyze (default: /workspaces/Fixzit)
    -OutputPath <string>  Output directory for reports (default: qa-reports)
    -Verbose              Enable verbose logging
    -Clean                Clean solution before building
    -Install              Install dependencies and Playwright browsers

EXAMPLES:
    # Run full analysis
    .\RunQAAgent.ps1

    # Run build verification only with verbose output
    .\RunQAAgent.ps1 -Command build -Verbose

    # Run E2E tests with custom output path
    .\RunQAAgent.ps1 -Command e2e -OutputPath "test-results"

    # Clean and rebuild solution
    .\RunQAAgent.ps1 -Clean

    # Install dependencies
    .\RunQAAgent.ps1 -Install

REPORTS:
    Generated reports will be available in the output directory:
    - qa-report.html     - Interactive HTML dashboard
    - qa-report.json     - Machine-readable results
    - executive-summary.txt - High-level summary
    - e2e-test-report-*.html - E2E test results

REQUIREMENTS:
    - .NET 8.0 SDK
    - Node.js 18+ (for build verification and E2E testing)
    - npm (for dependency management)

For more information, see README.md
"@ $Blue
}

# Main execution logic
try {
    Write-ColorOutput @"
🎯 ===============================================
   Fixzit Quality Assurance Agent (VB.NET)
   Comprehensive Automated Testing & Analysis
===============================================
"@ $Blue

    # Handle help
    if ($args -contains "-h" -or $args -contains "--help" -or $args -contains "help") {
        Show-Help
        exit 0
    }

    # Change to script directory
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    if ($scriptDir) {
        Set-Location $scriptDir
    }

    # Check prerequisites
    if (-not (Test-Prerequisites)) {
        exit 1
    }

    # Clean if requested
    if ($Clean) {
        Clean-Solution
    }

    # Install dependencies if requested
    if ($Install) {
        Install-Dependencies
    }

    # Build solution
    Build-Solution

    # Run QA Agent
    Run-QAAgent -Command $Command -ProjectPath $ProjectPath -OutputPath $OutputPath -Verbose:$Verbose

    Write-ColorOutput @"

🎉 ===============================================
   QA Agent execution completed successfully!
   
   Next steps:
   1. Review generated reports in $OutputPath
   2. Address any critical or high-priority issues
   3. Re-run analysis to verify fixes
   
   For CI/CD integration, see README.md
===============================================
"@ $Green

} catch {
    Write-ColorOutput "💥 Unexpected error occurred:" $Red
    Write-ColorOutput $_.Exception.Message $Red
    Write-ColorOutput $_.ScriptStackTrace $Yellow
    exit 1
}