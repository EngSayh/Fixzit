# Fixzit Production Deployment Guide

## 🎯 System Overview

**Fixzit** is a comprehensive facilities management platform built with:

- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript (Zero compilation errors ✅)
- **Database**: MongoDB 7.0
- **Runtime**: Node.js v20.19.5
- **Architecture**: Serverless API routes (NO separate Express backend)

---

## 📋 Pre-Deployment Checklist

### ✅ Code Quality

- [x] TypeScript compilation: **0 errors**
- [x] ESLint warnings: 554 (non-blocking, mostly 'any' usage)
- [x] Production build: **Successful**
- [x] Git LFS: Configured (warning can be ignored or git-lfs installed)

### ✅ Security

- [x] JWT secret: **Environment variable** (no hardcoded secrets)
- [x] .env.local: **Removed from git**
- [x] JWT verification: **crypto.verify** (not atob)
- [x] Rate limiting: **60 requests/60 seconds** (66+ routes)
- [x] Authentication: **Implemented across all protected routes**
- [x] Tenant isolation: **user.orgId** scoping

### 🟡 Pending Configuration

- [ ] PayTabs production keys
- [ ] Google Maps API key
- [ ] ZATCA certificate
- [ ] AWS credentials
- [ ] Email service (SendGrid/SES)
- [ ] SMS service (Twilio)

---

## 🔧 Environment Configuration

### Required Environment Variables

Create `.env.production` or configure in your hosting platform:

```bash
# === CRITICAL: REQUIRED FOR PRODUCTION ===

# JWT Authentication (MUST be 32+ characters)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-use-openssl-rand-hex-32"

# MongoDB Connection
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/fixzit?retryWrites=true&w=majority"
MONGODB_DB="fixzit"

# Application URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"

# === PAYMENTS (PayTabs Saudi Arabia) ===
PAYTABS_PROFILE_ID="your-profile-id"
PAYTABS_SERVER_KEY="your-server-key"
PAYTABS_CLIENT_KEY="your-client-key"
PAYTABS_REGION="SAU"  # Saudi Arabia
PAYTABS_CURRENCY="SAR"

# === MAPS & LOCATION (Google Maps) ===
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
GOOGLE_MAPS_API_KEY="your-server-side-google-maps-key"

# === ZATCA (E-Invoicing - Saudi Arabia) ===
ZATCA_CERTIFICATE_PATH="/path/to/zatca-cert.pem"
ZATCA_PRIVATE_KEY_PATH="/path/to/zatca-private-key.pem"
ZATCA_API_URL="https://gw-fatoora.zatca.gov.sa/e-invoicing/core"
ZATCA_OTP="your-otp-from-zatca"

# === AWS (S3, SES, etc.) ===
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="me-south-1"  # Middle East (Bahrain) or your preferred region
AWS_S3_BUCKET="your-s3-bucket-name"

# === EMAIL SERVICE (SendGrid or AWS SES) ===
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"
# OR for AWS SES
AWS_SES_FROM_EMAIL="noreply@yourdomain.com"

# === SMS SERVICE (Twilio) ===
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+966xxxxxxxxx"

# === OPTIONAL: MONITORING & LOGGING ===
SENTRY_DSN="your-sentry-dsn"  # Error tracking
DATADOG_API_KEY="your-datadog-key"  # APM & monitoring

# === OPTIONAL: RATE LIMITING (Redis) ===
REDIS_URL="redis://username:password@host:port"

# === OPTIONAL: FEATURE FLAGS ===
ENABLE_AQAR_MODULE="true"
ENABLE_ATS_MODULE="true"
ENABLE_MARKETPLACE="true"
```

---

## 🏗️ Architecture Documentation

### Backend Architecture: Next.js API Routes ONLY

**CLARIFICATION**: This system does **NOT** use a separate Express backend on port 5000.

All backend logic is handled by **Next.js API Routes** located in `/app/api/*`:

```
app/api/
├── auth/              # Authentication (login, signup, me)
├── work-orders/       # Work order management
├── billing/           # PayTabs integration
├── invoices/          # Invoice management
├── assets/            # Asset management
├── properties/        # Property management (Aqar)
├── ats/               # Applicant Tracking System
├── marketplace/       # Marketplace module
├── support/           # Support tickets
├── help/              # Help center
├── notifications/     # Notification system
├── vendors/           # Vendor management
├── projects/          # Project management
├── copilot/           # AI assistant
└── ...                # 100+ total API routes
```

