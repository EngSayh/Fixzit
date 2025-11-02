# Fixzit Development Guide - Critical Patterns

This document covers critical development patterns and fixes implemented in the Fixzit codebase.

## Table of Contents

1. [Financial Calculations with Decimal.js](#financial-calculations)
2. [Authentication & Security](#authentication-security)
3. [E2E Testing Patterns](#e2e-testing)
4. [Error Handling](#error-handling)
5. [Code Review Findings](#code-review-findings)

---

## Financial Calculations with Decimal.js

### Why Decimal.js?

JavaScript's native floating-point arithmetic is **unsafe for financial calculations**:

```javascript
// ❌ WRONG - Float precision errors
0.1 + 0.2  // = 0.30000000000000004 (not 0.3!)
```

**Solution**: Use `Decimal.js` for all monetary calculations.

### Implementation Pattern

```typescript
import Decimal from 'decimal.js';

// ✅ CORRECT Pattern
interface LineItem {
  quantity: string;      // Store as strings
  unitPrice: string;     // Store as strings
  amount: string;        // Store as strings
}

// Calculate using Decimal
const qty = new Decimal(item.quantity);
const price = new Decimal(item.unitPrice);
const total = qty.times(price);

// Convert to number only for API submission
const apiPayload = {
  amount: Number(total.toFixed(2)),
};
```

### Where It's Implemented

✅ **Fully Implemented**:
- `app/finance/page.tsx` - Invoice calculations
- `app/finance/budgets/new/page.tsx` - Budget allocations
- `app/finance/expenses/new/page.tsx` - Expense line items
- `app/finance/invoices/new/page.tsx` - Invoice totals
- `server/finance/invoice.service.ts` - Backend calculations

### Budget Percentage Calculation Fix

**Problem**: Circular dependency causing drift

```typescript
// ❌ WRONG - Circular logic
const totalBudget = sum(categories.map(c => c.amount));
const percentage = (amount / totalBudget) * 100;  // Depends on changing total!
```

**Solution**: Use ratio formula

```typescript
// ✅ CORRECT - Ratio formula
if (field === 'percentage') {
  const pct = new Decimal(updated.percentage || '0');
  const ratio = pct.dividedBy(100);
  // amount = other * (X/(100-X))
  const amt = otherCategoriesTotal
    .times(ratio)
    .dividedBy(new Decimal(1).minus(ratio));
  updated.amount = amt.toFixed(2);
}
```

---

## Authentication & Security

### Rate Limiting

All authentication endpoints **must** have rate limiting to prevent brute force attacks.

```typescript
// ✅ CORRECT - Rate limiting pattern
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';

export async function POST(req: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes
  const clientIP = getClientIP(req);
  const rl = rateLimit(`auth-credentials:${clientIP}`, 5, 900000);
  if (!rl.allowed) {
    return rateLimitError();
  }
  
  // ... authentication logic
}
```

### IDOR Prevention

**Never trust client-provided tenant/org IDs**. Always validate from session/JWT.

```typescript
// ❌ WRONG - Client controls tenant ID
const headers = {
  'x-tenant-id': userSelectedTenantId,  // DANGEROUS!
};

// ✅ CORRECT - Server validates from session
const session = await auth();
const orgId = session.user.orgId;  // From authenticated JWT
```

### NextAuth Email Vulnerability

**Fixed**: Updated to `next-auth@5.0.0-beta.30` which patches email misdelivery vulnerability (Dependabot #5).

---

## E2E Testing Patterns

### Authentication Fixtures

**Never hardcode credentials in tests**. Use fixtures:

```typescript
// ✅ CORRECT - Use auth fixtures
import { loginAs } from './fixtures/auth';

test('FM Manager can view dashboard', async ({ page }) => {
  await loginAs(page, 'FM_MANAGER');
  
  await page.goto('/fm/dashboard');
  // ... test logic
});
```

### Available Test Roles

| Role | Description |
|------|-------------|
| `FM_MANAGER` | Facilities Management Manager |
| `FM_TECHNICIAN` | Facilities Technician |
| `AQAR_AGENT` | Real Estate Agent |
| `CRM_AGENT` | CRM Agent |
| `HR_MANAGER` | HR Manager |
| `FINANCE_ACCOUNTANT` | Finance Accountant |
| `ADMIN` | System Administrator |

### data-testid Selectors

Always use `data-testid` attributes for test selectors (not class names or text):

```typescript
// ❌ WRONG - Fragile selectors
await page.locator('.btn-submit').click();
await page.locator('text=Submit').click();

// ✅ CORRECT - Stable selectors
await page.locator('[data-testid="submit-button"]').click();
```

### HFV (Halt-Fix-Verify) Pattern

```typescript
// Evidence artifact structure
const evidence = {
  testCase: string;
  role: string;
  page: string;
  timestamp: string;
  steps: Array<{ step: string; action: string }>;
  screenshots: string[];
  errors: string[];
  passed: boolean;
};

// 1. HALT - Stop and navigate
evidence.steps.push({ step: 'HALT', action: 'Navigate' });
await page.goto('/target-page');

// 2. FIX - Check for errors
const errors: string[] = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

// 3. VERIFY - Check structure
await expect(topBar).toBeVisible();
evidence.passed = true;
```

---

## Error Handling

### TypeScript Error Handling

```typescript
// ✅ CORRECT - Type-safe error handling
try {
  await riskyOperation();
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`Operation failed: ${err.message}`);
  // err.message is now type-safe
}
```

### JavaScript Scripts

For `.mjs` scripts that don't need type checking:

```javascript
#!/usr/bin/env zx
// @ts-nocheck

// Script logic here
```

---

## Code Review Findings

### Critical Issues Fixed (P0-P1)

| Issue | File | Fix |
|-------|------|-----|
| NextAuth Email Vulnerability | `package.json` | Updated to v5.0.0-beta.30 |
| No rate limiting on auth | `app/api/auth/credentials/route.ts` | Added rate limiter |
| Budget percentage drift | `app/finance/budgets/new/page.tsx` | Fixed ratio formula |
| Float arithmetic | All finance pages | Implemented Decimal.js |
| IDOR vulnerability | Finance pages | Removed client tenant headers |

### Tooling Issues Fixed (P2)

| Issue | File | Fix |
|-------|------|-----|
| HFV test error handling | `tests/hfv.e2e.spec.ts` | Fixed duplicate blocks, typed evidence |
| Dependency install bug | `scripts/fixzit-agent.mjs` | Join array with spaces |
| Dev server hang | `scripts/fixzit-agent.mjs` | Don't await background process |
| API scan root route | `scripts/api-scan.mjs` | Normalize `/api/.` to `/api` |

---

## Best Practices Summary

1. **Financial Data**: Always use Decimal.js, store as strings
2. **Authentication**: Rate limit all auth endpoints, validate from session
3. **Testing**: Use auth fixtures, data-testid selectors, HFV pattern
4. **Error Handling**: Type-safe error guards, never assume error types
5. **Security**: Never trust client input, validate server-side
6. **Code Review**: Address ALL findings regardless of severity

---

## Resources

- [Decimal.js Documentation](https://mikemcl.github.io/decimal.js/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)

---

**Last Updated**: November 2, 2025  
**Status**: ✅ All Critical Issues Resolved
