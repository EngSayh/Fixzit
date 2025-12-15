# MongoDB Backlog Tracker - Implementation Summary

## Overview

The MongoDB Backlog Tracker provides a production-ready system for managing the PENDING_MASTER.md backlog with a hidden `/superadmin` portal accessible even when NextAuth is broken.

## Features

### 1. Database Models
- **BacklogIssue**: Main issue tracking model with priority, effort, impact, risk tags
- **BacklogEvent**: Audit trail for all issue changes (import, status changes, comments)

### 2. Parser (`lib/backlog/parsePendingMaster.ts`)
- Parses PENDING_MASTER.md markdown
- Detects pending vs done markers (✅ 🔲 🟡 etc.)
- Extracts issues from tables, bullets, headers
- Categorizes by section (bug, logic, test, efficiency, next_step)
- Captures date headers for source tracking

### 3. Importer (`lib/backlog/importPendingMaster.ts`)
- **ML-like triage**: Infers priority/effort/risk from text patterns
  - P0: cross-tenant, data leak, RBAC bypass, auth bypass
  - P1: authorization, ownership, permission issues
  - P2: missing tests, slow queries, optimization
  - P3: all others
- **Risk tags**: SECURITY, MULTI-TENANT, FINANCIAL, TEST-GAP, PERF, DATA
- **Effort estimates**: XS (one-liner), S (single file), M (multiple files), L (migration), XL (redesign)
- **Upsert logic**: Preserves existing issues, updates metadata, tracks mentions

### 4. Authentication
- **JWT-based**: 12-hour sessions via __Host- cookies
- **Separate from NextAuth**: Works even when NextAuth is broken
- **IP allowlist**: Optional SUPERADMIN_IP_ALLOWLIST env var
- **Rate limiting**: 5 attempts per minute per IP

### 5. API Routes

#### POST /api/superadmin/login
- Authenticates with SUPERADMIN_USERNAME + SUPERADMIN_PASSWORD_HASH
- Returns JWT in __Host-fixzit_superadmin cookie

#### POST /api/superadmin/logout
- Clears session cookie

#### GET /api/superadmin/issues
- Returns filtered issues (status, priority, category)
- Sorted by priority + impact
- Max 100 results

#### POST /api/superadmin/issues
- Update issue status
- Add comments
- Creates audit events

#### POST /api/superadmin/issues/import
- Reads PENDING_MASTER.md
- Parses + imports with triage
- Returns upserted count

#### GET /api/superadmin/issues/report
- Aggregates by status/priority/category
- Supports JSON or Markdown format

### 6. UI Pages

#### /superadmin/login
- Clean login form
- Error handling
- Rate limit protection

#### /superadmin/issues
- Filterable issue list (status, priority, category)
- Inline status updates
- Import button (reads PENDING_MASTER.md)
- Logout button

## Environment Variables

### Required
```bash
SUPERADMIN_USERNAME=admin
SUPERADMIN_PASSWORD_HASH=<bcrypt hash>
SUPERADMIN_SESSION_SECRET=<32+ random chars>
```

### Optional
```bash
SUPERADMIN_IP_ALLOWLIST=192.168.1.0,10.0.0.0  # Comma-separated IPs
```

### Generate Password Hash
```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('your-password', 10).then(console.log)"
```

## Deployment Checklist

### 1. Set Environment Variables in Vercel
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Add SUPERADMIN_USERNAME (Production + Preview)
- Add SUPERADMIN_PASSWORD_HASH (Production + Preview, mark as Sensitive)
- Add SUPERADMIN_SESSION_SECRET (Production + Preview, mark as Sensitive)
- Optional: Add SUPERADMIN_IP_ALLOWLIST

### 2. Deploy Branch
```bash
git push origin feat/mongodb-backlog-tracker
```

### 3. Verify Deployment
- Visit https://fixzit-git-feat-mongodb-backlog-tracker-XXXX.vercel.app/superadmin/login
- Login with SUPERADMIN_USERNAME + password
- Click "Import from PENDING_MASTER.md"
- Verify issues appear in dashboard

### 4. MongoDB Indexes
Indexes are created automatically on first deployment. Verify via Atlas UI:
```javascript
db.backlog_issues.getIndexes()
// Expected: key, externalId, category, priority, effort, impact, status, priority+impact+updatedAt, location.file+status

db.backlog_events.getIndexes()
// Expected: issueKey+createdAt
```

