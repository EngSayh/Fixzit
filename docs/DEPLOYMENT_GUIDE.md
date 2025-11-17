# Fixzit Deployment Guide
**Version**: 1.0  
**Last Updated**: November 17, 2025  
**Target Platforms**: Vercel, AWS, Docker, Traditional Hosting

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Build Process](#build-process)
6. [Deployment Platforms](#deployment-platforms)
   - [Vercel (Recommended)](#vercel-recommended)
   - [AWS (EC2/ECS)](#aws-ec2ecs)
   - [Docker](#docker)
   - [Traditional Hosting](#traditional-hosting)
7. [Post-Deployment](#post-deployment)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedure](#rollback-procedure)

---

## Prerequisites

### Required Software
- **Node.js**: v18.17.0 or higher (v20+ recommended)
- **pnpm**: v8.0.0 or higher (`npm install -g pnpm`)
- **MongoDB**: v6.0 or higher
- **Git**: Latest version

### Optional Tools
- **Docker**: v24.0 or higher (for containerized deployment)
- **Redis**: v7.0 or higher (for caching and background jobs)
- **PM2**: v5.0 or higher (for process management on traditional hosting)

### System Requirements
**Minimum** (Development/Staging):
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- Network: 10 Mbps

**Recommended** (Production):
- CPU: 4 cores
- RAM: 8 GB
- Storage: 100 GB SSD
- Network: 100 Mbps

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`pnpm test`)
- [ ] TypeScript compilation successful (`pnpm build`)
- [ ] No ESLint errors (`pnpm lint`)
- [ ] No console statements in production code
- [ ] Security audit passed (`pnpm audit`)

### Configuration
- [ ] `.env.local` created from `.env.example`
- [ ] All required environment variables set
- [ ] Secrets rotated (different from development)
- [ ] Database connection string verified
- [ ] External service credentials configured

### Security
- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] API keys rotated for production
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured

### Documentation
- [ ] Environment variables documented
- [ ] Deployment steps reviewed
- [ ] Rollback procedure understood
- [ ] Team notified of deployment

---

## Environment Configuration

### 1. Copy Environment Template
```bash
cp .env.example .env.local
```

### 2. Configure Required Variables
Edit `.env.local` and set these **REQUIRED** variables:

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fixzit

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Node Environment
NODE_ENV=production
```

### 3. Configure Recommended Variables
For production deployments, also set:

```bash
# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Email Service (for password reset)
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Security
ALLOWED_ORIGINS=https://yourdomain.com
ENABLE_RATE_LIMITING=true
```

### 4. Configure Optional Variables
Enable additional features as needed:

```bash
# SMS Notifications
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token

# Payment Gateway (for marketplace)
PAYTABS_PROFILE_ID=your-profile-id
PAYTABS_SERVER_KEY=your-server-key

# File Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=fixzit-uploads
```

### 5. Verify Configuration
```bash
# Check environment variables are loaded
node -e "console.log(process.env.NEXTAUTH_URL || 'NOT SET')"
```

---

## Database Setup

### MongoDB Atlas (Recommended for Production)

#### 1. Create Cluster
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create new cluster (M10+ recommended for production)
3. Select region closest to your users (Middle East - Bahrain for Saudi market)
4. Wait for cluster to provision (~10 minutes)

#### 2. Configure Security
```bash
# Add IP whitelist
# Production: Add server IP
# Development: Add 0.0.0.0/0 (only for testing)

# Create database user
Username: fixzit-app
Password: <generate-strong-password>
Role: readWrite on fixzit database
```

#### 3. Get Connection String
```bash
# Format:
mongodb+srv://fixzit-app:<password>@cluster.mongodb.net/fixzit?retryWrites=true&w=majority

# Add to .env.local
MONGODB_URI=<your-connection-string>
```

#### 4. Create Indexes
```bash
# Connect to your database
mongosh "mongodb+srv://cluster.mongodb.net/fixzit" --username fixzit-app

# Run index creation script
use fixzit
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ employeeId: 1, orgId: 1 }, { unique: true })
db.users.createIndex({ orgId: 1 })
db.organizations.createIndex({ orgId: 1 }, { unique: true })
db.workorders.createIndex({ orgId: 1, status: 1 })
db.properties.createIndex({ orgId: 1 })
db.assets.createIndex({ propertyId: 1 })
db.auditlogs.createIndex({ timestamp: -1 })
db.auditlogs.createIndex({ userId: 1 })
db.auditlogs.createIndex({ orgId: 1 })

# Exit
exit
```

### Self-Hosted MongoDB

#### 1. Install MongoDB
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 2. Secure MongoDB
```bash
# Edit config
sudo nano /etc/mongod.conf

# Enable authentication
security:
  authorization: enabled

# Bind to specific IP
net:
  bindIp: 127.0.0.1,<your-server-ip>

# Restart
sudo systemctl restart mongod
```

#### 3. Create Admin User
```bash
mongosh

use admin
db.createUser({
  user: "admin",
  pwd: "<strong-password>",
  roles: [ { role: "root", db: "admin" } ]
})

use fixzit
db.createUser({
  user: "fixzit-app",
  pwd: "<strong-password>",
  roles: [ { role: "readWrite", db: "fixzit" } ]
})

exit
```

#### 4. Connection String
```bash
MONGODB_URI=mongodb://fixzit-app:<password>@localhost:27017/fixzit?authSource=fixzit
```

### Database Seeding (Optional)

#### Seed Initial Data
```bash
# Run seed script
pnpm seed

# Or manually import
mongoimport --uri="$MONGODB_URI" --collection=organizations --file=./data/seeds/organizations.json
mongoimport --uri="$MONGODB_URI" --collection=users --file=./data/seeds/users.json
```

---

## Build Process

### 1. Install Dependencies
```bash
# Clean install
rm -rf node_modules .next
pnpm install --frozen-lockfile
```

### 2. Type Check
```bash
# Verify TypeScript compilation
pnpm typecheck

# Expected output: "Found 0 errors"
```

### 3. Lint
```bash
# Run ESLint
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix
```

### 4. Run Tests
```bash
# Unit tests
pnpm test

# E2E tests (optional, requires dev server)
pnpm test:e2e

# Coverage
pnpm test:coverage
```

### 5. Build
```bash
# Production build
pnpm build

# Expected output:
# Route (app)                              Size     First Load JS
# ┌ ○ /                                    XYZ kB   XYZ kB
# ...
# ○  (Static)  automatically rendered as static HTML
# ●  (SSG)     automatically generated as static HTML + JSON
# λ  (Server)  server-side renders at runtime
```

### 6. Test Build Locally
```bash
# Start production server locally
pnpm start

# Verify on http://localhost:3000
# Test critical flows:
# - Login/logout
# - Create work order
# - Navigate all pages
# - Check browser console for errors
```

---

## Deployment Platforms

## Vercel (Recommended)

### Why Vercel?
- ✅ Optimized for Next.js (created by same team)
- ✅ Automatic deployments on git push
- ✅ Built-in CDN and edge functions
- ✅ Zero-config deployment
- ✅ Free SSL certificates
- ✅ Preview deployments for PRs

### Setup

#### 1. Install Vercel CLI
```bash
pnpm install -g vercel
```

#### 2. Login
```bash
vercel login
```

#### 3. Link Project
```bash
# From project root
vercel link

# Follow prompts:
# ? Set up and deploy? Yes
# ? Which scope? <your-team>
# ? Link to existing project? No
# ? What's your project's name? fixzit
# ? In which directory is your code located? ./
```

#### 4. Configure Environment Variables
```bash
# Add via CLI
vercel env add MONGODB_URI production
# Paste value when prompted

vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production

# Or via dashboard:
# 1. Go to https://vercel.com/your-team/fixzit/settings/environment-variables
# 2. Add all variables from .env.local
# 3. Select "Production" environment
```

#### 5. Deploy
```bash
# Deploy to production
vercel --prod

# Expected output:
# 🔗  Production: https://fixzit.vercel.app
```

#### 6. Configure Custom Domain (Optional)
```bash
# Add domain
vercel domains add yourdomain.com

# Follow DNS configuration instructions
# Add DNS records:
# A    @    76.76.21.21
# CNAME www  cname.vercel-dns.com

# Verify
vercel domains verify yourdomain.com
```

### Automatic Deployments

#### 1. Connect Git Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Import Project"
3. Select your Git provider (GitHub/GitLab/Bitbucket)
4. Import repository
5. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

#### 2. Configure Branches
- **Production Branch**: `main` → Deploys to production
- **Preview Branches**: All other branches → Preview deployments

#### 3. Environment Variables
- Add all production variables in Vercel dashboard
- Use different secrets for preview vs production

---

## AWS (EC2/ECS)

### EC2 Deployment

#### 1. Launch EC2 Instance
```bash
# Instance type: t3.medium or larger
# AMI: Ubuntu 22.04 LTS
# Storage: 30 GB gp3 SSD minimum
# Security group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

#### 2. Connect to Instance
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

#### 3. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install MongoDB (optional, if self-hosting database)
# See "Self-Hosted MongoDB" section above
```

#### 4. Clone Repository
```bash
cd /var/www
sudo mkdir fixzit
sudo chown ubuntu:ubuntu fixzit
cd fixzit

git clone https://github.com/EngSayh/Fixzit.git .
```

#### 5. Configure Environment
```bash
cp .env.example .env.local
nano .env.local

# Set all required variables
# Save and exit (Ctrl+X, Y, Enter)
```

#### 6. Build Application
```bash
pnpm install --frozen-lockfile
pnpm build
```

#### 7. Configure PM2
```bash
# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fixzit',
    script: 'pnpm',
    args: 'start',
    cwd: '/var/www/fixzit',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

#### 8. Configure Nginx
```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/fixzit

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}

# Enable site
sudo ln -s /etc/nginx/sites-available/fixzit /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 9. Setup SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts
# Certificate will auto-renew
```

#### 10. Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs fixzit

# Check Nginx status
sudo systemctl status nginx

# Test URL
curl https://yourdomain.com
```

---

## Docker

### Build Docker Image

#### 1. Verify Dockerfile
```dockerfile
# Dockerfile is already in project root
# Verify it exists:
cat Dockerfile
```

#### 2. Build Image
```bash
# Build for production
docker build -t fixzit:latest .

# Build with build args
docker build \
  --build-arg NODE_ENV=production \
  --build-arg NEXT_PUBLIC_SENTRY_DSN=$SENTRY_DSN \
  -t fixzit:latest .
```

#### 3. Run Container Locally
```bash
# Run with environment file
docker run -d \
  --name fixzit-app \
  -p 3000:3000 \
  --env-file .env.local \
  fixzit:latest

# Check logs
docker logs -f fixzit-app

# Stop container
docker stop fixzit-app
docker rm fixzit-app
```

### Docker Compose

#### 1. Use docker-compose.yml
```bash
# File already exists in project root
cat docker-compose.yml
```

#### 2. Start Services
```bash
# Start all services (app + MongoDB)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Deploy to Container Registry

#### AWS ECR
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag fixzit:latest <account>.dkr.ecr.us-east-1.amazonaws.com/fixzit:latest

# Push image
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/fixzit:latest
```

#### Docker Hub
```bash
# Login
docker login

# Tag image
docker tag fixzit:latest yourusername/fixzit:latest

# Push image
docker push yourusername/fixzit:latest
```

---

## Traditional Hosting

### Shared Hosting (Not Recommended)

Next.js requires Node.js server runtime. Shared hosting typically doesn't support this. Use Vercel, VPS, or dedicated server instead.

### VPS Deployment

Follow the [EC2 Deployment](#ec2-deployment) steps above. They work for any Ubuntu/Debian VPS (DigitalOcean, Linode, Vultr, etc.).

---

## Post-Deployment

### 1. Verify Health Endpoint
```bash
curl https://yourdomain.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-17T...",
  "uptime": 123.45,
  "database": {
    "status": "connected",
    "latency": 5
  },
  "memory": {
    "used": 350,
    "total": 512,
    "unit": "MB"
  },
  "environment": "production"
}
```

### 2. Test Authentication
```bash
# Login
curl -X POST https://yourdomain.com/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"loginIdentifier":"admin@fixzit.co","password":"your-password"}'

# Should return session cookie
```

### 3. Test Protected Endpoints
```bash
# Should return 401 Unauthorized
curl https://yourdomain.com/api/work-orders

# With valid session cookie should return 200 OK
```

### 4. Check Browser Console
1. Open https://yourdomain.com in browser
2. Open DevTools (F12)
3. Check Console tab for errors
4. Check Network tab for failed requests

### 5. Test Critical User Flows
- [ ] Login with email/password
- [ ] Navigate to dashboard
- [ ] Create work order
- [ ] Upload document
- [ ] Generate report
- [ ] Logout

### 6. Monitor Logs
```bash
# Vercel
vercel logs --prod

# PM2
pm2 logs fixzit

# Docker
docker logs -f fixzit-app
```

---

## Monitoring & Logging

### Sentry (Error Tracking)

#### 1. Create Sentry Project
1. Go to [Sentry.io](https://sentry.io)
2. Create new project → Next.js
3. Copy DSN

#### 2. Configure Environment
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=fixzit
```

#### 3. Verify Integration
- Trigger test error
- Check Sentry dashboard for event

### Application Logs

#### Centralized Logging (Production)
```bash
# Use Winston with external transport
# Already configured in lib/logger.ts

# Options:
# - CloudWatch Logs (AWS)
# - Datadog
# - Loggly
# - Papertrail
```

#### Log Aggregation
```bash
# View logs by level
pm2 logs fixzit --err  # Errors only
pm2 logs fixzit --out  # Info/debug

# Search logs
pm2 logs fixzit | grep "error"

# Clear logs
pm2 flush
```

### Performance Monitoring

#### Vercel Analytics
```bash
# Enable in Vercel dashboard
# Settings → Analytics → Enable

# Add to app
# Already included in layout.tsx
```

#### Custom Metrics
```typescript
// Track custom events
import { analytics } from '@/lib/analytics';

analytics.track('work_order_created', {
  orgId: user.orgId,
  duration: Date.now() - startTime
});
```

### Uptime Monitoring

#### UptimeRobot (Free)
1. Go to [UptimeRobot.com](https://uptimerobot.com)
2. Add monitor:
   - Type: HTTPS
   - URL: https://yourdomain.com/api/health
   - Interval: 5 minutes
3. Configure alerts (email, SMS, Slack)

#### Pingdom (Premium)
- More detailed monitoring
- Global check locations
- Transaction monitoring

---

## Troubleshooting

### Application Won't Start

#### Check Logs
```bash
# PM2
pm2 logs fixzit --lines 100

# Docker
docker logs fixzit-app

# Vercel
vercel logs --prod
```

#### Common Issues

**MongoDB Connection Failed**
```bash
# Check connection string
echo $MONGODB_URI

# Test connection
mongosh "$MONGODB_URI"

# Check IP whitelist (Atlas)
# Add server IP in Atlas dashboard
```

**Missing Environment Variables**
```bash
# Check variables are loaded
pm2 env 0

# Restart with environment file
pm2 restart fixzit --update-env
```

**Port Already in Use**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in ecosystem.config.js
```

### 500 Internal Server Error

#### Check Application Logs
```bash
pm2 logs fixzit --err
```

#### Common Causes
1. Database connection failed
2. Missing environment variable
3. Unhandled exception in code
4. Out of memory

#### Debug Mode
```bash
# Enable debug logging
pm2 restart fixzit --update-env
# Set LOG_LEVEL=debug in .env.local
```

### Authentication Not Working

#### Check NextAuth Configuration
```bash
# Verify NEXTAUTH_URL matches domain
echo $NEXTAUTH_URL

# Verify NEXTAUTH_SECRET is set
echo $NEXTAUTH_SECRET | head -c 10

# Check JWT secret is consistent
# Must be same across all instances
```

#### Check Session Cookie
1. Open DevTools → Application → Cookies
2. Look for `next-auth.session-token`
3. If missing, check CORS/SameSite settings

### Database Performance Issues

#### Check Indexes
```bash
mongosh "$MONGODB_URI"

use fixzit
db.workorders.getIndexes()

# Add missing indexes
db.workorders.createIndex({ orgId: 1, status: 1 })
```

#### Enable Profiling
```bash
# Enable slow query logging
db.setProfilingLevel(1, { slowms: 100 })

# Check slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10)
```

### High Memory Usage

#### Check Memory
```bash
# PM2
pm2 info fixzit

# Docker
docker stats fixzit-app

# System
free -h
```

#### Restart Application
```bash
# PM2 will auto-restart if max_memory_restart exceeded
pm2 restart fixzit

# Force restart
pm2 delete fixzit
pm2 start ecosystem.config.js
```

---

## Rollback Procedure

### Quick Rollback (Vercel)

#### 1. Find Previous Deployment
```bash
vercel ls

# Output shows deployment history
# fixzit – 5 deployments
# abc123.vercel.app (Production)
# def456.vercel.app (Previous)
```

#### 2. Promote Previous Deployment
```bash
# Via CLI
vercel promote def456

# Or via dashboard:
# 1. Go to Deployments tab
# 2. Find stable deployment
# 3. Click "..." → "Promote to Production"
```

#### 3. Verify
```bash
curl https://yourdomain.com/api/health
```

### Git Rollback (PM2/Docker)

#### 1. Identify Last Good Commit
```bash
git log --oneline -10

# Find stable commit hash
```

#### 2. Rollback Code
```bash
# Create rollback branch
git checkout -b rollback-$(date +%Y%m%d)

# Revert to stable commit
git revert HEAD  # Revert last commit
# Or
git reset --hard <stable-commit-hash>  # Reset to specific commit

# Push rollback
git push origin rollback-$(date +%Y%m%d)
```

#### 3. Redeploy
```bash
# Pull rollback branch
git fetch origin
git checkout rollback-$(date +%Y%m%d)

# Rebuild
pnpm install
pnpm build

# Restart
pm2 restart fixzit
```

### Database Rollback

#### 1. Restore from Backup
```bash
# MongoDB Atlas
# 1. Go to Clusters → ... → Restore
# 2. Select backup snapshot
# 3. Choose restore to original cluster

# Self-hosted MongoDB
mongorestore --uri="$MONGODB_URI" --archive=backup-2025-11-17.gz --gzip
```

#### 2. Verify Data
```bash
mongosh "$MONGODB_URI"

use fixzit
db.users.countDocuments()
db.workorders.countDocuments()
# Verify counts match expected
```

### Emergency Rollback (Complete)

#### 1. Stop Application
```bash
pm2 stop fixzit
```

#### 2. Rollback Code
```bash
git reset --hard <last-stable-commit>
```

#### 3. Restore Database
```bash
mongorestore --uri="$MONGODB_URI" --archive=backup.gz --gzip
```

#### 4. Restart Application
```bash
pnpm install
pnpm build
pm2 restart fixzit
```

#### 5. Verify
```bash
curl https://yourdomain.com/api/health
```

---

## Backup Strategy

### Automated MongoDB Backups

#### MongoDB Atlas
- Automatic continuous backups (enabled by default)
- Retention: 2 days (configurable)
- Point-in-time recovery available

#### Self-Hosted MongoDB
```bash
# Create backup script
cat > /usr/local/bin/backup-fixzit.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --uri="$MONGODB_URI" \
  --archive="$BACKUP_DIR/fixzit-$DATE.gz" \
  --gzip

# Delete backups older than 30 days
find $BACKUP_DIR -name "fixzit-*.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-fixzit.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-fixzit.sh
```

### Application Backups

#### Code
```bash
# Git is your backup
git push origin main

# Tag releases
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

#### Uploaded Files
```bash
# If using local storage
rsync -avz /var/www/fixzit/public/uploads/ user@backup-server:/backups/uploads/

# If using S3
# Enable versioning in S3 bucket (automatic backups)
```

---

## Security Best Practices

### 1. Secrets Management
- Never commit secrets to Git
- Rotate secrets regularly (every 90 days)
- Use different secrets per environment
- Store secrets in secure vault (AWS Secrets Manager, Vault)

### 2. Access Control
- Use SSH keys (not passwords)
- Implement least privilege principle
- Disable root login
- Use bastion host for database access

### 3. Network Security
- Enable firewall (ufw on Ubuntu)
- Close unused ports
- Use VPC/private networking
- Enable DDoS protection

### 4. Application Security
- Keep dependencies updated
- Run security audits (`pnpm audit`)
- Enable HTTPS everywhere
- Implement rate limiting
- Use security headers

### 5. Monitoring
- Set up alerting for errors
- Monitor resource usage
- Track failed login attempts
- Enable audit logging

---

## Performance Optimization

### 1. CDN Configuration
- Use Vercel Edge Network (automatic on Vercel)
- Or CloudFlare for custom hosting
- Cache static assets
- Optimize images with Next.js Image

### 2. Database Optimization
- Create indexes on frequent queries
- Use lean() for read-only queries
- Implement connection pooling
- Consider read replicas for high traffic

### 3. Caching Strategy
- Redis for session storage
- Cache API responses
- Use stale-while-revalidate
- Implement service worker

### 4. Build Optimization
- Enable compression
- Tree-shake unused code
- Code split large bundles
- Use dynamic imports

---

## Support & Resources

### Documentation
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [PM2 Docs](https://pm2.keymetrics.io/docs/)

### Community
- GitHub Issues: [EngSayh/Fixzit/issues](https://github.com/EngSayh/Fixzit/issues)
- Email Support: support@fixzit.co

### Emergency Contacts
- On-Call Developer: [Contact Info]
- Database Admin: [Contact Info]
- DevOps Team: [Contact Info]

---

**Last Updated**: November 17, 2025  
**Version**: 1.0  
**Maintainer**: Fixzit Development Team
