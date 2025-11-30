# fix-security-encryption-update-hooks.md

## Issue: SEC-001 - PII Encryption Bypass via findOneAndUpdate

### Priority: P0 CRITICAL
### Category: Security/RBAC/Auth
### Labels: `copilot:ready`, `owner:backend`, `flag:governance_violation`, `compliance:GDPR`

---

## Problem Statement

Employee/User PII encryption only triggers on `pre('save')` hooks. Mongoose `findOneAndUpdate()`, `updateOne()`, `updateMany()` bypass these hooks, potentially storing plaintext PII in the database.

## Affected Files

1. `/Fixzit/server/models/User.ts` - Lines 276-320
2. `/Fixzit/server/models/hr.models.ts` - Lines 353-394 (Employee), 920-988 (PayrollRun)

## Root Cause

Mongoose document middleware (`pre('save')`) doesn't execute for query middleware operations. This is a fundamental Mongoose architecture decision that requires explicit handling.

## Fix Implementation

### Step 1: Add helper function for update encryption

Add this utility function near the top of both files (or in a shared utility):

```typescript
/**
 * Encrypt PII fields in update payload for query middleware
 * @param update - The update object from this.getUpdate()
 * @param fields - Record of field paths to encrypt
 * @returns Modified update object with encrypted fields
 */
function encryptUpdatePayload(
  update: Record<string, any>,
  fields: Record<string, string>
): Record<string, any> {
  const $set = update.$set || update;
  
  for (const [path] of Object.entries(fields)) {
    const parts = path.split('.');
    let current = $set;
    
    // Navigate to the field
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current?.[parts[i]]) break;
      current = current[parts[i]];
    }
    
    const field = parts[parts.length - 1];
    const value = current?.[field];
    
    // Encrypt if value exists and not already encrypted
    if (value && typeof value === 'string' && !isEncrypted(value)) {
      // Ensure $set exists
      if (!update.$set) update.$set = {};
      
      // Navigate to set encrypted value in $set
      let target = update.$set;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[field] = encryptField(value, path);
      
      logger.info('pii:encrypted_on_update', {
        action: 'pre_update_encrypt',
        fieldPath: path,
      });
    }
  }
  
  return update;
}
```

### Step 2: Add pre-update hooks to User.ts

Add after the existing `UserSchema.post('findOneAndUpdate', ...)` hook (around line 360):

```typescript
// =====================================================================
// PRE-UPDATE HOOKS: Encrypt PII on findOneAndUpdate/updateOne operations
// GDPR Article 32: Security of processing (encryption at rest)
// =====================================================================

UserSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate() || {};
    const encryptedUpdate = encryptUpdatePayload(update, ENCRYPTED_FIELDS);
    this.setUpdate(encryptedUpdate);
    next();
  } catch (error) {
    logger.error('user:update_encryption_failed', {
      action: 'pre_findOneAndUpdate_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});

UserSchema.pre('updateOne', async function(next) {
  try {
    const update = this.getUpdate() || {};
    const encryptedUpdate = encryptUpdatePayload(update, ENCRYPTED_FIELDS);
    this.setUpdate(encryptedUpdate);
    next();
  } catch (error) {
    logger.error('user:update_encryption_failed', {
      action: 'pre_updateOne_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});

UserSchema.pre('updateMany', async function(next) {
  try {
    const update = this.getUpdate() || {};
    const encryptedUpdate = encryptUpdatePayload(update, ENCRYPTED_FIELDS);
    this.setUpdate(encryptedUpdate);
    next();
  } catch (error) {
    logger.error('user:update_encryption_failed', {
      action: 'pre_updateMany_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});
```

### Step 3: Add pre-update hooks to hr.models.ts (Employee)

Add after the `EmployeeSchema.post('findOneAndUpdate', ...)` hook (around line 420):

```typescript
// =====================================================================
// PRE-UPDATE HOOKS: Encrypt Employee PII on update operations
// GDPR Article 32 / Saudi Labor Law Article 52 compliance
// =====================================================================

EmployeeSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate() || {};
    const encryptedUpdate = encryptUpdatePayload(update, EMPLOYEE_ENCRYPTED_FIELDS);
    this.setUpdate(encryptedUpdate);
    next();
  } catch (error) {
    logger.error('employee:update_encryption_failed', {
      action: 'pre_findOneAndUpdate_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});

EmployeeSchema.pre('updateOne', async function(next) {
  try {
    const update = this.getUpdate() || {};
    const encryptedUpdate = encryptUpdatePayload(update, EMPLOYEE_ENCRYPTED_FIELDS);
    this.setUpdate(encryptedUpdate);
    next();
  } catch (error) {
    logger.error('employee:update_encryption_failed', {
      action: 'pre_updateOne_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});
```