### 5. Security Verification
- ✅ JWT cookies use __Host- prefix (Secure, HttpOnly, SameSite=Strict)
- ✅ Rate limiting (5 attempts/min)
- ✅ IP allowlist (if configured)
- ✅ Password hashing (bcrypt)
- ✅ Middleware protection (all /superadmin/* routes require auth)

## File Structure

```
lib/
  db/
    mongoose.ts              # MongoDB connection pooling
  backlog/
    parsePendingMaster.ts    # Markdown parser
    importPendingMaster.ts   # Upsert + triage logic
  superadmin/
    session.ts               # JWT sign/verify
    require.ts               # Auth helper

server/models/
  BacklogIssue.ts            # Issue schema
  BacklogEvent.ts            # Event schema

app/api/superadmin/
  login/route.ts             # POST /api/superadmin/login
  logout/route.ts            # POST /api/superadmin/logout
  issues/
    route.ts                 # GET/POST /api/superadmin/issues
    import/route.ts          # POST /api/superadmin/issues/import
    report/route.ts          # GET /api/superadmin/issues/report

app/superadmin/
  login/page.tsx             # Login UI
  issues/page.tsx            # Dashboard UI
```

## Usage

### Import Issues
1. Login to /superadmin/login
2. Click "Import from PENDING_MASTER.md"
3. Issues are parsed, triaged, and imported
4. Duplicates are updated (mentionCount incremented)

### Manage Issues
- **Filter**: By status, priority, or category
- **Update**: Change status via dropdown (pending → in_progress → resolved → wont_fix)
- **Track**: All changes logged in backlog_events

### Generate Reports
```bash
# JSON report
curl https://fixzit.vercel.app/api/superadmin/issues/report \
  -H "Cookie: __Host-fixzit_superadmin=<token>"

# Markdown report
curl https://fixzit.vercel.app/api/superadmin/issues/report?format=markdown \
  -H "Cookie: __Host-fixzit_superadmin=<token>"
```

## Triage Examples

### Priority Inference
```
"Cross-tenant data leak in Work Orders" → P0 + SECURITY + MULTI-TENANT
"Authorization check missing in /api/finance" → P1 + SECURITY + FINANCIAL
"Missing test coverage for RBAC" → P2 + TEST-GAP
"Refactor property selector" → P3
```

### Effort Inference
```
"Add index on org_id" → XS
"Add org_id filter to query" → S
"Write test suite for auth module" → M
"Migrate legacy payment records" → L
"Redesign RBAC system" → XL
```

### Risk Tags
- **SECURITY**: auth, rbac, permission
- **MULTI-TENANT**: tenant, vendor_id, org_id
- **FINANCIAL**: payment, invoice, billing
- **TEST-GAP**: test, coverage, flaky
- **PERF**: index, slow, optimize, lean()
- **DATA**: migration, backfill, integrity

## Architecture

### Connection Pooling
- Singleton pattern with globalThis caching
- Survives Next.js hot reloads
- Reuses connection across serverless invocations
- maxPoolSize: 10, serverSelectionTimeout: 10s

### Session Management
- JWT with HS256 (HMAC-SHA256)
- 12-hour TTL (43,200 seconds)
- __Host- prefix enforces:
  - Secure flag (HTTPS only)
  - Path=/ (no subdomain leaks)
  - No Domain (prevents cross-domain)

### Middleware Integration
- Middleware already protects /superadmin/* routes
- Uses lib/superadmin/auth.ts (existing)
- IP allowlist + session verification
- Redirects to /superadmin/login on auth failure

## Benefits

1. **Always Accessible**: Works when NextAuth is broken
2. **Hidden Portal**: /superadmin not listed in public nav
3. **Live Backlog**: Beyond static markdown files
4. **ML-like Triage**: Automatic priority/effort/risk inference
5. **Audit Trail**: Every change logged in backlog_events
6. **Scalable**: MongoDB + connection pooling
7. **Secure**: JWT, bcrypt, rate limiting, IP allowlist

## Next Steps

1. **Documentation**: Write docs/BACKLOG_TRACKER.md (usage guide)
2. **Testing**: Add Vitest tests for parser + importer
3. **Notifications**: Email/Slack on P0 imports
4. **Dashboards**: Charts for priority/category distribution
5. **CLI**: pnpm backlog:import script for local imports

## Commit

Branch: `feat/mongodb-backlog-tracker`  
Commit: `7c063256b`  
Files: 10 new files, 532 lines  
Status: ✅ Pushed to origin

---

Ready for PR review and deployment to Vercel Preview.