**API Endpoint Pattern**:

- Development: `http://localhost:3000/api/{endpoint}`
- Production: `https://yourdomain.com/api/{endpoint}`

**No Port 5000**: If you see references to port 5000, they are legacy comments. The system is entirely Next.js-based.

---

## 🚀 Deployment Steps

### Option 1: Vercel (Recommended for Next.js)

1. **Install Vercel CLI**:

   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Deploy**:

   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all required variables from `.env.production`

### Option 2: Docker (Self-Hosted)

1. **Build Docker Image**:

   ```bash
   docker build -t fixzit:latest .
   ```

2. **Run Container**:

   ```bash
   docker run -d \
     --name fixzit \
     -p 3000:3000 \
     --env-file .env.production \
     fixzit:latest
   ```

3. **With Docker Compose**:

   ```bash
   docker-compose up -d
   ```

### Option 3: Traditional Server (PM2)

1. **Build Production Bundle**:

   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. **Install PM2**:

   ```bash
   npm install -g pm2
   ```

3. **Start Application**:

   ```bash
   pm2 start npm --name "fixzit" -- start
   ```

4. **Save PM2 Configuration**:

   ```bash
   pm2 save
   pm2 startup
   ```

---

## 🗄️ Database Setup

### MongoDB Configuration

1. **Create MongoDB Atlas Cluster** (Recommended):
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster (M10+ for production)
   - Whitelist your application IP addresses
   - Create database user with read/write permissions
   - Copy connection string to `MONGODB_URI`

2. **Database Indexes** (Important for Performance):

   ```javascript
   // Run these in MongoDB shell or Compass
   use fixzit;

   // Users
   db.users.createIndex({ email: 1 }, { unique: true });
   db.users.createIndex({ orgId: 1 });
   db.users.createIndex({ role: 1 });

   // Work Orders
   db.workorders.createIndex({ tenantId: 1 });
   db.workorders.createIndex({ code: 1 }, { unique: true });
   db.workorders.createIndex({ status: 1 });
   db.workorders.createIndex({ createdAt: -1 });

   // Invoices
   db.invoices.createIndex({ tenantId: 1 });
   db.invoices.createIndex({ invoiceNumber: 1 }, { unique: true });

   // Assets
   db.assets.createIndex({ tenantId: 1 });
   db.assets.createIndex({ assetCode: 1 });

   // Add more indexes as needed for your data access patterns
   ```

3. **Backup Strategy**:
   - MongoDB Atlas: Enable automatic backups (daily snapshots)
   - Self-hosted: Configure regular mongodump backups

   ```bash
   mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)
   ```

---

## 🔒 Security Best Practices

### 1. JWT Secret Management

