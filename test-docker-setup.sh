#!/bin/bash

# Test Docker Setup for FIXZIT SOUQ Enterprise
echo "🧪 Testing Docker Setup for FIXZIT SOUQ Enterprise"
echo "================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test 1: Check if Docker is running
echo "1. Checking Docker status..."
if docker info >/dev/null 2>&1; then
    print_status "Docker is running"
else
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Test 2: Check if compose file exists
echo "2. Checking compose files..."
if [ -f "docker-compose.local.yml" ]; then
    print_status "docker-compose.local.yml found"
else
    print_error "docker-compose.local.yml not found"
    exit 1
fi

# Test 3: Check if Dockerfile exists
echo "3. Checking Dockerfiles..."
if [ -f "Dockerfile.frontend" ]; then
    print_status "Frontend Dockerfile found"
else
    print_error "Frontend Dockerfile not found"
    exit 1
fi

if [ -f "packages/fixzit-souq-server/Dockerfile" ]; then
    print_status "Backend Dockerfile found"
else
    print_error "Backend Dockerfile not found"
    exit 1
fi

# Test 4: Check if .env file exists
echo "4. Checking environment configuration..."
if [ -f ".env" ]; then
    print_status ".env file found"
else
    print_warning ".env file not found, creating from template..."
    cp .env.example .env
    print_status ".env file created"
fi

# Test 5: Validate compose file syntax
echo "5. Validating compose file syntax..."
if docker compose -f docker-compose.local.yml config >/dev/null 2>&1; then
    print_status "Compose file syntax is valid"
else
    print_error "Compose file syntax is invalid"
    exit 1
fi

# Test 6: Check port availability
echo "6. Checking port availability..."
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $1 is in use"
        return 1
    else
        print_status "Port $1 is available"
        return 0
    fi
}

ports_available=true
check_port 3000 || ports_available=false
check_port 5000 || ports_available=false
check_port 27017 || ports_available=false

if [ "$ports_available" = false ]; then
    print_warning "Some ports are in use. The startup script will attempt to free them."
fi

# Test 7: Check if required directories exist
echo "7. Checking required directories..."
mkdir -p database/init
mkdir -p nginx/ssl
mkdir -p logs
print_status "Required directories created"

# Test 8: Check file permissions
echo "8. Checking file permissions..."
if [ -x "start-docker.sh" ]; then
    print_status "start-docker.sh is executable"
else
    print_warning "Making start-docker.sh executable..."
    chmod +x start-docker.sh
    print_status "start-docker.sh is now executable"
fi

echo ""
echo "🎉 Docker setup validation complete!"
echo "=================================="
echo ""
print_status "All checks passed! You can now run:"
echo "  ./start-docker.sh"
echo ""
print_info "Or manually run:"
echo "  docker compose -f docker-compose.local.yml up --build"
echo ""
print_info "Access URLs after startup:"
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:5000"
echo "  MongoDB:  localhost:27017"