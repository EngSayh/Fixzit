#!/bin/bash

# GitHub Self-Hosted Runner Setup Script for Fixzit
# This script helps you set up a self-hosted runner to bypass GitHub Actions minutes limitations

set -e

echo "========================================="
echo "GitHub Self-Hosted Runner Setup for Fixzit"
echo "========================================="
echo ""
echo "This script will help you set up a self-hosted runner to run CI/CD workflows"
echo "without consuming GitHub Actions minutes."
echo ""

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    RUNNER_OS="osx"
    RUNNER_ARCH="x64"
    if [[ $(uname -m) == "arm64" ]]; then
        RUNNER_ARCH="arm64"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    RUNNER_OS="linux"
    RUNNER_ARCH="x64"
    if [[ $(uname -m) == "aarch64" ]]; then
        RUNNER_ARCH="arm64"
    fi
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

echo "Detected OS: $RUNNER_OS-$RUNNER_ARCH"
echo ""

# Create runner directory
RUNNER_DIR="$HOME/actions-runner"
echo "📁 Creating runner directory at: $RUNNER_DIR"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Download latest runner
RUNNER_VERSION="2.321.0"
RUNNER_FILE="actions-runner-${RUNNER_OS}-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_FILE}"

echo "📥 Downloading GitHub Actions Runner v${RUNNER_VERSION}..."
curl -o "$RUNNER_FILE" -L "$RUNNER_URL"

echo "📦 Extracting runner..."
tar xzf "$RUNNER_FILE"
rm "$RUNNER_FILE"

echo ""
echo "========================================="
echo "MANUAL STEPS REQUIRED:"
echo "========================================="
echo ""
echo "1. Go to: https://github.com/EngSayh/Fixzit/settings/actions/runners/new"
echo ""
echo "2. Select your OS and architecture, then copy the token from the configuration command"
echo "   It will look like: --token XXXXXXXXXXXXXXXXXXXXXXXXXX"
echo ""
echo "3. Run this configuration command:"
echo ""
echo "   cd $RUNNER_DIR"
echo "   ./config.sh --url https://github.com/EngSayh/Fixzit --token YOUR_TOKEN_HERE"
echo ""
echo "4. Start the runner:"
echo "   ./run.sh"
echo ""
echo "5. Update your workflows to use the self-hosted runner:"
echo "   Change: runs-on: ubuntu-22.04"
echo "   To:     runs-on: self-hosted"
echo ""
echo "========================================="
echo "OPTIONAL: Install as a service (auto-start)"
echo "========================================="
echo ""
if [[ "$RUNNER_OS" == "osx" ]]; then
    echo "On macOS:"
    echo "   cd $RUNNER_DIR"
    echo "   ./svc.sh install"
    echo "   ./svc.sh start"
elif [[ "$RUNNER_OS" == "linux" ]]; then
    echo "On Linux:"
    echo "   cd $RUNNER_DIR"
    echo "   sudo ./svc.sh install"
    echo "   sudo ./svc.sh start"
fi
echo ""
echo "========================================="
echo "IMPORTANT NOTES:"
echo "========================================="
echo ""
echo "✅ Self-hosted runners provide UNLIMITED minutes"
echo "✅ Your machine needs to be online for workflows to run"
echo "✅ Install Node.js 20, pnpm, and other dependencies on the runner machine"
echo "✅ The runner will appear in: Settings > Actions > Runners"
echo ""
echo "For more details, visit:"
echo "https://docs.github.com/en/actions/hosting-your-own-runners"