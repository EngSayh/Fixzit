#!/bin/bash

# FIXZIT SOUQ Enterprise - Docker Startup Script
# Version: 2.0.26

set -e

echo "🚀 FIXZIT SOUQ Enterprise - Docker Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $1 is already in use. Attempting to free it..."
        sudo kill -9 $(lsof -t -i:$1) 2>/dev/null || true
        sleep 2
    fi
}

print_info "Checking port availability..."
check_port 3000
check_port 5000
check_port 27017
check_port 80

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_info "Creating .env file from template..."
    cp .env.example .env
    print_status "Environment file created"
fi

# Create necessary directories
print_info "Creating necessary directories..."
mkdir -p database/init
mkdir -p nginx/ssl
mkdir -p logs

# Set proper permissions
print_info "Setting file permissions..."
chmod +x start-docker.sh
chmod 755 database/init
chmod 755 nginx

# Choose deployment mode
echo ""
echo "Select deployment mode:"
echo "1) Local Development (docker-compose.local.yml)"
echo "2) Production (docker-compose.prod.yml)"
echo "3) Custom (specify compose file)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        COMPOSE_FILE="docker-compose.local.yml"
        print_info "Starting local development environment..."
        ;;
    2)
        COMPOSE_FILE="docker-compose.prod.yml"
        print_warning "Starting production environment..."
        print_warning "Make sure to configure production environment variables!"
        ;;
    3)
        read -p "Enter compose file path: " COMPOSE_FILE
        if [ ! -f "$COMPOSE_FILE" ]; then
            print_error "Compose file not found: $COMPOSE_FILE"
            exit 1
        fi
        print_info "Using custom compose file: $COMPOSE_FILE"
        ;;
    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Stop existing containers
print_info "Stopping existing containers..."
docker compose -f $COMPOSE_FILE down 2>/dev/null || true

# Remove old images (optional)
read -p "Remove old images to force rebuild? (y/N): " remove_images
if [[ $remove_images =~ ^[Yy]$ ]]; then
    print_info "Removing old images..."
    docker compose -f $COMPOSE_FILE down --rmi all 2>/dev/null || true
fi

# Build and start services
print_info "Building and starting services..."
docker compose -f $COMPOSE_FILE up --build -d

# Wait for services to be ready
print_info "Waiting for services to start..."
sleep 10

# Check service health
print_info "Checking service health..."

# Check MongoDB
if docker compose -f $COMPOSE_FILE exec mongodb mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1; then
    print_status "MongoDB is running"
else
    print_warning "MongoDB may not be ready yet"
fi

# Check Backend
if curl -s http://localhost:5000/health >/dev/null 2>&1; then
    print_status "Backend API is running"
else
    print_warning "Backend API may not be ready yet"
fi

# Check Frontend
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    print_status "Frontend is running"
else
    print_warning "Frontend may not be ready yet"
fi

# Display access information
echo ""
echo "🎉 FIXZIT SOUQ Enterprise is starting up!"
echo "========================================"
echo ""
print_info "Access URLs:"
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:5000"
echo "  MongoDB:  localhost:27017"
echo ""
print_info "Test Credentials:"
echo "  Super Admin: admin@fixzit.com / password"
echo "  Manager:     manager@fixzit.com / password"
echo "  Employee:    employee@fixzit.com / password"
echo "  Vendor:      vendor@fixzit.com / password"
echo ""
print_info "Useful Commands:"
echo "  View logs:    docker compose -f $COMPOSE_FILE logs -f"
echo "  Stop all:     docker compose -f $COMPOSE_FILE down"
echo "  Restart:      docker compose -f $COMPOSE_FILE restart"
echo "  Status:       docker compose -f $COMPOSE_FILE ps"
echo ""

# Open browser (optional)
read -p "Open browser to http://localhost:3000? (y/N): " open_browser
if [[ $open_browser =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000
    elif command -v open &> /dev/null; then
        open http://localhost:3000
    else
        print_info "Please open http://localhost:3000 in your browser"
    fi
fi

print_status "Setup complete! Happy coding! 🚀"