# Operations Runbook

This runbook provides step-by-step procedures for common operational tasks and incident response.

## Table of Contents
1. [Deployment Procedures](#deployment-procedures)
2. [Incident Response](#incident-response)
3. [Database Operations](#database-operations)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Rollback Procedures](#rollback-procedures)
6. [Scaling Operations](#scaling-operations)

---

## Deployment Procedures

### Standard Deployment (Vercel)

**Prerequisites:**
- All tests passing on main branch
- PR approved and merged
- No active incidents

**Steps:**
```bash
# 1. Verify build locally
pnpm build

# 2. Push to main (auto-triggers Vercel deployment)
git push origin main

# 3. Monitor deployment in Vercel dashboard
# https://vercel.com/fixzit/fixzit

# 4. Verify deployment
curl -I https://fixzit.com/api/health

# 5. Run smoke tests
pnpm test:e2e:smoke
```

### Hotfix Deployment

**When to use:** Critical production issues requiring immediate fix.

```bash
# 1. Create hotfix branch from main
git checkout main && git pull
git checkout -b hotfix/critical-issue-description

# 2. Apply fix, commit
git add -A
git commit -m "fix: critical issue description"

# 3. Push and create PR
git push -u origin HEAD
gh pr create --fill --title "HOTFIX: Critical issue"

# 4. Get emergency approval (Slack #engineering)

# 5. Merge and monitor
gh pr merge --squash
```

### Database Migration

**ALWAYS backup before migrations!**

```bash
# 1. Create backup
mongodump --uri="$MONGODB_URI" --out=backup-$(date +%Y%m%d-%H%M%S)

# 2. Test migration on staging
pnpm db:migrate --env=staging

# 3. Verify staging functionality
# Manual testing + automated tests

# 4. Apply to production
pnpm db:migrate --env=production

# 5. Verify production
curl https://fixzit.com/api/health
```

### Staging Promotion Flow (pre-prod ➜ prod)

1. **Deploy to staging**: `vercel --prod=false` (or staging environment pipeline).
2. **Smoke + auth checks**:
   - `pnpm lint && pnpm typecheck`
   - `pnpm run bundle:budget:report` (fail if budgets exceeded)
   - `pnpm audit --prod --audit-level=high`
   - `pnpm test:e2e` (or minimal `qa/tests/*.spec.ts`)
3. **Health gates** (staging):
   - `/api/health/ready` returns `{"ready": true}`; p95 < 1.5s for 5 minutes
   - Error rate < 1% across staging Sentry project
4. **Promotion checklist**:
   - Secrets parity verified (`guard:prod-env`, `check:env`)
   - Feature flags match intended rollout (`lib/feature-flags.ts` + env overrides)
   - Migrations applied and verified (dry-run logs saved)
5. **Promote to production**:
   - Tag release: `git tag -a vX.Y.Z -m "Promote staging to prod"`; push tag
   - Promote staging build in Vercel (or redeploy from tag)
6. **Post-promotion**:
   - Watch alerts for 30 minutes (see thresholds below)
   - If SEV-1/2 triggered, rollback to previous deployment and open incident

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|--------------|----------|
| SEV-1 | Complete outage | 15 minutes | Site down, data loss |
| SEV-2 | Major degradation | 30 minutes | Payment failures, auth broken |
| SEV-3 | Minor degradation | 2 hours | Slow performance, non-critical feature broken |
| SEV-4 | Low impact | Next business day | UI glitch, minor bug |

### SEV-1 Response Procedure

1. **Acknowledge** (within 5 minutes)
   ```
   # Post in #incidents Slack channel
   @channel SEV-1 INCIDENT: [Brief description]
   Status: Investigating
   Impact: [User-facing impact]
   Lead: [Your name]
   ```

2. **Assess** (within 10 minutes)
   - Check error monitoring (Sentry)
   - Check infrastructure metrics (Vercel/MongoDB Atlas)
   - Check recent deployments
   - Check external dependencies

3. **Communicate** (every 15 minutes)
   ```
   UPDATE [TIME]:
   - Current status: [Investigating/Mitigating/Resolved]
   - Findings: [What we know]
   - Next steps: [What we're doing]
   - ETA: [If known]
   ```

4. **Mitigate**
   - Rollback if deployment-related
   - Scale resources if capacity issue
   - Failover if infrastructure issue
   - Contact vendor if third-party issue

5. **Resolve & Document**
   - Confirm resolution
   - Update status page
   - Create post-mortem document
   - Schedule retrospective

### Common Issues & Fixes

#### API 500 Errors
```bash
# Check error logs
vercel logs --filter=error

# Check MongoDB connectivity
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"

# Restart function instances (Vercel)
vercel redeploy --force
```

#### Authentication Failures
```bash
# Check session store
redis-cli -h $REDIS_HOST KEYS "session:*" | head -10

# Verify auth configuration
curl https://fixzit.com/api/auth/session

# Clear auth cache if needed
redis-cli -h $REDIS_HOST FLUSHDB
```

#### High Memory Usage
```bash
# Check Node.js memory
# In Vercel function logs, look for:
# "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed"

# Solution: Optimize queries, add pagination
# Temporary: Increase function memory in vercel.json
```

#### Database Slow Queries
```bash
# Check slow query log in MongoDB Atlas
# Performance > Profiler

# Common fixes:
# 1. Add missing index
db.workOrders.createIndex({ organizationId: 1, status: 1 })

# 2. Limit returned documents
# 3. Use projection to reduce payload
```

---

## Database Operations

### Backup & Restore

```bash
# Manual backup
mongodump --uri="$MONGODB_URI" \
  --out=/backups/manual-$(date +%Y%m%d-%H%M%S)

# Restore specific collection
mongorestore --uri="$MONGODB_URI" \
  --nsInclude="fixzit.workOrders" \
  /backups/manual-20240115-120000/fixzit/workOrders.bson

# Point-in-time recovery (Atlas)
# Use Atlas UI: Database > Backup > Point-in-Time Restore
```

### Index Management

```bash
# Check index usage
db.workOrders.aggregate([
  { $indexStats: {} }
])

# Create index (background)
db.workOrders.createIndex(
  { organizationId: 1, createdAt: -1 },
  { background: true, name: "idx_org_created" }
)

# Drop unused index
db.workOrders.dropIndex("idx_unused")
```

### Data Cleanup

```bash
# Remove old audit logs (> 2 years)
db.auditLogs.deleteMany({
  createdAt: { $lt: new Date(Date.now() - 2*365*24*60*60*1000) }
})

# Archive old work orders
db.workOrders.aggregate([
  { $match: { status: "closed", closedAt: { $lt: new Date("2022-01-01") } } },
  { $out: "workOrders_archive_2021" }
])
```

---

## Monitoring & Alerts

### Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `/api/health` | Basic health | `{"status": "ok"}` |
| `/api/health/db` | Database connectivity | `{"mongodb": "connected"}` |
| `/api/health/redis` | Redis connectivity | `{"redis": "connected"}` |

### Alert Thresholds (production)

- **Error rate**: >2% for 5 minutes (SEV-2); >5% for 2 minutes (SEV-1)
- **Latency**: p95 > 1500ms for 5 minutes; p99 > 2500ms for 2 minutes
- **Availability**: `/api/health/ready` fails twice in 3 minutes
- **Queue depth**: >1000 jobs for 10 minutes (notifications/email/OTP)
- **Resource**: CPU > 80% or memory > 85% for 10 minutes; disk > 90%
- **Payments**: PayTabs failure rate > 3% or 10 consecutive failures
- **DB connectivity**: MongoDB connection failures > 0 in a 60s window

### Alert Response Matrix

| Alert | First Response | Escalation |
|-------|---------------|------------|
| High Error Rate | Check logs, recent deploys | Rollback if needed |
| Database Down | Check Atlas status, failover | Contact MongoDB support |
| Payment Failures | Check PayTabs status | Contact PayTabs support |
| High Memory | Restart services | Investigate memory leaks |

### Alerting Playbook

1. **Acknowledge** within SLA (see Incident Response).
2. **Stabilize**: scale up temporarily, enable maintenance flag if needed, throttle background jobs.
3. **Inspect**: Sentry spikes, Vercel logs for regressions, Mongo/Redis dashboards for saturation.
4. **Decide**: rollback recent deploy vs. disable feature flag vs. hotfix branch.
5. **Communicate**: update #incidents every 15 minutes until resolved.

---

## Rollback Procedures

### Vercel Rollback

```bash
# List recent deployments
vercel ls --limit 10

# Promote previous deployment
vercel rollback [deployment-url]

# Or via UI: Vercel Dashboard > Deployments > ... > Promote to Production
```

### Database Rollback

```bash
# 1. Stop application traffic (maintenance mode)
vercel env add MAINTENANCE_MODE true

# 2. Restore from backup
mongorestore --uri="$MONGODB_URI" \
  --drop \
  /backups/pre-migration-20240115

# 3. Re-enable traffic
vercel env rm MAINTENANCE_MODE
```

### Feature Flag Rollback

```bash
# Disable feature via environment variable
vercel env add FEATURE_NEW_DASHBOARD disabled

# Or via config API
curl -X PATCH https://fixzit.com/api/admin/features \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"feature": "new_dashboard", "enabled": false}'
```

---

## Scaling Operations

### Horizontal Scaling (Automatic with Vercel)

Vercel automatically scales based on traffic. Monitor:
- Function invocations
- Concurrent executions
- Edge cache hit rate

### Database Scaling

```bash
# MongoDB Atlas: Cluster > Configuration > Scale
# Options:
# - M10 (Dev): 2GB RAM, 10GB storage
# - M30 (Prod): 8GB RAM, 40GB storage
# - M50 (High): 16GB RAM, 80GB storage

# Enable auto-scaling in Atlas UI
# Cluster > Configuration > Auto-scale
```

### Redis Scaling

```bash
# Upstash Redis: Dashboard > Database > Scale
# Free: 10K commands/day
# Pro: 100K commands/day
# Enterprise: Unlimited
```

### CDN & Edge Optimization

```bash
# Purge CDN cache
vercel redeploy --force

# Pre-warm cache for critical paths
curl -s https://fixzit.com/ > /dev/null
curl -s https://fixzit.com/api/health > /dev/null
```

---

## Maintenance Windows

### Scheduled Maintenance

1. **Announce** (7 days before)
   - Email to users
   - In-app notification
   - Status page update

2. **Reminder** (24 hours before)
   - Email reminder
   - Banner in application

3. **Execute**
   - Enable maintenance mode
   - Perform maintenance
   - Verify functionality
   - Disable maintenance mode

4. **Confirm**
   - Status page update
   - Confirmation email

### Maintenance Mode

```bash
# Enable
vercel env add MAINTENANCE_MODE true
vercel redeploy

# Custom message
vercel env add MAINTENANCE_MESSAGE "Scheduled maintenance until 10:00 AM GMT"

# Disable
vercel env rm MAINTENANCE_MODE
vercel env rm MAINTENANCE_MESSAGE
vercel redeploy
```

---

## Contact Information

### Internal

| Role | Contact | Escalation |
|------|---------|------------|
| On-Call Engineer | Slack #on-call | PagerDuty |
| Engineering Lead | Slack @eng-lead | Phone |
| CTO | Slack @cto | Phone (emergencies) |

### External

| Service | Support | SLA |
|---------|---------|-----|
| Vercel | support@vercel.com | Business hours |
| MongoDB Atlas | Cloud Portal | 24/7 (Enterprise) |
| PayTabs | merchant.support@paytabs.com | Business hours |
| Taqnyat | support@taqnyat.sa | Business hours |

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-01-01 | 1.0 | Engineering Team | Initial runbook |
