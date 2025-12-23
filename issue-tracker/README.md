# 🎯 Issue Tracker System

A comprehensive development issue tracking system with MongoDB storage, Super Admin Dashboard, and CLI tools for VSCode integration.

## 📦 Features

- **MongoDB Schema**: Full-featured issue model with priorities, statuses, effort estimates, risk tags
- **REST API**: Complete CRUD operations with filtering, pagination, and search
- **Dashboard**: React-based Super Admin dashboard with stats, heat maps, and quick wins
- **CLI Tool**: Log issues directly from VSCode terminal
- **Import**: Bulk import from PENDING_MASTER.md format
- **Deduplication**: Automatic duplicate detection and mention tracking
- **Multi-tenant**: Organization-scoped data isolation

---

## 🚀 Quick Setup

### 1. Copy Files to Your Project

```bash
# Copy the model
cp issue-tracker/models/issue.ts your-project/models/

# Copy API routes
cp -r issue-tracker/app/api/issues your-project/app/api/

# Copy dashboard
cp -r issue-tracker/app/dashboard/issues your-project/app/dashboard/

# Copy CLI script
cp issue-tracker/scripts/issue-log.ts your-project/scripts/
```

### 2. Install Dependencies

```bash
npm install commander mongoose
# or
pnpm add commander mongoose
```

### 3. Add to package.json

```json
{
  "scripts": {
    "issue-log": "npx ts-node scripts/issue-log.ts"
  }
}
```

### 4. Environment Variables

Add to your `.env`:

```bash
# For CLI tool
ISSUE_API_URL=http://localhost:3000/api
ISSUE_API_TOKEN=your-api-token  # Optional: for authenticated requests
```

### 5. Database Index Migration

Run this in MongoDB shell or via a migration script:

```javascript
db.issues.createIndex({ orgId: 1, status: 1, priority: 1 });
db.issues.createIndex({ orgId: 1, category: 1, status: 1 });
db.issues.createIndex({ orgId: 1, module: 1, status: 1 });
db.issues.createIndex({ 'location.filePath': 1, status: 1 });
db.issues.createIndex({ issueId: 1 }, { unique: true });
db.issues.createIndex(
  { title: 'text', description: 'text', action: 'text', 'location.filePath': 'text' }
);
```

---

## 📋 CLI Usage

### Log a Bug

```bash
# Basic
pnpm issue-log bug "Cross-tenant data leak in budgets API" \
  --file app/api/fm/finance/budgets/route.ts \
  --line 119

# Full options
pnpm issue-log bug "Cross-tenant data leak" \
  --file app/api/fm/finance/budgets/route.ts \
  --line 119-129 \
  --priority P0 \
  --effort S \
  --action "Add unitId to tenant filter" \
  --dod "Query returns only unit-scoped budgets"
```

### Log a Logic Error

```bash
pnpm issue-log logic "KYC status set to approved prematurely" \
  --file services/souq/seller-kyc-service.ts \
  --line 262 \
  --priority P1 \
  --action "Keep status pending until all verification steps complete"
```

### Log a Missing Test

```bash
pnpm issue-log test "Cross-tenant POST rejection" \
  --file tests/unit/api/fm/finance/budgets.test.ts \
  --action "Add test asserting 400 when tenantId is cross-tenant"
```

### Log a Performance Issue

```bash
pnpm issue-log perf "Collection scan on budget search" \
  --file app/api/fm/finance/budgets/route.ts \
  --line 135-143 \
  --action "Add compound index { orgId, unitId, department, updatedAt }"
```

### List Issues

```bash
# All open issues
pnpm issue-log list --status open

# Critical issues only
pnpm issue-log list --priority P0,P1

# Quick wins
pnpm issue-log list --quick-wins

# Stale issues (>7 days)
pnpm issue-log list --stale

# By module
pnpm issue-log list --module fm
```

### View Statistics

```bash
pnpm issue-log stats
```

