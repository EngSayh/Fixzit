# PII Migration Break-Glass Runbook

## Overview

This runbook documents the emergency procedure for using the `MIGRATION_ALLOW_PLAINTEXT=true` break-glass flag when running the Finance PII encryption migration script (`scripts/migrate-encrypt-finance-pii.ts`).

**⚠️ CRITICAL**: This flag bypasses security safeguards that prevent plaintext PII from persisting indefinitely. Use **ONLY** in emergency situations with proper approvals.

---

## When to Use This Procedure

The break-glass procedure is **ONLY** appropriate when:

1. **TTL Index Creation Fails** - MongoDB cannot create the TTL index on backup collections
2. **Migration is Time-Critical** - Business continuity requires immediate migration completion
3. **Manual Cleanup is Guaranteed** - A responsible party commits to delete backups within 24 hours

### When NOT to Use

- For convenience or to skip safeguards
- In development/staging without understanding the implications
- Without documented approval
- Without a committed cleanup owner

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Plaintext PII persists in backup collections | **HIGH** - Compliance violation (GDPR, local regulations) | Manual deletion within 24h |
| Backup collections forgotten | **HIGH** - Long-term PII exposure | Incident ticket tracks cleanup |
| Unauthorized use of flag | **MEDIUM** - Accidental PII retention | Production guard + approval workflow |

---

## Required Approvals

Before proceeding, obtain **written approval** from:

1. **Engineering Lead or CTO** - Technical approval for bypassing safeguards
2. **Security/Compliance Officer** - Acknowledgment of compliance risk
3. **DBA or Platform Owner** - Commitment to manual backup cleanup

### Approval Documentation Template

```
APPROVAL: Finance PII Migration Break-Glass Procedure
Date: YYYY-MM-DD HH:MM UTC
Environment: [production/staging]

Reason for Break-Glass:
- [Describe why TTL creation failed]
- [Describe business urgency]

Approvers:
- Engineering Lead: [Name] - Approved: [Yes/No]
- Security Officer: [Name] - Approved: [Yes/No]
- DBA/Platform: [Name] - Approved: [Yes/No]

Cleanup Owner: [Name]
Cleanup Deadline: [Date/Time - must be within 24 hours]

Incident Ticket: [JIRA/Linear ticket number]
```

---

## Pre-Migration Checklist

Before running the migration with the break-glass flag:

- [ ] **Incident ticket created** with break-glass justification
- [ ] **All approvals documented** in the incident ticket
- [ ] **Cleanup owner identified** with explicit 24h commitment
- [ ] **Backup of current database state** taken independently
- [ ] **Verify environment** - Confirm you're targeting the correct environment
- [ ] **Communication sent** to relevant stakeholders about the emergency procedure

---

## Procedure

### Step 1: Verify Environment

```bash
# Confirm you're connecting to the correct database
echo $MONGODB_URI | grep -o "@[^/]*" # Should show expected cluster

# Verify production environment
echo $NODE_ENV # Should be 'production' if targeting prod
```

### Step 2: Set Break-Glass Environment Variable

```bash
# Set the break-glass flag (keeps NODE_ENV=production)
export MIGRATION_ALLOW_PLAINTEXT=true
```

**Important**: Do NOT override `NODE_ENV` to bypass the production guard. The `MIGRATION_ALLOW_PLAINTEXT` flag exists specifically for this purpose.

### Step 3: Run Migration

```bash
# Run with explicit encryption key
ENCRYPTION_KEY=<your-256-bit-key> \
MIGRATION_ALLOW_PLAINTEXT=true \
pnpm tsx scripts/migrate-encrypt-finance-pii.ts [--org=<orgId>]
```

### Step 4: Verify Migration Success

1. Check migration logs for:
   - `✅ Encryption key strength validated: 256-bit (AES-256 compliant)`
   - `[FINANCE PII MIGRATION] Completed Invoice/FMFinancialTransaction`
   - No error entries in `failedIds`

2. Verify encrypted data:
   ```javascript
   // In MongoDB shell
   db.invoices.findOne({ "issuer.taxId": /^v1:/ })
   // Should return a document with encrypted fields (v1: prefix)
   ```

### Step 5: Document Backup Collections

Record the backup collection names created:

```bash
# Example backup names (from migration logs):
# - invoices_backup_finance_pii_<timestamp>
# - fm_financial_transactions_backup_finance_pii_<timestamp>
```

Add these to the incident ticket for cleanup tracking.

---

## Mandatory Cleanup Procedure

**DEADLINE**: Within 24 hours of migration completion

### Step 1: Verify Migration Was Successful

Before deleting backups, confirm:
- [ ] No errors in migration logs
- [ ] Encrypted data is readable (decryption works)
- [ ] Business-critical workflows function correctly

### Step 2: Delete Backup Collections

```javascript
// In MongoDB Atlas UI or shell
// CAUTION: Triple-check collection names before dropping

// List backup collections
db.getCollectionNames().filter(n => n.includes('_backup_finance_pii_'))

// Drop each backup collection
db.invoices_backup_finance_pii_<timestamp>.drop()
db.fm_financial_transactions_backup_finance_pii_<timestamp>.drop()
```

### Step 3: Verify Cleanup

```javascript
// Confirm no backup collections remain
db.getCollectionNames().filter(n => n.includes('_backup_finance_pii_'))
// Should return empty array []
```

### Step 4: Close Incident

Update the incident ticket with:
- [ ] Backup collection names that were deleted
- [ ] Timestamp of deletion
- [ ] Confirmation that cleanup is complete
- [ ] Any lessons learned or recommended improvements

---

## Rollback Procedure

If migration fails and you need to restore from backup:

```bash
# Rollback using the migration script's built-in rollback
ENCRYPTION_KEY=<key> pnpm tsx scripts/migrate-encrypt-finance-pii.ts --rollback [--org=<orgId>]
```

**Note**: Rollback will restore plaintext data from the backup collections. After rollback, the backup collections should still be manually deleted once the underlying issue is resolved.

---

## Post-Incident Review

Within 1 week of using the break-glass procedure:

1. **Root Cause Analysis**: Why did TTL creation fail?
2. **Prevention**: Can MongoDB configuration be improved?
3. **Process Improvement**: Should the script handle this case differently?
4. **Documentation Update**: Update this runbook with lessons learned

---

## Related Documentation

- [Production Auth Checklist](./PRODUCTION_AUTH_CHECKLIST.md) - Environment variables
- [Finance Encryption Tests](../tests/unit/finance/finance-encryption.test.ts) - Test coverage
- [Migration Script](../scripts/migrate-encrypt-finance-pii.ts) - Implementation details

---

## Audit Trail

| Date | Author | Change |
|------|--------|--------|
| 2025-12-02 | GitHub Copilot | Initial runbook creation |

---

**Last Updated**: 2025-12-02  
**Owner**: Engineering Team  
**Review Cycle**: Quarterly or after each use
