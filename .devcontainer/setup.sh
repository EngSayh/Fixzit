#!/bin/bash
set -e

echo "🚀 Setting up Fixzit development environment..."

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install || echo "⚠️  npm install failed, continuing..."
fi

# Set up git safe directory
git config --global --add safe.directory /workspaces/Fixzit

echo "✅ Development environment setup complete!"