Output:
```
📊 Issue Tracker Statistics

══════════════════════════════════════════════════

📈 Summary
   Total Issues:    45
   Open:            32
   Critical (P0+P1):12
   Quick Wins:      8
   Stale (>7d):     5
   Avg Age:         4.2 days

🎯 By Priority
   🔴 P0 Critical:  4
   🟠 P1 High:      8
   🟡 P2 Medium:    20
   🟢 P3 Low:       13

🔥 Hottest Files
   1. services/souq/seller-kyc-service.ts (6 issues)
   2. app/api/fm/finance/budgets/route.ts (4 issues)
```

### Update Issue Status

```bash
# Mark in progress
pnpm issue-log update BUG-0001 --status in_progress

# Assign to someone
pnpm issue-log update BUG-0001 --assignee developer@company.com

# Add comment
pnpm issue-log update BUG-0001 --comment "Started investigation"

# Mark resolved
pnpm issue-log update BUG-0001 --status resolved
```

### Scan File for Issues

```bash
pnpm issue-log scan app/api/fm/finance/budgets/route.ts
```

### Import from PENDING_MASTER.md

```bash
# Preview first (dry run)
pnpm issue-log import ./PENDING_MASTER.md --dry-run

# Actually import
pnpm issue-log import ./PENDING_MASTER.md
```

### Interactive Mode

```bash
pnpm issue-log interactive
# or
pnpm issue-log i
```

---

## 🖥️ Dashboard Features

Access at: `/dashboard/issues`

### Summary Cards
- Total issues count
- Open issues requiring attention
- Critical (P0+P1) count
- Quick wins available
- Blocked items
- Average age

### Priority Distribution
- Visual breakdown of P0/P1/P2/P3

### File Heat Map
- Top 10 files with most issues
- Breakdown by category per file

### Quick Wins Panel
- Low effort + high impact items
- One-click to view details

### Stale Issues Panel
- Issues pending > 7 days
- Age tracking

### Filters
- Status (open, in_progress, blocked, resolved)
- Priority (P0, P1, P2, P3)
- Category (bug, logic_error, missing_test, efficiency)
- Module (fm, souq, auth, etc.)
- Search text
- Quick wins toggle
- Stale only toggle

### Issue Table
- Sortable columns
- Click to view/edit
- Pagination

---

## 🗃️ Database Schema

### Issue Document Structure

```typescript
{
  issueId: "BUG-0001",           // Auto-generated
  legacyId: "BUG-1714",          // From PENDING_MASTER.md
  title: "Cross-tenant data leak",
  description: "...",
  category: "bug",               // bug, logic_error, missing_test, efficiency, security
  priority: "P0",                // P0, P1, P2, P3
  status: "open",                // open, in_progress, in_review, blocked, resolved, closed
  effort: "S",                   // XS, S, M, L, XL
  
  location: {
    filePath: "app/api/fm/finance/budgets/route.ts",
    lineStart: 119,
    lineEnd: 129,
    functionName: "GET"
  },
  
  module: "fm",
  subModule: "finance",
  
  action: "Add unitId to tenant filter",
  rootCause: "buildTenantFilter only uses orgId",
  resolution: null,              // Filled when resolved
  suggestedPrTitle: "fix(fm): add unitId scoping to budget queries",
  
  riskTags: ["MULTI_TENANT", "SECURITY"],
  
  validation: {
    type: "test",
    command: "pnpm vitest run tests/unit/api/fm/finance/budgets.test.ts",
    expectedResult: "All tests pass"
  },
  
  definitionOfDone: "Query returns only unit-scoped budgets",
  acceptanceCriteria: [
    "GET returns 403 for cross-unit requests",
    "POST validates unitId ownership"
  ],
  
  dependencies: [],
  blockedBy: null,
  relatedIssues: [{ issueId: ObjectId, relationship: "related_to" }],
  
  reportedBy: "audit@system",
  assignedTo: "developer@company.com",
  reviewedBy: null,
  
  source: "import",              // manual, audit, import, ci_cd
  auditEntries: [{
    sessionId: "2025-12-13T18:10:27+03:00",
    timestamp: Date,
    findings: "..."
  }],
  mentionCount: 3,
  firstSeenAt: Date,
  lastSeenAt: Date,
  
  sprintReady: true,
  sprintId: "sprint-42",
  storyPoints: 2,
  
  comments: [{
    author: "developer@company.com",
    content: "Started investigation",
    createdAt: Date,
    isInternal: false
  }],
  
  statusHistory: [{
    from: "open",
    to: "in_progress",
    changedBy: "developer@company.com",
    changedAt: Date,
    reason: "Assigned to sprint"
  }],
  
  labels: ["security", "fm-finance"],
  externalLinks: {
    jira: "https://jira.company.com/browse/PROJ-123",
    github: "https://github.com/org/repo/issues/456"
  },
  
  orgId: ObjectId,
  
  createdAt: Date,
  updatedAt: Date,
  resolvedAt: null,
  closedAt: null
}
```