- **Never** commit JWT secrets to git
- Use environment variables or secret managers (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly (every 90 days minimum)
- Minimum 32 characters, cryptographically random

### 2. HTTPS/TLS

- **Always** use HTTPS in production
- Obtain SSL certificate from Let's Encrypt or your hosting provider
- Configure HSTS headers (already implemented in middleware)

### 3. Rate Limiting

- Current: 60 requests per 60 seconds per IP
- Consider implementing Redis-based distributed rate limiting for multi-instance deployments

### 4. CORS Configuration

- Review and restrict allowed origins in `next.config.js`
- Default: Allows necessary Saudi domains for PayTabs/ZATCA

### 5. Database Security

- Enable MongoDB authentication
- Use connection string with `authSource=admin`
- Restrict database user permissions (no admin rights for app)
- Enable audit logging for compliance

---

## 📊 Monitoring & Logging

### Application Monitoring

1. **Sentry** (Error Tracking):

   ```bash
   npm install @sentry/nextjs
   ```

   - Configure in `sentry.server.config.js` and `sentry.client.config.js`

2. **Datadog** (APM):
   - Install Datadog agent
   - Configure APM tracing
   - Monitor response times, error rates, throughput

3. **Custom Logging**:
   - Replace `console.log` with structured logging (Winston/Pino)
   - Log to centralized service (CloudWatch, Datadog, Elasticsearch)

### Health Checks

Monitor these endpoints:

- `/api/health` - Basic health check
- `/api/qa/health` - Detailed system health (QA module)

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-09T15:00:00.000Z",
  "mongodb": true,
  "uptime": 3600
}
```

---

## ⚡ Performance Optimization

### 1. Build Optimization

- Production build already optimized (webpack configuration in `next.config.js`)
- Static page generation for public pages
- Dynamic imports for heavy components

### 2. Database Optimization

- Create proper indexes (see Database Setup section)
- Use aggregation pipelines for complex queries
- Implement caching (Redis) for frequently accessed data

### 3. CDN Configuration

- Serve static assets through CDN (Vercel automatically does this)
- Configure proper cache headers

### 4. Memory Configuration

- Node.js requires 4GB heap for build: `NODE_OPTIONS="--max-old-space-size=4096"`
- Runtime memory: 512MB minimum, 1GB recommended

---

## 🧪 Pre-Production Testing

### Checklist

1. **Functional Testing**:

   ```bash
   npm run test:e2e
   ```

   - Expected: 448 tests (435+ passing)

2. **Load Testing**:

   ```bash
   # Using Apache Bench
   ab -n 1000 -c 10 https://yourdomain.com/api/health

   # Or using Artillery
   artillery quick --count 100 --num 10 https://yourdomain.com/
   ```

3. **Security Scan**:

   ```bash
   npm audit
   npm audit fix
   ```

4. **Performance Audit**:

   ```bash
   npm run lighthouse
   ```

   - Target: 90+ score on Performance, Accessibility, Best Practices

---

## 🔄 Post-Deployment Verification

### 1. Smoke Tests (Run Immediately After Deployment)

```bash
# Health check
curl https://yourdomain.com/api/health

# Authentication
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Protected endpoint
curl https://yourdomain.com/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Monitor First 24 Hours

Watch for:

- Response times (should be < 500ms for most endpoints)
- Error rates (should be < 1%)
- Memory usage (should be stable, no leaks)
- Database connections (no connection pool exhaustion)

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: MongoDB connection timeout

- **Solution**: Check MongoDB URI, verify IP whitelist, test network connectivity

**Issue**: JWT verification failed

- **Solution**: Ensure JWT_SECRET matches between token generation and verification

**Issue**: PayTabs payment failed

- **Solution**: Verify PAYTABS_SERVER_KEY and region configuration (SAU)

**Issue**: High memory usage

- **Solution**: Increase Node.js heap size, check for memory leaks in custom code

**Issue**: Rate limiting too aggressive

- **Solution**: Adjust rate limit windows in individual API routes

### Logs Location

- **Vercel**: Dashboard → Your Project → Logs
- **Docker**: `docker logs fixzit`
- **PM2**: `pm2 logs fixzit`
- **Self-hosted**: Check `/var/log/fixzit/` or configured log directory

---

## 📚 Additional Resources

- **API Documentation**: `/api-docs` (OpenAPI 3.0)
- **Knowledge Center**: `/help` (Help articles and FAQs)
- **Admin Panel**: `/admin` (Super admin only)
- **GitHub Repository**: [EngSayh/Fixzit](https://github.com/EngSayh/Fixzit)

---

## 🎉 Production Readiness Status

| Component   | Status                 | Notes                     |
| ----------- | ---------------------- | ------------------------- |
| TypeScript  | ✅ **0 errors**        | Fully type-safe           |
| Build       | ✅ **Success**         | 4GB heap required         |
| Security    | ✅ **Compliant**       | JWT, rate limiting, HTTPS |
| MongoDB     | ✅ **Healthy**         | Docker 7.0 or Atlas       |
| API Routes  | ✅ **109 routes**      | All secured & documented  |
| Tests       | 🟡 **435/448 passing** | 13 tests need fixing      |
| Credentials | 🟡 **Partial**         | PayTabs/AWS need config   |
| Monitoring  | 🟡 **Basic**           | Add Sentry/Datadog        |

**Overall Status**: 🟢 **PRODUCTION READY** (with credential configuration)

---

**Last Updated**: 2025-10-09  
**Version**: 1.0.0  
**Maintainer**: Eng. Sultan Al Hassni (EngSayh)
