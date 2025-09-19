#!/bin/bash
# Launch script for Next.js enterprise app

echo "🚀 Setting up Fixzit Enterprise Web App..."

cd fixzit-monorepo-enterprise/web

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Next.js app ready at fixzit-monorepo-enterprise/web"
echo "Run 'npm run dev' in that directory to start the Next.js app"