---

## 🔌 API Endpoints

### Issues CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/issues` | List issues with filters |
| POST | `/api/issues` | Create new issue |
| GET | `/api/issues/:id` | Get issue by ID |
| PATCH | `/api/issues/:id` | Update issue |
| DELETE | `/api/issues/:id` | Delete issue (super_admin only) |

### Statistics & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/issues/stats` | Get comprehensive statistics |

### Bulk Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/issues/import` | Import from PENDING_MASTER.md |

### Query Parameters

```
GET /api/issues?
  status=open,in_progress
  &priority=P0,P1
  &category=bug,logic_error
  &module=fm
  &search=tenant
  &quickWins=true
  &stale=true
  &file=budgets
  &sortBy=priority
  &sortOrder=desc
  &page=1
  &limit=20
```

---

## 🔐 Authorization

The system uses role-based access control:

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access + delete + bulk import |
| `admin` | Full CRUD except delete |
| `developer` | Full CRUD except delete |
| `viewer` | Read only |

---

## 📊 Priority Guidelines

| Priority | Criteria | SLA |
|----------|----------|-----|
| 🔴 **P0** | Security breach, data leak, cross-tenant, production down | Immediate |
| 🟠 **P1** | RBAC bypass, logic errors, compliance risk | 24-48 hrs |
| 🟡 **P2** | Missing tests, efficiency, UX issues | Sprint |
| 🟢 **P3** | Nice-to-have, refactoring, docs | Backlog |

---

## ⚡ Effort Estimates

| Size | Definition | Duration |
|------|------------|----------|
| **XS** | Config, one-liner | < 1 hour |
| **S** | Single file | 1-4 hours |
| **M** | Multi-file | 4-8 hours |
| **L** | Cross-module | 2-3 days |
| **XL** | Architectural | 1+ week |

---

## 🏷️ Risk Tags

| Tag | Usage |
|-----|-------|
| `SECURITY` | Auth, RBAC, permissions |
| `MULTI_TENANT` | Cross-org/unit issues |
| `FINANCIAL` | Billing, payments |
| `PERFORMANCE` | Speed, efficiency |
| `TEST_GAP` | Missing coverage |
| `DATA_INTEGRITY` | Data correctness |
| `INTEGRATION` | External APIs |
| `REGRESSION` | Previously fixed |

---

## 🔄 VSCode Integration Tips

### Add Keyboard Shortcut

In VSCode `keybindings.json`:

```json
{
  "key": "ctrl+shift+i",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "pnpm issue-log i\n" }
}
```

### Create Task

In `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Log Issue",
      "type": "shell",
      "command": "pnpm issue-log i",
      "problemMatcher": []
    },
    {
      "label": "View Issues Stats",
      "type": "shell", 
      "command": "pnpm issue-log stats",
      "problemMatcher": []
    }
  ]
}
```

### Create Snippet

In `.vscode/snippets/issue.code-snippets`:

```json
{
  "Log Bug Comment": {
    "prefix": "//bug",
    "body": [
      "// ISSUE-BUG-000: $1",
      "// File: ${TM_FILENAME}:${TM_LINE_NUMBER}",
      "// Action: $2"
    ]
  }
}
```

---

## 📈 Roadmap

- [ ] GitHub Issues sync
- [ ] Jira integration
- [ ] Slack notifications
- [ ] VSCode extension
- [ ] Auto-detection from ISSUE-tagged comments
- [ ] Sprint planning view
- [ ] Burndown charts
- [ ] Export to CSV/Excel

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit PR

---

## 📄 License

MIT
