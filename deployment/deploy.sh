#!/bin/bash

# Fixzit Souq Enterprise Platform - Production Deployment Script
# Comprehensive deployment for Saudi market

set -e

echo "🚀 FIXZIT SOUQ ENTERPRISE PLATFORM - PRODUCTION DEPLOYMENT"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="fixzit-souq"
DOMAIN="fixzit-souq.com"
BACKUP_DIR="/var/backups/fixzit-souq"
LOG_FILE="/var/log/fixzit-deployment.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Pre-deployment checks
log "Starting pre-deployment checks..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    error ".env file not found. Please copy .env.example to .env and configure it."
fi

# Validate required environment variables
log "Validating environment variables..."
required_vars=(
    "MONGODB_URI"
    "JWT_SECRET"
    "NEXTAUTH_SECRET"
    "STRIPE_SECRET_KEY"
    "STRIPE_PUBLISHABLE_KEY"
    "NEXTAUTH_URL"
    "NODE_ENV"
    "MEILI_MASTER_KEY"
    "SENDGRID_API_KEY"
    "SENDGRID_FROM_EMAIL"
    "SENDGRID_FROM_NAME"
    "SMS_DEV_MODE"
    "ZATCA_API_KEY"
    "ZATCA_API_SECRET"
    "ZATCA_ENVIRONMENT"
)
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        error "Required environment variable $var is not set in .env file"
    fi
done

# Ensure either MEILI_HOST or MEILI_URL is present
if ! grep -q "^MEILI_HOST=" .env && ! grep -q "^MEILI_URL=" .env; then
    error "Either MEILI_HOST or MEILI_URL must be set in .env"
fi

# Create backup of current deployment if it exists
if docker-compose ps | grep -q "Up"; then
    log "Creating backup of current deployment..."
    mkdir -p $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)
    if ! docker-compose exec mongodb mongodump --out /backup/$(date +%Y%m%d_%H%M%S); then
        error "Database backup failed - cannot proceed without backup"
    fi
    log "✅ Backup created successfully"
fi

# Pull latest images
log "Pulling latest Docker images..."
docker-compose pull

# Build application images
log "Building application images..."
docker-compose build --no-cache

# Start services
log "Starting services..."
docker-compose up -d

# Wait for services to be ready with health check retry
log "Waiting for services to start..."
MAX_RETRIES=30
RETRY_COUNT=0
until curl -f http://localhost:5000/health > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    log "Waiting for application to start (attempt $RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "Application failed to start after $MAX_RETRIES attempts"
fi

# Health checks
log "Performing health checks..."

# Check web application
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    log "✅ Web application is healthy"
else
    error "❌ Web application health check failed"
fi

# Check database
if docker-compose exec mongodb mongo --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
    log "✅ MongoDB is healthy"
else
    error "❌ MongoDB health check failed"
fi

# Run database migrations
log "Running database migrations..."
docker-compose exec web npm run db:migrate || warn "Database migration failed"

# Create initial admin user if needed
log "Creating initial admin user..."
docker-compose exec web npm run create-admin || log "Admin user already exists"

# Configure SSL certificates (if using Let's Encrypt)
if [ "$USE_LETSENCRYPT" = "true" ]; then
    log "Configuring SSL certificates with Let's Encrypt..."
    docker-compose exec nginx certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
fi

# Setup monitoring and alerts
log "Setting up monitoring..."
docker-compose exec grafana grafana-cli plugins install grafana-piechart-panel || log "Grafana plugin already installed"

# Performance optimization
log "Optimizing performance..."
docker-compose exec web npm run optimize || log "Optimization skipped"

# Security hardening
log "Applying security hardening..."
docker-compose exec nginx nginx -t || error "Nginx configuration test failed"

# Setup log rotation (requires system admin - document for provisioning)
log "Log rotation configuration..."
warn "⚠️  Log rotation requires sudo access to write to /etc/logrotate.d/"
warn "⚠️  Please run the following command as root/sudo user:"
warn "    sudo tee /etc/logrotate.d/fixzit-souq << 'EOF'"
warn "/var/log/fixzit-deployment.log {"
warn "    daily"
warn "    missingok"
warn "    rotate 30"
warn "    compress"
warn "    delaycompress"
warn "    notifempty"
warn "    create 644 $USER $USER"
warn "}"
warn "EOF"

# Setup backup cron job (user crontab - no sudo required)
log "Setting up automated backups in user crontab..."
if ! crontab -l 2>/dev/null | grep -q "backup-fixzit.sh"; then
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-fixzit.sh") | crontab -
    log "✅ Backup cron job added to user crontab"
else
    log "✅ Backup cron job already exists"
fi

# Final verification
log "Performing final verification..."

# Check all endpoints
endpoints=("/health" "/api/health" "/api/properties" "/api/workorders" "/api/finance")
for endpoint in "${endpoints[@]}"; do
    if curl -f http://localhost:5000$endpoint > /dev/null 2>&1; then
        log "✅ Endpoint $endpoint is responding"
    else
        warn "⚠️ Endpoint $endpoint returned error (may be protected)"
    fi
done

# Display deployment summary
log "=========================================================="
log "🎯 DEPLOYMENT COMPLETED SUCCESSFULLY!"
log "=========================================================="
log "Application URL: https://$DOMAIN"
log "API Base URL: https://$DOMAIN/api"
log "Admin Dashboard: https://$DOMAIN/admin"
log "Monitoring: https://$DOMAIN:3001 (Grafana)"
log "Metrics: https://$DOMAIN:9090 (Prometheus)"
log ""
log "📊 SERVICE STATUS:"
docker-compose ps
log ""
log "📝 NEXT STEPS:"
log "1. Configure DNS to point $DOMAIN to this server"
log "2. Test all functionality thoroughly"
log "3. Configure monitoring alerts"
log "4. Setup backup verification"
log "5. Configure CDN if needed"
log ""
log "🔧 MANAGEMENT COMMANDS:"
log "- View logs: docker-compose logs -f"
log "- Stop services: docker-compose down"
log "- Restart services: docker-compose restart"
log "- Database backup: docker-compose exec mongodb mongodump"
log ""
log "⚡ SYSTEM READY FOR PRODUCTION!"

# Send deployment notification (if configured)
if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚀 Fixzit Souq Enterprise Platform deployed successfully to production!"}' \
    $SLACK_WEBHOOK
fi

echo "Deployment completed at $(date)" >> $LOG_FILE
