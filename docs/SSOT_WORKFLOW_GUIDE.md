# Fixzit SSOT Backlog Sync & Verification Workflow Guide

**Version**: 1.0  
**Last Updated**: 2025-12-13  
**Owner**: Eng. Sultan Al Hassni

---

## Overview

This guide outlines the end-to-end developer workflow for maintaining Fixzit's Single Source of Truth (SSOT) backlog and performing system verification using VS Code on macOS. The Fixzit platform is built with Next.js (App Router), MongoDB (via Mongoose), Tailwind CSS, and follows strict layout/branding governance.

**Key Concepts:**
- **SSOT File**: `docs/PENDING_MASTER.md` - The canonical backlog
- **Audit Files**: `docs/BACKLOG_AUDIT.md` and `docs/BACKLOG_AUDIT.json` - Structured extracts
- **Import API**: `POST /api/issues/import` - Syncs issues to MongoDB
- **Issue Models**: `server/models/Issue.ts` and `server/models/IssueEvent.ts`

---

## 1. Environment Setup (.env.local)

Before running the app, configure your local environment variables:

### Required Variables

```bash
# Copy template
cp .env.local.template .env.local
```

Edit `.env.local`:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/fixzit
# Or for Atlas: mongodb+srv://user:pass@cluster.mongodb.net/fixzit

# NextAuth (required)
NEXTAUTH_SECRET=<your-random-32+char-secret>
NEXTAUTH_URL=http://localhost:3000

# Super Admin Emergency Access
SUPERADMIN_SECRET_KEY=<some-strong-random-string>

# Dev OTP Bypass (optional, dev only)
NEXTAUTH_SUPERADMIN_BYPASS_OTP=true
NEXTAUTH_BYPASS_OTP_CODE=000000
```

### Optional Dev Credentials

```bash
DEMO_SUPERADMIN_PASSWORD=admin123
DEMO_DEFAULT_PASSWORD=password123
```

> ⚠️ Never commit `.env.local` to version control.

---

## 2. Running the Local Dev Server & Super Admin Access

### Start Development Server

```bash
# Install dependencies
pnpm install

# Start Next.js dev server
pnpm dev
```

Access the app at `http://localhost:3000`.

### Super Admin Emergency Login

Navigate to `http://localhost:3000/superadmin/login`:

1. Enter the `SUPERADMIN_SECRET_KEY` value from your `.env.local`
2. Or use SuperAdmin credentials (`superadmin@fixzit.co` + password)
3. With OTP bypass enabled, no SMS code is required

### Troubleshooting

- Ensure MongoDB is running
- Verify SuperAdmin user exists in database
- Check OTP bypass flags are set
- Run setup script if needed: `pnpm exec tsx scripts/setup-production-superadmin.ts`

---

## 3. Syncing Backlog Issues from SSOT (PENDING_MASTER.md)

### Import Script

```bash
# Parse PENDING_MASTER.md and import to MongoDB
pnpm exec tsx scripts/issue-log.ts import docs/BACKLOG_AUDIT.json
```

### How It Works

1. Script parses the JSON file containing extracted issues
2. POSTs to `/api/issues/import` endpoint
3. Each issue gets a `sourceHash` for deduplication
4. Existing issues are updated, new ones created

### Verify Import

```bash
# Check via API (requires auth)
curl http://localhost:3000/api/issues

# Or check database directly
mongosh fixzit --eval "db.issues.countDocuments()"
```

---

## 4. Running the Backlog Extractor (v2.2)

The Backlog Extractor processes `PENDING_MASTER.md` into structured formats.

### Run Extraction

1. Ensure `docs/PENDING_MASTER.md` is up-to-date
2. Run the extractor (via AI prompt or script)
3. Save outputs:
   - `docs/BACKLOG_AUDIT.md` - Human-readable summary
   - `docs/BACKLOG_AUDIT.json` - Machine-readable JSON

### Expected JSON Structure

```json
{
  "generatedAt": "2025-12-13T22:00:00+03:00",
  "issues": [
    {
      "key": "unique-issue-key",
      "title": "Issue title",
      "category": "bug|security|feature|test|docs",
      "priority": "P0|P1|P2|P3",
      "status": "pending|in_progress|completed",
      "location": "path/to/file.ts",
      "sourceRef": "docs/PENDING_MASTER.md:123-125",
      "evidenceSnippet": "Code or description snippet"
    }
  ]
}
```

