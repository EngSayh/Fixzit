# Souq Refund Method Migration Guide

**Version**: v2.0.26  
**Date**: November 2025  
**Impact**: BREAKING CHANGE  
**Affected Systems**: Souq Marketplace, Returns & RMA

---

## Overview

The Souq refund system has been updated to replace the deprecated `store_credit` refund method with a unified `wallet` system. This change improves consistency across the platform and provides users with a better refund experience.

---

## What Changed

### Before (v2.0.25 and earlier)
```typescript
// Refund to store credit
const refundRequest = {
  rmaId: "RMA-12345",
  refundMethod: "store_credit",  // ❌ DEPRECATED
  amount: 150.00
};
```

### After (v2.0.26+)
```typescript
// Refund to digital wallet
const refundRequest = {
  rmaId: "RMA-12345",
  refundMethod: "wallet",  // ✅ NEW
  amount: 150.00
};
```

---

## Affected Endpoints

### API Route: `/api/souq/returns/refund`

**Method**: `POST`

**Old Valid Methods** (v2.0.25):
- `original_payment`
- `store_credit` ❌
- `bank_transfer`

**New Valid Methods** (v2.0.26+):
- `original_payment`
- `wallet` ✅
- `bank_transfer`

---

## Migration Steps

### For API Clients

**Step 1**: Update your refund request payloads
```diff
{
  "rmaId": "RMA-12345",
- "refundMethod": "store_credit",
+ "refundMethod": "wallet",
  "amount": 150.00
}
```

**Step 2**: Update validation logic
```typescript
// Before
const validMethods = ['original_payment', 'store_credit', 'bank_transfer'];

// After
const validMethods = ['original_payment', 'wallet', 'bank_transfer'];
```

**Step 3**: Update error handling
```typescript
// The API will now return 400 if you send "store_credit"
try {
  const response = await fetch('/api/souq/returns/refund', {
    method: 'POST',
    body: JSON.stringify({
      refundMethod: 'store_credit' // ❌ This will fail
    })
  });
} catch (error) {
  // Expected error:
  // { error: 'Invalid refund method. Valid options: original_payment, wallet, bank_transfer' }
}
```

---

## Technical Details

### Database Changes

**RMA Model** (`server/models/souq/RMA.ts`):
```typescript
// Refund method enum updated
refundMethod: {
  type: String,
  enum: ['original_payment', 'wallet', 'bank_transfer'], // 'store_credit' removed
  required: function() {
    return this.status === 'refund_processing' || this.status === 'refunded';
  }
}
```

### Service Layer Changes

**Returns Service** (`services/souq/returns-service.ts`):
```typescript
// Method validation updated
async processRefund(rmaId: string, refundMethod: 'original_payment' | 'wallet' | 'bank_transfer') {
  // Validation now rejects 'store_credit'
  const validMethods = ['original_payment', 'wallet', 'bank_transfer'];
  if (!validMethods.includes(refundMethod)) {
    throw new Error(`Invalid refund method: ${refundMethod}`);
  }
  
  // Process refund...
}
```

---

## Backward Compatibility

### ⚠️ Breaking Change Notice

This is a **BREAKING CHANGE** with **NO backward compatibility**. The `store_credit` option has been completely removed and will cause validation errors if used.

**Timeline**:
- **Deprecated**: Never formally deprecated (direct removal)
- **Removed**: v2.0.26 (November 2025)
- **Migration Window**: Immediate (no grace period)

---

## Testing Your Migration

### Test Case 1: Verify wallet refunds work
```bash
curl -X POST https://your-domain.com/api/souq/returns/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rmaId": "RMA-TEST-001",
    "refundMethod": "wallet",
    "amount": 100.00,
    "reason": "Test wallet refund"
  }'

# Expected: 200 OK with refund confirmation
```

### Test Case 2: Verify store_credit is rejected
```bash
curl -X POST https://your-domain.com/api/souq/returns/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rmaId": "RMA-TEST-002",
    "refundMethod": "store_credit",
    "amount": 100.00
  }'

# Expected: 400 Bad Request
# {
#   "error": "Invalid refund method. Valid options: original_payment, wallet, bank_transfer"
# }
```

---

## User Impact

### Customer Experience

**Before**:
- Refund credited to "store credit" balance
- Could only use credit within the platform
- No ability to withdraw funds

**After**:
- Refund credited to digital "wallet"
- Can use wallet balance for any Fixzit service (FM, Souq, Aqar)
- Future: Potential to withdraw to bank account

### Benefits
- ✅ Unified balance across all Fixzit modules
- ✅ Better user experience (one wallet vs multiple credit systems)
- ✅ Clearer financial tracking
- ✅ Enables future wallet features (withdrawals, P2P transfers)

---

## Rollback Plan

If critical issues arise, you can rollback to v2.0.25:

```bash
# Rollback deployment
git checkout v2.0.25
vercel deploy --prod

# Or use Vercel dashboard: Deployments → [Select v2.0.25] → "Promote to Production"
```

**Note**: Any refunds processed with `wallet` method during v2.0.26 deployment will need manual reconciliation after rollback.

---

## Support & Questions

### Common Issues

**Q: I'm getting 400 errors on refund requests**  
A: Check if you're still using `store_credit`. Update to `wallet`.

**Q: What happens to existing store credit balances?**  
A: Store credit balances were migrated to wallet balances before this release. No user data was lost.

**Q: Can users still see their old store credit history?**  
A: Yes, historical transactions maintain their original labels, but new refunds use "wallet".

### Getting Help

- **GitHub Issues**: [github.com/EngSayh/Fixzit/issues](https://github.com/EngSayh/Fixzit/issues)
- **API Documentation**: `openapi.yaml` (updated with breaking change notice)
- **Team Contact**: support@fixzit.co

---

## Checklist for API Clients

- [ ] Updated refund method from `store_credit` to `wallet`
- [ ] Updated validation logic to accept `wallet`
- [ ] Updated error handling for 400 responses
- [ ] Tested wallet refunds in staging environment
- [ ] Verified store_credit requests are rejected
- [ ] Updated internal documentation
- [ ] Notified end users (if applicable)
- [ ] Deployed changes to production

---

**Document Version**: 1.0  
**Last Updated**: November 24, 2025  
**Author**: Fixzit Engineering Team
