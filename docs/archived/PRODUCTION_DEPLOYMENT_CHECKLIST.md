# Production Deployment Checklist

## Overview

Complete checklist for deploying Fixzit to production. Follow these steps to ensure a secure, performant, and reliable production deployment.

**Estimated Time**: 4-6 hours for first deployment

## Table of Contents

- [Pre-Deployment](#pre-deployment)
- [Infrastructure Setup](#infrastructure-setup)
- [Database Configuration](#database-configuration)
- [Environment Variables](#environment-variables)
- [Security Configuration](#security-configuration)
- [Performance Optimization](#performance-optimization)
- [Monitoring & Observability](#monitoring--observability)
- [Backup & Recovery](#backup--recovery)
- [Testing & Validation](#testing--validation)
- [Deployment](#deployment)
- [Post-Deployment](#post-deployment)
- [Rollback Plan](#rollback-plan)

## Pre-Deployment

### Planning & Documentation

- [ ] **Review architecture documentation**
  - [ ] System architecture diagrams
  - [ ] Data flow diagrams
  - [ ] Security architecture
  - [ ] Disaster recovery plan

- [ ] **Capacity planning**
  - [ ] Expected concurrent users: **\_\_\_\_**
  - [ ] Expected requests per second: **\_\_\_\_**
  - [ ] Database size estimate: **\_\_\_\_**
  - [ ] Storage requirements: **\_\_\_\_**

- [ ] **Compliance & Legal**
  - [ ] GDPR compliance reviewed
  - [ ] Data residency requirements identified
  - [ ] Terms of service finalized
  - [ ] Privacy policy finalized

### Team Preparation

- [ ] **Deployment team identified**
  - [ ] Lead: **\*\***\_\_\_\_**\*\***
  - [ ] Database admin: **\*\***\_\_\_\_**\*\***
  - [ ] DevOps: **\*\***\_\_\_\_**\*\***
  - [ ] QA: **\*\***\_\_\_\_**\*\***

- [ ] **Communication plan**
  - [ ] Stakeholders notified
  - [ ] Maintenance window scheduled
  - [ ] Status page prepared
  - [ ] Support team briefed

## Infrastructure Setup

### Hosting Platform

**Choose one**: ☐ Vercel ☐ AWS ☐ GCP ☐ Azure ☐ Other: **\_\_\_\_**

#### Vercel (Recommended for Next.js)

- [ ] **Project setup**
  - [ ] Vercel account created
  - [ ] Project connected to GitHub
  - [ ] Production branch: `main`
  - [ ] Framework preset: Next.js

- [ ] **Configuration**
  - [ ] Node.js version: 20.x
  - [ ] Build command: `pnpm build`
  - [ ] Output directory: `.next`
  - [ ] Install command: `pnpm install --frozen-lockfile`

- [ ] **Domains**
  - [ ] Custom domain configured: **\*\***\_\_\_\_**\*\***
  - [ ] SSL certificate provisioned
  - [ ] DNS records updated
  - [ ] WWW redirect configured

#### AWS/GCP/Azure

- [ ] **Compute resources**
  - [ ] Instance type selected: **\*\***\_\_\_\_**\*\***
  - [ ] Auto-scaling configured
  - [ ] Load balancer configured
  - [ ] Health check endpoints defined

- [ ] **Networking**
  - [ ] VPC configured
  - [ ] Subnets created (public/private)
  - [ ] Security groups configured
  - [ ] Network ACLs configured

- [ ] **Storage**
  - [ ] S3/Cloud Storage bucket created
  - [ ] Bucket policies configured
  - [ ] CDN configured (CloudFront/Cloud CDN)
  - [ ] Backup storage configured

## Database Configuration

See [PRODUCTION_MONGODB_SETUP.md](./PRODUCTION_MONGODB_SETUP.md) for detailed MongoDB setup.

### MongoDB Atlas

- [ ] **Cluster setup**
  - [ ] Cluster tier: M10+ (production)
  - [ ] Region selected: **\*\***\_\_\_\_**\*\***
  - [ ] MongoDB version: 7.0+
  - [ ] Cluster name: **\*\***\_\_\_\_**\*\***

- [ ] **Database access**
  - [ ] Application user created
    - Username: `fixzit_app`
    - Password: [Strong 32+ character password]
    - Role: `readWrite` on `fixzit` database
  - [ ] Admin user created (separate credentials)
  - [ ] Backup user created (read-only)

- [ ] **Network access**
  - [ ] IP allowlist configured
    - Production IPs: **\*\***\_\_\_\_**\*\***
    - Admin IPs: **\*\***\_\_\_\_**\*\***
  - [ ] Private endpoint configured (if applicable)
  - [ ] VPC peering configured (if applicable)

- [ ] **Database configuration**
  - [ ] Database created: `fixzit`
  - [ ] Indexes created: `pnpm tsx scripts/ensure-indexes.ts`
  - [ ] Connection string tested
  - [ ] Connection pooling verified

- [ ] **Backups**
  - [ ] Continuous backup enabled
  - [ ] Snapshot schedule configured
  - [ ] Retention period: 30 days
  - [ ] Recovery tested

### Connection Details

```bash
MONGODB_URI=mongodb+srv://fixzit_app:PASSWORD@cluster.mongodb.net/fixzit
```

- [ ] Connection string documented in secure location
- [ ] Credentials stored in secret manager

## Environment Variables

### Required Variables

Copy from `.env.example` and fill in production values:

#### Core Configuration

- [ ] **MONGODB_URI**

  ```bash
  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fixzit
  ```

- [ ] **NEXTAUTH_URL**

  ```bash
  NEXTAUTH_URL=https://your-production-domain.com
  ```

- [ ] **NEXTAUTH_SECRET** (32+ characters)

  ```bash
  # Generate with: openssl rand -base64 32
  NEXTAUTH_SECRET=________________________________
  ```

- [ ] **AUTH_SECRET** (same as NEXTAUTH_SECRET)

  ```bash
  AUTH_SECRET=________________________________
  ```

- [ ] **NODE_ENV**
  ```bash
  NODE_ENV=production
  ```

#### OAuth Providers (Recommended)

- [ ] **Google OAuth**

  ```bash
  GOOGLE_CLIENT_ID=________________________________
  GOOGLE_CLIENT_SECRET=________________________________
  ```

  - [ ] OAuth consent screen configured
  - [ ] Authorized redirect URIs added
  - [ ] Scopes configured: email, profile

- [ ] **GitHub OAuth** (optional)
  ```bash
  GITHUB_CLIENT_ID=________________________________
  GITHUB_CLIENT_SECRET=________________________________
  ```

#### Email Service

- [ ] **SendGrid**

  ```bash
  SENDGRID_API_KEY=________________________________
  SENDGRID_FROM_EMAIL=noreply@your-domain.com
  SENDGRID_FROM_NAME=Fixzit
  ```

  - [ ] API key created
  - [ ] Sender email verified
  - [ ] Templates created

#### SMS Service (Optional)

- [ ] **Twilio**
  ```bash
  TWILIO_ACCOUNT_SID=________________________________
  TWILIO_AUTH_TOKEN=________________________________
  TWILIO_PHONE_NUMBER=+1234567890
  ```

#### File Storage

- [ ] **AWS S3** or **Cloud Storage**

  ```bash
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=________________________________
  AWS_SECRET_ACCESS_KEY=________________________________
  AWS_S3_BUCKET=fixzit-production-uploads
  ```

  - [ ] Bucket created
  - [ ] CORS configured
  - [ ] Lifecycle policies configured
  - [ ] CDN configured

#### Payment Gateway (Optional)

- [ ] **PayTabs** or **Stripe**
  ```bash
  PAYTABS_PROFILE_ID=________________________________
  PAYTABS_SERVER_KEY=________________________________
  ```

#### Observability

- [ ] **Logging**

  ```bash
  LOG_LEVEL=info
  LOG_FORMAT=json
  ```

- [ ] **Sentry** (recommended)

  ```bash
  NEXT_PUBLIC_SENTRY_DSN=________________________________
  SENTRY_AUTH_TOKEN=________________________________
  ```

- [ ] **Analytics**
  ```bash
  NEXT_PUBLIC_GA_ID=________________________________
  ```

### Environment Variable Validation

- [ ] All required variables set
- [ ] No placeholder values remain
- [ ] Secrets stored in secure vault (not in code)
- [ ] Environment variables documented
- [ ] Test environment mirrors production (except credentials)

## Security Configuration

### Authentication & Authorization

- [ ] **NextAuth configuration**
  - [ ] JWT secrets are strong (32+ characters)
  - [ ] Session expiry configured (24 hours recommended)
  - [ ] Cookie security: `secure: true`, `sameSite: 'lax'`
  - [ ] CSRF protection enabled

- [ ] **Password policies**
  - [ ] Minimum length: 8 characters
  - [ ] Complexity requirements enforced
  - [ ] Password hashing: bcrypt (10+ rounds)
  - [ ] Password reset flow tested

- [ ] **Role-based access control (RBAC)**
  - [ ] Roles defined: SuperAdmin, Admin, Manager, Technician, Tenant, Vendor
  - [ ] Permissions mapped to routes
  - [ ] API route protection verified
  - [ ] Client-side route guards tested

### API Security

- [ ] **Rate limiting**
  - [ ] Global rate limit: 100 req/min per IP
  - [ ] Auth endpoints: 10 req/min per IP
  - [ ] API routes protected
  - [ ] Rate limit headers returned

- [ ] **CORS configuration**
  - [ ] Allowed origins specified
  - [ ] Credentials allowed: true
  - [ ] Methods restricted: GET, POST, PUT, DELETE
  - [ ] Headers whitelisted

- [ ] **Input validation**
  - [ ] Zod schemas for all API inputs
  - [ ] SQL injection protection (using ORM)
  - [ ] XSS protection (React escapes by default)
  - [ ] File upload validation (type, size)

### Infrastructure Security

- [ ] **HTTPS/TLS**
  - [ ] SSL certificate installed
  - [ ] HTTP to HTTPS redirect enabled
  - [ ] TLS 1.2+ enforced
  - [ ] HSTS header configured

- [ ] **Security headers**
  - [ ] Content-Security-Policy
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Referrer-Policy: strict-origin-when-cross-origin

- [ ] **Secrets management**
  - [ ] Environment variables in vault (Vercel/AWS/GCP)
  - [ ] No secrets in code/logs
  - [ ] Secrets rotation policy defined
  - [ ] Access logs monitored

- [ ] **Network security**
  - [ ] Database not publicly accessible
  - [ ] Private endpoints configured
  - [ ] Firewall rules configured
  - [ ] DDoS protection enabled

### Compliance

- [ ] **Data protection**
  - [ ] Encryption at rest (MongoDB Atlas)
  - [ ] Encryption in transit (TLS)
  - [ ] PII handling documented
  - [ ] Data retention policy defined

- [ ] **Audit logging**
  - [ ] User actions logged
  - [ ] Admin actions logged
  - [ ] Database access logged
  - [ ] Log retention: 90 days

## Performance Optimization

### Application Performance

- [ ] **Build optimization**
  - [ ] Production build successful: `pnpm build`
  - [ ] Bundle size analyzed: `pnpm analyze`
  - [ ] Code splitting configured
  - [ ] Tree shaking verified

- [ ] **Image optimization**
  - [ ] Next.js Image component used
  - [ ] WebP format configured
  - [ ] Lazy loading enabled
  - [ ] Responsive images configured

- [ ] **Font optimization**
  - [ ] Fonts self-hosted or from CDN
  - [ ] Font display: swap
  - [ ] Variable fonts used (if applicable)
  - [ ] Preload critical fonts

### Database Performance

- [ ] **Indexes**
  - [ ] Core indexes created
  - [ ] Query patterns analyzed
  - [ ] Index usage monitored
  - [ ] Missing indexes identified (Performance Advisor)

- [ ] **Query optimization**
  - [ ] Slow queries identified (>100ms)
  - [ ] N+1 queries eliminated
  - [ ] Pagination implemented
  - [ ] Projection used for large documents

- [ ] **Connection pooling**
  - [ ] Pool size configured: 10 connections
  - [ ] Pool monitoring enabled
  - [ ] Connection leaks checked

### Caching Strategy

- [ ] **CDN caching**
  - [ ] Static assets cached (1 year)
  - [ ] Cache headers configured
  - [ ] Cache invalidation strategy defined
  - [ ] CDN configured (Vercel, CloudFront)

- [ ] **Application caching**
  - [ ] MongoDB/Vercel KV configured (optional)
  - [ ] Session caching enabled
  - [ ] API response caching (where appropriate)
  - [ ] Cache TTLs defined

- [ ] **Browser caching**
  - [ ] Service worker configured (optional)
  - [ ] LocalStorage usage optimized
  - [ ] Cache busting strategy defined

### Load Testing

- [ ] **Performance benchmarks**
  - [ ] Lighthouse score: >90
  - [ ] Time to First Byte (TTFB): <200ms
  - [ ] Largest Contentful Paint (LCP): <2.5s
  - [ ] First Input Delay (FID): <100ms
  - [ ] Cumulative Layout Shift (CLS): <0.1

- [ ] **Load testing**
  - [ ] Concurrent users tested: **\_\_\_\_**
  - [ ] Response time under load: <500ms
  - [ ] Error rate under load: <1%
  - [ ] Database connection pool: No exhaustion

## Monitoring & Observability

### Application Monitoring

- [ ] **Error tracking (Sentry)**
  - [ ] Sentry project created
  - [ ] Source maps uploaded
  - [ ] Error notifications configured
  - [ ] Error rate baseline established

- [ ] **Performance monitoring**
  - [ ] Real User Monitoring (RUM) enabled
  - [ ] Performance metrics tracked
  - [ ] Core Web Vitals monitored
  - [ ] Slow requests identified

- [ ] **Logging**
  - [ ] Structured logging enabled (JSON)
  - [ ] Log levels configured
  - [ ] Log aggregation (CloudWatch, Datadog)
  - [ ] Log retention policy: 30 days

### Infrastructure Monitoring

- [ ] **Uptime monitoring**
  - [ ] Health check endpoint: `/api/health`
  - [ ] Uptime monitor configured (Pingdom, UptimeRobot)
  - [ ] Status page created
  - [ ] SLA defined: 99.9%

- [ ] **Database monitoring (Atlas)**
  - [ ] Real-time performance panel enabled
  - [ ] Query profiling enabled
  - [ ] Slow query alerts configured
  - [ ] Disk usage alerts configured

- [ ] **Resource monitoring**
  - [ ] CPU usage alerts (<80%)
  - [ ] Memory usage alerts (<80%)
  - [ ] Disk usage alerts (<80%)
  - [ ] Network throughput monitored

### Alerts & Notifications

- [ ] **Critical alerts**
  - [ ] Application down
  - [ ] Database connection failure
  - [ ] Error rate spike (>5%)
  - [ ] Response time spike (>1s)

- [ ] **Warning alerts**
  - [ ] Disk usage >70%
  - [ ] Memory usage >70%
  - [ ] Slow queries >100ms
  - [ ] Failed login attempts spike

- [ ] **Notification channels**
  - [ ] Email alerts configured
  - [ ] Slack/Teams integration
  - [ ] PagerDuty/OpsGenie (optional)
  - [ ] Escalation policy defined

## Backup & Recovery

### Backup Configuration

- [ ] **Database backups (Atlas)**
  - [ ] Continuous backup enabled
  - [ ] Snapshot frequency: Daily
  - [ ] Snapshot retention: 30 days
  - [ ] Point-in-time recovery (PITR) tested

- [ ] **File storage backups**
  - [ ] S3 versioning enabled
  - [ ] Cross-region replication configured
  - [ ] Lifecycle policies configured
  - [ ] Backup verification schedule

- [ ] **Code & configuration**
  - [ ] GitHub repository backed up
  - [ ] Environment variables documented
  - [ ] Infrastructure as Code (IaC) in version control
  - [ ] Secrets backup (encrypted)

### Disaster Recovery

- [ ] **Recovery procedures documented**
  - [ ] Database restore procedure
  - [ ] Application rollback procedure
  - [ ] Data recovery procedure
  - [ ] Communication plan

- [ ] **Recovery objectives**
  - [ ] Recovery Time Objective (RTO): **\_\_\_\_** hours
  - [ ] Recovery Point Objective (RPO): **\_\_\_\_** hours
  - [ ] Maximum tolerable downtime: **\_\_\_\_** hours

- [ ] **Recovery testing**
  - [ ] Database restore tested
  - [ ] Failover tested
  - [ ] Backup integrity verified
  - [ ] Recovery time measured

## Testing & Validation

### Pre-Production Testing

- [ ] **Unit tests**
  - [ ] Test coverage: >80%
  - [ ] All tests passing: `pnpm test`
  - [ ] Critical paths covered

- [ ] **Integration tests**
  - [ ] API routes tested
  - [ ] Database operations tested
  - [ ] Third-party integrations tested

- [ ] **E2E tests (Playwright)**
  - [ ] All test suites passing: `pnpm playwright test`
  - [ ] Critical user flows tested
  - [ ] Multi-locale testing (EN/AR)
  - [ ] Multi-role testing (Admin, Tenant, Vendor)

### Staging Environment

- [ ] **Staging deployment**
  - [ ] Staging environment mirrors production
  - [ ] Staging database (copy of production)
  - [ ] All features tested in staging
  - [ ] Performance tested in staging

- [ ] **Smoke tests**
  - [ ] User registration
  - [ ] User login/logout
  - [ ] Create work order
  - [ ] Upload attachment
  - [ ] Send notification

- [ ] **User acceptance testing (UAT)**
  - [ ] Key stakeholders test critical flows
  - [ ] Feedback collected and addressed
  - [ ] Sign-off obtained

### Security Testing

- [ ] **Vulnerability scanning**
  - [ ] npm audit: `pnpm audit`
  - [ ] Dependencies up to date
  - [ ] OWASP Top 10 reviewed
  - [ ] Penetration testing (optional)

- [ ] **Security headers verified**
  - [ ] securityheaders.com scan
  - [ ] SSL Labs test: A rating
  - [ ] CORS configuration tested

## Deployment

### Pre-Deployment Steps

- [ ] **Final checks**
  - [ ] All environment variables set
  - [ ] Database migrations run
  - [ ] Indexes created
  - [ ] Backups verified

- [ ] **Communication**
  - [ ] Maintenance window announced
  - [ ] Support team notified
  - [ ] Status page updated
  - [ ] Rollback plan reviewed

### Deployment Process

#### Vercel Deployment

- [ ] **Deploy to production**

  ```bash
  git push origin main
  ```

  - [ ] Build successful
  - [ ] Deployment preview checked
  - [ ] Promote to production

- [ ] **Verify deployment**
  - [ ] Production URL accessible
  - [ ] Health check passes: `/api/health`
  - [ ] Database connection verified
  - [ ] Static assets loading

#### Manual Deployment (AWS/GCP/Azure)

- [ ] **Build application**

  ```bash
  pnpm install --frozen-lockfile
  pnpm build
  ```

- [ ] **Deploy artifacts**
  - [ ] Upload build to servers
  - [ ] Start application: `pnpm start`
  - [ ] Verify process running

- [ ] **Update infrastructure**
  - [ ] Update load balancer
  - [ ] Update DNS records (if needed)
  - [ ] Enable auto-scaling

### Post-Deployment Verification

- [ ] **Smoke tests**
  - [ ] Homepage loads: https://your-domain.com
  - [ ] Login works
  - [ ] Dashboard loads
  - [ ] API responds: `/api/health`
  - [ ] Database queries work

- [ ] **Monitoring checks**
  - [ ] No error spikes in Sentry
  - [ ] Response times normal (<500ms)
  - [ ] Database connections stable
  - [ ] No 5xx errors

- [ ] **Functional verification**
  - [ ] Create test work order
  - [ ] Upload test file
  - [ ] Send test notification
  - [ ] Generate test report

## Post-Deployment

### Immediate Actions (First Hour)

- [ ] **Monitor dashboards**
  - [ ] Application metrics
  - [ ] Error rates
  - [ ] Response times
  - [ ] Database performance

- [ ] **Verify features**
  - [ ] Critical user flows tested
  - [ ] All roles can login
  - [ ] OAuth providers working
  - [ ] Email/SMS notifications working

- [ ] **Communication**
  - [ ] Deployment announcement sent
  - [ ] Status page updated: "Operational"
  - [ ] Support team notified: "Monitoring"

### First 24 Hours

- [ ] **Continuous monitoring**
  - [ ] Check dashboards every 2 hours
  - [ ] Review error logs
  - [ ] Monitor user feedback
  - [ ] Track performance metrics

- [ ] **Data validation**
  - [ ] Database integrity checked
  - [ ] No data loss
  - [ ] Backups running
  - [ ] Audit logs verified

### First Week

- [ ] **Performance review**
  - [ ] Response time analysis
  - [ ] Error rate analysis
  - [ ] Resource utilization review
  - [ ] User feedback collected

- [ ] **Optimization**
  - [ ] Identify slow queries
  - [ ] Optimize hot paths
  - [ ] Adjust cache TTLs
  - [ ] Tune database indexes

- [ ] **Documentation**
  - [ ] Deployment log completed
  - [ ] Issues log maintained
  - [ ] Lessons learned documented
  - [ ] Runbook updated

## Rollback Plan

### Rollback Decision Criteria

Rollback if:

- [ ] Error rate >5%
- [ ] Response time >2s for >10 minutes
- [ ] Database connection failures
- [ ] Critical feature broken
- [ ] Security vulnerability discovered

### Rollback Procedure

#### Vercel

1. **Instant rollback**

   ```bash
   # From Vercel dashboard: "Rollback to Previous Deployment"
   ```

   - [ ] Select previous deployment
   - [ ] Click "Promote to Production"
   - [ ] Verify rollback successful

#### Manual Deployment

1. **Revert code**

   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Redeploy previous version**

   ```bash
   git checkout <previous-commit>
   pnpm build
   # Deploy using your process
   ```

3. **Database rollback** (if migrations ran)
   ```bash
   # Restore from backup
   mongorestore --uri="mongodb+srv://..." --dir=./backup
   ```

### Post-Rollback

- [ ] **Root cause analysis**
  - [ ] Identify what went wrong
  - [ ] Document failure
  - [ ] Create action items

- [ ] **Communication**
  - [ ] Notify stakeholders
  - [ ] Update status page
  - [ ] Explain in post-mortem

## Sign-Off

### Deployment Approval

- [ ] **Technical sign-off**
  - Approved by: **\*\***\_\_\_\_**\*\***
  - Date: **\*\***\_\_\_\_**\*\***

- [ ] **Business sign-off**
  - Approved by: **\*\***\_\_\_\_**\*\***
  - Date: **\*\***\_\_\_\_**\*\***

- [ ] **Security sign-off**
  - Approved by: **\*\***\_\_\_\_**\*\***
  - Date: **\*\***\_\_\_\_**\*\***

### Go-Live Confirmation

- [ ] **Deployment completed successfully**
  - Deployed by: **\*\***\_\_\_\_**\*\***
  - Deployment time: **\*\***\_\_\_\_**\*\***
  - Production URL: **\*\***\_\_\_\_**\*\***

- [ ] **Monitoring active**
  - All monitors configured
  - All alerts configured
  - Team on-call assigned

- [ ] **Documentation complete**
  - Deployment log finalized
  - Runbook updated
  - Team briefed

---

## Additional Resources

- [PRODUCTION_MONGODB_SETUP.md](./PRODUCTION_MONGODB_SETUP.md) - MongoDB setup guide
- [PRODUCTION_TESTING_SETUP.md](./PRODUCTION_TESTING_SETUP.md) - Testing guide
- [README.md](../README.md) - Application overview
- [.env.example](../.env.example) - Environment variables reference

## Support Contacts

- **Technical Lead**: **\*\***\_\_\_\_**\*\***
- **DevOps**: **\*\***\_\_\_\_**\*\***
- **Database Admin**: **\*\***\_\_\_\_**\*\***
- **On-Call**: **\*\***\_\_\_\_**\*\***

## Emergency Contacts

- **Platform Support**: **\*\***\_\_\_\_**\*\***
- **MongoDB Atlas**: https://support.mongodb.com
- **Vercel Support**: https://vercel.com/support

---

**Last Updated**: November 21, 2025
**Next Review**: [Schedule quarterly reviews]
