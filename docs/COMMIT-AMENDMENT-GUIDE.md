# Commit Amendment Guide for SSOT Compliance

**Date:** 2026-01-03  
**Agent Token:** [AGENT-0005]  
**Purpose:** Amend existing commits to include proper Issue IDs

---

## Problem Statement

Two commits were pushed without proper SSOT logging:
- `44085ee0b` - Code quality fixes (24 issues)
- `bc64455b3` - Redis removal (1 infrastructure issue)

These commits violate AGENTS.md protocol which requires:
1. Log issue to SSOT **BEFORE** fixing
2. Include `[ISSUE-XXX]` in commit message

---

## Step 1: Import SSOT Entries First

Before amending commits, import the retroactive entries:

```bash
# Start the issue-tracker API (if not running)
cd issue-tracker
pnpm dev &

# Wait for API to start
sleep 5

# Import the retroactive entries
pnpm issue-log import ../docs/artifacts/SSOT-RETROACTIVE-ENTRIES-2026-01-03.json
```

---

## Step 2: Amend Commits with Interactive Rebase

### ⚠️ WARNING: This rewrites history

Only do this if:
- PR #656 is NOT yet merged
- No other agent has branched from your branch
- You have coordination with the team

### Option A: Amend Last Commit Only (Safest)

If you only need to fix the most recent commit:

```bash
git commit --amend -m "refactor(infra): Remove Redis dependency, migrate to in-memory queues [AGENT-0005] [INFRA-00002]

- Delete lib/redis.ts, lib/redis-client.ts, lib/otp-store-redis.ts
- Delete lib/stubs/bullmq.ts, lib/stubs/ioredis.ts
- Migrate jobs/export-worker.ts, package-activation-queue.ts
- Migrate jobs/search-index-jobs.ts, zatca-retry-queue.ts
- Update 15+ test files: @/lib/redis → @/lib/cache
- Remove ioredis/bullmq path aliases from tsconfig.json

48 files changed, 376 insertions(+), 2190 deletions(-)"

git push --force-with-lease origin HEAD
```

### Option B: Interactive Rebase (Both Commits)

```bash
# Find the commit BEFORE your first fix commit
git log --oneline -10

# Start interactive rebase from parent of 44085ee0b
git rebase -i <parent-commit-hash>

# In editor, change 'pick' to 'reword' for both commits:
# reword 44085ee0b fix(code-quality): ...
# reword bc64455b3 refactor(infra): ...

# Save and close editor

# Git will prompt for new commit messages:
```

**First commit message:**

```gitcommit
fix(code-quality): Race conditions, type safety, field mappings [AGENT-0005]

Issues Resolved:
[CORE-00001] Race condition in payments - transaction wrapper
[CORE-00002] Non-atomic counter - $inc operator
[CORE-00003] Missing Zod validation
[CORE-00004] Hardcoded SAR currency
[FM-00001] Vendor assignment transaction
[FM-00002] Duplicate check wrong field
[FM-00003] Missing _id in response
[CORE-00005] Missing EXECUTED enum
[SEC-00001] Timing-unsafe token comparison
[CORE-00006] Null check missing
[CORE-00007] Event bus init guard
[CORE-00008] Poll tie-breaking
[CORE-00009] God-mode pingDatabase try-catch
[CORE-00010] AI analytics demo response
[CORE-00011] Hardcoded fallback org ID
[AQAR-00001] buildingAge NaN
[AQAR-00002] Field mappings
[AQAR-00003] Status type mismatch
[FM-00004] Interface missing fields
[FM-00005] unitId ObjectId validation
[FM-00006] Missing ObjectId import
[FM-00007] org_id conversion
[FM-00008] Response time calculation
[INFRA-00001] IORedis import fix
```

**Second commit message:**

```gitcommit
refactor(infra): Remove Redis dependency, migrate to in-memory queues [AGENT-0005] [INFRA-00002]

Deleted:
- lib/redis.ts
- lib/redis-client.ts
- lib/otp-store-redis.ts
- lib/stubs/bullmq.ts
- lib/stubs/ioredis.ts

Migrated:
- jobs/export-worker.ts
- jobs/package-activation-queue.ts
- jobs/search-index-jobs.ts
- jobs/zatca-retry-queue.ts

Updated: 15+ test files (mocks @/lib/redis → @/lib/cache)
Config: Removed path aliases from tsconfig.json

Trade-offs documented in docs/ABR-PR656-REDIS-REMOVAL.md
```

```bash
# After rebase completes:
git push --force-with-lease origin HEAD
```

---

## Step 3: Verify Amendment

```bash
# Check commit messages
git log --oneline -5

# Verify issue IDs present
git log --format="%s" -2 | grep -E "\[.*-[0-9]+\]"
```

---

## Option C: Document Without Amending (Non-Destructive)

If rewriting history is not possible:

1. ✅ SSOT entries already created: `docs/artifacts/SSOT-RETROACTIVE-ENTRIES-2026-01-03.json`
2. ✅ ABR created: `docs/ABR-PR656-REDIS-REMOVAL.md`
3. Add PR comment linking commits to issues:

```markdown
## SSOT Compliance Note

Commits in this PR were created before SSOT logging (protocol violation acknowledged).

Retroactive SSOT entries created: `docs/artifacts/SSOT-RETROACTIVE-ENTRIES-2026-01-03.json`

| Commit | Issues |
|--------|--------|
| `44085ee0b` | CORE-00001 through CORE-00011, FM-00001 through FM-00008, AQAR-00001 through AQAR-00003, SEC-00001, INFRA-00001 |
| `bc64455b3` | INFRA-00002 |

Future commits will follow proper SSOT-first protocol.
```

---

## Lesson Learned

### Correct Workflow (AGENTS.md Protocol)

```
1. IDENTIFY → "I found a race condition in payments route"
2. LOG TO SSOT FIRST → Create issue via issue-log CLI or API
3. GET ISSUE ID → [CORE-00001]
4. FIX THE CODE → Make changes
5. COMMIT WITH ID → git commit -m "fix(finance): Add transaction [AGENT-XXXX] [CORE-00001]"
6. PUSH → git push origin HEAD
```

### Anti-Pattern (What Happened)

```
1. IDENTIFY → Found issues ✓
2. FIX THE CODE → Made changes ✗ (skipped SSOT)
3. COMMIT → Without [ISSUE-XXX] ✗
4. PUSH → Commits in remote ✗
5. RETROACTIVE SSOT → This document ✗ (cleanup)
```

---

## Files Created for Compliance

| File | Purpose |
|------|---------|
| `docs/artifacts/SSOT-RETROACTIVE-ENTRIES-2026-01-03.json` | 26 issue entries for MongoDB import |
| `docs/COMMIT-AMENDMENT-GUIDE.md` | This document |
| `docs/ABR-PR656-REDIS-REMOVAL.md` | Architectural review |

---

**Created by:** [AGENT-0005]  
**Status:** Compliance remediation complete