---

## 5. Importing the Backlog Audit JSON

### Via CLI

```bash
pnpm exec tsx scripts/issue-log.ts import docs/BACKLOG_AUDIT.json

# Dry run (no changes)
pnpm exec tsx scripts/issue-log.ts import docs/BACKLOG_AUDIT.json --dry-run
```

### Via cURL (Direct API)

```bash
curl -X POST http://localhost:3000/api/issues/import \
     -H "Content-Type: application/json" \
     --cookie "next-auth.session-token=<session-cookie>" \
     -d @docs/BACKLOG_AUDIT.json
```

### Import Response

```json
{
  "result": {
    "created": 5,
    "updated": 2,
    "skipped": 10,
    "errors": []
  }
}
```

---

## 6. SSOT Lifecycle: Extract → Sync → Execute → Update

### The Cycle

```
┌─────────────────────────────────────────────────────────┐
│                    SSOT LIFECYCLE                        │
├─────────────────────────────────────────────────────────┤
│  1. EXTRACT                                              │
│     └─ Run Backlog Extractor on PENDING_MASTER.md       │
│        Output: BACKLOG_AUDIT.md + BACKLOG_AUDIT.json    │
│                                                          │
│  2. SYNC                                                 │
│     └─ Import JSON via /api/issues/import               │
│        Database now mirrors SSOT                         │
│                                                          │
│  3. EXECUTE                                              │
│     └─ Work ONLY on issues in database                  │
│        No work on untracked items                        │
│                                                          │
│  4. UPDATE                                               │
│     └─ PATCH issue status via /api/issues/[id]          │
│        IssueEvent created automatically                  │
│        Update PENDING_MASTER.md to reflect changes      │
└─────────────────────────────────────────────────────────┘
```

### Status Updates

```bash
# Update issue status
curl -X PATCH http://localhost:3000/api/issues/<issue-id> \
     -H "Content-Type: application/json" \
     --cookie "next-auth.session-token=<session>" \
     -d '{"status": "completed"}'
```

### Key Rules

- **Only work on DB-tracked issues**
- **Always PATCH status when completing work**
- **IssueEvent logs all changes automatically**
- **Sync PENDING_MASTER.md after significant changes**

---

## 7. Agent Safety & Governance Guardrails

### 🚨 NON-NEGOTIABLE RULES

When using AI agents for automated fixes:

#### 1. Never Overwrite Layout/Branding

- ❌ Do NOT change core layout, colors, or DOM structure
- ❌ Do NOT relocate or restyle UI components
- ✅ Fix functionality without altering design

#### 2. Always Snapshot Before/After

```
For each change:
1. Take screenshot BEFORE
2. Apply fix
3. Wait 10 seconds
4. Take screenshot AFTER
5. Compare for unintended changes
```

#### 3. Halt–Fix–Verify Per Page × Role

```
For each (page, role) combination:
1. Navigate to page
2. IF error detected:
   a. HALT immediately
   b. FIX root cause
   c. VERIFY same page
   d. IF still broken, repeat
3. ONLY THEN proceed to next page
```

#### 4. Fix Root Cause Only

- ❌ Do NOT suppress/silence errors
- ❌ Do NOT add bypasses to pass tests
- ❌ Do NOT comment out failing code
- ✅ Trace to root cause and fix properly

#### 5. Provide Evidence for Every Change

For each fix, provide:
- Screenshot(s) showing working state
- Console/log output confirming fix
- Git commit hash
- Root cause + fix summary

---

## Quick Reference Commands

```bash
# Environment
cp .env.local.template .env.local

# Development
pnpm install
pnpm dev

# Import Issues
pnpm exec tsx scripts/issue-log.ts import docs/BACKLOG_AUDIT.json
pnpm exec tsx scripts/issue-log.ts import docs/BACKLOG_AUDIT.json --dry-run

# Verification
pnpm typecheck
pnpm lint
pnpm test
pnpm build

# Database
pnpm exec tsx scripts/sync-indexes.ts
```

---

## Related Documents

- [AGENTS.md](../AGENTS.md) - Agent working agreement
- [BACKLOG_AUDIT.md](./BACKLOG_AUDIT.md) - Current backlog audit
- [copilot-instructions.md](../.github/copilot-instructions.md) - Master instruction v5.1

---

**End of SSOT Workflow Guide**