## Verification Steps

### 1. Create Integration Test

Create `/Fixzit/tests/integration/security/encryption-update-hooks.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { User } from '@/server/models/User';
import { Employee } from '@/server/models/hr.models';
import { isEncrypted } from '@/lib/security/encryption';
import { connectTestDB, disconnectTestDB } from '@/tests/utils/db';

describe('PII Encryption on Update Operations', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  describe('User Model', () => {
    it('encrypts nationalId on findOneAndUpdate', async () => {
      // Create user
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashed',
        personal: { firstName: 'Test' },
      });

      // Update via findOneAndUpdate
      await User.findOneAndUpdate(
        { _id: user._id },
        { 'personal.nationalId': '1234567890' }
      );

      // Check raw DB value is encrypted
      const rawDoc = await User.collection.findOne({ _id: user._id });
      expect(isEncrypted(rawDoc?.personal?.nationalId)).toBe(true);

      // Clean up
      await User.deleteOne({ _id: user._id });
    });

    it('encrypts nationalId on updateOne', async () => {
      const user = await User.create({
        email: 'test2@example.com',
        password: 'hashed',
      });

      await User.updateOne(
        { _id: user._id },
        { $set: { 'personal.nationalId': '0987654321' } }
      );

      const rawDoc = await User.collection.findOne({ _id: user._id });
      expect(isEncrypted(rawDoc?.personal?.nationalId)).toBe(true);

      await User.deleteOne({ _id: user._id });
    });

    it('prevents double encryption', async () => {
      const user = await User.create({
        email: 'test3@example.com',
        password: 'hashed',
        personal: { nationalId: '1111111111' }, // Encrypted on save
      });

      // Get the encrypted value
      const rawBefore = await User.collection.findOne({ _id: user._id });
      const encryptedBefore = rawBefore?.personal?.nationalId;

      // Update same field with same value (already encrypted)
      await User.findOneAndUpdate(
        { _id: user._id },
        { 'personal.firstName': 'Updated' } // Different field
      );

      // Verify nationalId wasn't double-encrypted
      const rawAfter = await User.collection.findOne({ _id: user._id });
      expect(rawAfter?.personal?.nationalId).toBe(encryptedBefore);

      await User.deleteOne({ _id: user._id });
    });
  });

  describe('Employee Model', () => {
    it('encrypts IBAN on findOneAndUpdate', async () => {
      const employee = await Employee.create({
        orgId: '507f1f77bcf86cd799439011',
        employeeCode: 'EMP001',
        firstName: 'Test',
        lastName: 'Employee',
        jobTitle: 'Developer',
        hireDate: new Date(),
      });

      await Employee.findOneAndUpdate(
        { _id: employee._id },
        { 'bankDetails.iban': 'SA0380000000608010167519' }
      );

      const rawDoc = await Employee.collection.findOne({ _id: employee._id });
      expect(isEncrypted(rawDoc?.bankDetails?.iban)).toBe(true);

      await Employee.deleteOne({ _id: employee._id });
    });
  });
});
```

### 2. Run Tests

```bash
# Run the new integration test
pnpm test tests/integration/security/encryption-update-hooks.test.ts

# Run all security tests
pnpm test tests/integration/security/
pnpm test tests/unit/security/
```

### 3. Manual Verification

```bash
# Connect to MongoDB and verify encrypted values
mongosh "$MONGODB_URI" --eval "
  db.users.findOne({ email: 'test@example.com' }, { 'personal.nationalId': 1 })
"
# Should show: { personal: { nationalId: 'v1:...:...:...:...' } }
```

## Rollback Plan

If issues occur, remove the `pre('findOneAndUpdate')`, `pre('updateOne')`, `pre('updateMany')` hooks. Existing data encryption via `pre('save')` will continue working.

## Related Issues

- SEC-002: Aqar PII Encryption (same pattern needed)
- DATA-002: PayrollLine Encryption (same pattern needed)
- DATA-004: Encryption Plugin Refactor (consolidate this logic)

## Compliance

- ✅ GDPR Article 32: Security of processing
- ✅ Saudi Labor Law Article 52: Salary confidentiality
- ✅ ISO 27001 A.10.1.1: Cryptographic controls
