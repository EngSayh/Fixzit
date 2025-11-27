#!/bin/bash
set -e

echo "🔧 Fixzit Development Setup"
echo "============================="

# Check Node version
echo "📋 Checking Node.js version..."
node --version

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install || npm install

# Setup database
echo "🗄️ Setting up MongoDB connection..."
# Note: Fixzit uses MongoDB with Mongoose (not Prisma/PostgreSQL)
# Ensure MONGODB_URI is set in your .env.local file
# Example: MONGODB_URI=mongodb://localhost:27017/fixzit

# Create logs directory
mkdir -p logs

# Make scripts executable
chmod +x scripts/dev-server-keepalive.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Start the server:"
echo "   pnpm dev"
echo ""
echo "📊 With auto-restart:"
echo "   bash scripts/dev-server-keepalive.sh"
echo ""
echo "🛑 Stop server:"
echo "   pm2 stop fixzit-dev"
