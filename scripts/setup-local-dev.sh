#!/bin/bash
# Fixzit Local Development Setup Script for MacBook Pro
# This script automates the setup process for local development

set -e  # Exit on error

echo "🚀 Fixzit Local Development Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check Node.js version
echo "Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_success "Node.js $(node -v) installed"
    else
        print_warning "Node.js version is too old. Need v18 or higher."
        print_info "Install with: brew install node@18"
        exit 1
    fi
else
    print_error "Node.js not found!"
    print_info "Install with: brew install node"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    print_success "npm $(npm -v) installed"
else
    print_error "npm not found!"
    exit 1
fi

# Check if already in project directory
if [ -f "package.json" ]; then
    print_info "Already in project directory"
else
    print_error "Not in project directory! Please cd to Fixzit directory first."
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if npm install; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check for .env.local
echo ""
if [ -f ".env.local" ]; then
    print_success ".env.local exists"
else
    print_warning ".env.local not found"
    print_info "Creating from template..."
    if [ -f "env.example" ]; then
        cp env.example .env.local
        print_success "Created .env.local from template"
        print_warning "Please edit .env.local with your actual values"
    else
        print_error "env.example not found!"
    fi
fi

# Check for Docker (for MongoDB)
echo ""
if command -v docker &> /dev/null; then
    print_success "Docker $(docker --version | cut -d' ' -f3) installed"
    
    # Check if MongoDB is running
    if docker ps | grep -q mongodb; then
        print_success "MongoDB container is running"
    else
        print_info "Starting MongoDB container..."
        if docker-compose up -d mongodb 2>/dev/null; then
            print_success "MongoDB started"
        else
            print_warning "Could not start MongoDB with docker-compose"
            print_info "You may need to start it manually"
        fi
    fi
else
    print_warning "Docker not found"
    print_info "Install with: brew install docker"
    print_info "Or install MongoDB directly: brew install mongodb-community"
fi

# System information
echo ""
echo "💻 System Information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CPU Cores:    $(sysctl -n hw.ncpu 2>/dev/null || echo 'Unknown')"
echo "Total RAM:    $(sysctl -n hw.memsize 2>/dev/null | awk '{print $1/1024/1024/1024 " GB"}' || echo 'Unknown')"
echo "Node.js:      $(node -v)"
echo "npm:          $(npm -v)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Build test
echo ""
read -p "Would you like to test the production build? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🏗️  Running production build test..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    START_TIME=$(date +%s)
    
    if npm run build; then
        END_TIME=$(date +%s)
        BUILD_TIME=$((END_TIME - START_TIME))
        
        echo ""
        print_success "Build completed successfully!"
        echo ""
        echo "⏱️  Build Time: ${BUILD_TIME} seconds"
        
        if [ "$BUILD_TIME" -lt 30 ]; then
            print_success "Excellent! Build time under 30 seconds ✨"
        elif [ "$BUILD_TIME" -lt 45 ]; then
            print_success "Good! Build time under 45 seconds"
        else
            print_warning "Build took longer than expected"
        fi
        
        echo ""
        read -p "Start production server now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Starting production server on http://localhost:3000"
            print_info "Press Ctrl+C to stop"
            npm start
        fi
    else
        print_error "Build failed!"
        echo ""
        print_info "Check the error messages above"
        print_info "Common issues:"
        print_info "  - Missing environment variables in .env.local"
        print_info "  - MongoDB not running"
        print_info "  - TypeScript errors"
        exit 1
    fi
fi

echo ""
print_success "Setup complete! 🎉"
echo ""
echo "📝 Quick Commands:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo "  npm start            - Run production build"
echo "  npm run typecheck    - Check TypeScript"
echo "  npm run lint         - Run ESLint"
echo "  npm run test         - Run tests"
echo ""
print_info "Next steps:"
echo "  1. Edit .env.local with your actual values"
echo "  2. Ensure MongoDB is running"
echo "  3. Run 'npm run dev' to start development"
echo ""
