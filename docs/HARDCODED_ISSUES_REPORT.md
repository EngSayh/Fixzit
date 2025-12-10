# Hardcoded Issues Report

**Generated:** 2025-12-10T20:45:00+03:00  
**Author:** AI Agent (Deep Dive Scan)  
**Version:** 1.0

---

## Executive Summary

Comprehensive scan of the Fixzit codebase for hardcoded values that should be moved to environment variables or configuration. Total findings categorized by severity and action priority.

| Severity | Count | Immediate Action Required |
|----------|-------|---------------------------|
| 🔴 CRITICAL | 3 | Yes |
| 🟠 HIGH | 7 | Yes |
| 🟡 MODERATE | 15 | Recommended |
| 🟢 LOW/ACCEPTABLE | 25+ | No (acceptable for context) |

---

## 🔴 CRITICAL FINDINGS

### 1. Hardcoded Phone Number in Production Service
**File:** `services/souq/fulfillment-service.ts:250`
```typescript
phone: "+966123456789",
```
**Context:** FBF (Fulfillment by Fixzit) warehouse address - mock data in production code
**Risk:** Invalid phone number will cause shipping integration failures
**Fix:** Move to environment variable `FULFILLMENT_CENTER_PHONE`

### 2. Hardcoded ZATCA VAT Number
**Files:** 
- `.artifacts/issue_comments.json` (multiple references)
- Payment callback routes
```typescript
vatNumber: '300123456789012',
sellerName: 'Fixzit Enterprise',
```
**Context:** Saudi tax compliance - e-invoicing
**Risk:** Compliance violation if wrong VAT number used
**Fix:** Use `ZATCA_VAT_NUMBER` and `ZATCA_SELLER_NAME` environment variables (already partially addressed)

### 3. Test Passwords in Scripts (Security Review Required)
**Files:**
- `scripts/test-data.js:7` - `"admin123"`
- `scripts/setup-test-env.ts:23` - `"Test@1234"`
- `scripts/test-auth.ts:12` - `"password123"`
- `public/ui-bootstrap.js` - `"password123"`
**Risk:** Test credentials exposed in version control
**Fix:** Ensure these are ONLY used in test environments with proper guards

---

## 🟠 HIGH PRIORITY FINDINGS

### 4. Placeholder URLs
**File:** `services/souq/seller-kyc-service.ts:479`
```typescript
https://example.com/placeholder.pdf
```
**Context:** KYC document placeholder
**Fix:** Replace with actual document URL or proper placeholder mechanism

### 5. Hardcoded Fulfillment Center Address
**File:** `services/souq/fulfillment-service.ts:249-256`
```typescript
const warehouseAddress: IAddress = {
  name: "Fixzit Fulfillment Center",
  phone: "+966123456789",
  email: EMAIL_DOMAINS.fulfillment,
  street: "King Fahd Road",
  city: "Riyadh",
  postalCode: "11564",
  country: "SA",
};
```
**Fix:** Move entire warehouse configuration to environment variables or database config

### 6. Test Email Domain in KYC Service
**Files:**
- `services/souq/seller-kyc-service.ts:445,655`
```typescript
contactEmail: "temp-kyc@fixzit.test",
```
**Fix:** Ensure this is only used in test flows, not production

### 7. Hardcoded Phone Numbers in Test Scripts
**Files:**
- `scripts/update-test-users-phone.ts:22-26`
```typescript
{ email: "superadmin@test.fixzit.co", phone: "+966552233456" },
{ email: "admin@test.fixzit.co", phone: "+966552233456" },
```
**Context:** Test user seeding
**Fix:** Move to environment variable `TEST_PHONE_NUMBER` (acceptable for test files)

### 8. Hardcoded VAT Rate (0.15)
**Files:**
- `app/api/souq/orders/route.ts`
- `lib/pricing.ts`
- Multiple invoice calculations
**Context:** Saudi Arabia VAT = 15%
**Fix:** Create `SAUDI_VAT_RATE` environment variable for flexibility if rate changes

### 9. Hardcoded Timeouts in Production Code
**Pattern:** `timeout.*=.*\d{4,}`
**Risk:** May not be appropriate for all deployment environments
**Fix:** Consider making configurable where critical

### 10. Brand Name Hardcoding in Notification Templates
**File:** `services/notifications/seller-notification-service.ts:60-208`
```typescript
"Fixzit Alert: Ad budget low - {{budgetRemaining}} SAR remaining."
"Fixzit Marketplace"
```
**Fix:** Use i18n keys or brand configuration for white-label support

---

## 🟡 MODERATE FINDINGS

### 11. Currency Defaults (SAR)
**Files:** 20+ occurrences
```typescript
currency: "SAR"
```
**Verdict:** ACCEPTABLE - Saudi Riyal is the primary currency for the platform

### 12. Pagination Limits
**Files:** Multiple services
- `MAX_PAGE_LIMIT = 100`
- `limit = 20`
- `BATCH_LIMIT = 200`
**Verdict:** ACCEPTABLE - Standard pagination defaults, well-documented

### 13. Localhost URLs in Development Configs
**Files:**
- `vitest.config.ts`
- `vitest.setup.ts`
- `.env.example`
**Verdict:** ACCEPTABLE - Development/test only

### 14. IP Address Patterns
**Files:**
- CORS allowlists
- Private network detection
**Verdict:** ACCEPTABLE - Used for security filtering

### 15. Test Database Names
**File:** `vitest.setup.ts:443,487`
```typescript
dbName: "fixzit-test"
```
**Verdict:** ACCEPTABLE - Test isolation

### 16. Government Reference URLs
**Files:** Various
- HRSD (hrsd.gov.sa)
- GOSI (gosi.gov.sa)
- CITC references
**Verdict:** ACCEPTABLE - Official government endpoints

### 17. File Size Limits
**Pattern:** `maxSize.*=.*\d+`
**Verdict:** ACCEPTABLE with documentation

### 18. Image Dimension Limits
**Verdict:** ACCEPTABLE - UI constraints

### 19. Session Timeouts
**Verdict:** ACCEPTABLE - Security defaults

### 20. Retry Limits
**Verdict:** ACCEPTABLE - Error handling

### 21. Decimal Precision (2-4 decimals)
**Verdict:** ACCEPTABLE - Financial calculations

### 22. Date Format Patterns
**Verdict:** ACCEPTABLE - Locale handling

### 23. API Version Strings
**Verdict:** ACCEPTABLE - Versioning

### 24. Role Constants
**Verdict:** ACCEPTABLE - RBAC system

### 25. Status Enums
**Verdict:** ACCEPTABLE - Business logic

---

## 🟢 ACCEPTABLE HARDCODING

The following patterns are intentionally hardcoded and do NOT require action:

1. **Test file data** - Vitest configs, test setup
2. **Documentation examples** - .env.example files
3. **Government reference URLs** - Official endpoints
4. **Development fallbacks** - With env var overrides
5. **Enum values** - Type-safe constants
6. **Error codes** - Standardized error handling
7. **HTTP status codes** - Standard responses
8. **File extensions** - MIME type handling
9. **Character limits** - Validation rules
10. **Regex patterns** - Validation logic

---

## Action Plan

### Immediate (Before Next Deploy)

1. **FIX:** `services/souq/fulfillment-service.ts:250`
   - Replace `+966123456789` with `process.env.FULFILLMENT_CENTER_PHONE`
   - Add to `.env.example`

2. **VERIFY:** ZATCA configuration uses environment variables
   - `ZATCA_SELLER_NAME`
   - `ZATCA_VAT_NUMBER`

3. **AUDIT:** All test password usages are guarded by `NODE_ENV`

### Short-term (This Sprint)

4. Create warehouse configuration module:
   ```typescript
   // lib/config/warehouse.ts
   export const getWarehouseConfig = () => ({
     name: process.env.FULFILLMENT_CENTER_NAME || "Fixzit Fulfillment Center",
     phone: process.env.FULFILLMENT_CENTER_PHONE || "+966XXXXXXXXX",
     email: process.env.FULFILLMENT_CENTER_EMAIL,
     address: {
       street: process.env.FULFILLMENT_CENTER_STREET,
       city: process.env.FULFILLMENT_CENTER_CITY || "Riyadh",
       postalCode: process.env.FULFILLMENT_CENTER_POSTAL,
       country: process.env.FULFILLMENT_CENTER_COUNTRY || "SA",
     },
   });
   ```

5. Create VAT configuration module:
   ```typescript
   // lib/config/tax.ts
   export const SAUDI_VAT_RATE = Number(process.env.SAUDI_VAT_RATE) || 0.15;
   ```

6. Create brand configuration for white-label:
   ```typescript
   // lib/config/brand.ts
   export const BRAND_NAME = process.env.BRAND_NAME || "Fixzit";
   export const BRAND_TAGLINE = process.env.BRAND_TAGLINE || "Fixzit Marketplace";
   ```

### Environment Variables to Add

```bash
# .env.example additions

# Fulfillment Center Configuration
FULFILLMENT_CENTER_NAME="Fixzit Fulfillment Center"
FULFILLMENT_CENTER_PHONE="+966XXXXXXXXX"
FULFILLMENT_CENTER_EMAIL="fulfillment@fixzit.co"
FULFILLMENT_CENTER_STREET="King Fahd Road"
FULFILLMENT_CENTER_CITY="Riyadh"
FULFILLMENT_CENTER_POSTAL="11564"
FULFILLMENT_CENTER_COUNTRY="SA"

# ZATCA Configuration
ZATCA_SELLER_NAME="Fixzit Enterprise"
ZATCA_VAT_NUMBER="300XXXXXXXXXXXX"

# Tax Configuration
SAUDI_VAT_RATE="0.15"

# Brand Configuration (White-label)
BRAND_NAME="Fixzit"
BRAND_TAGLINE="Fixzit Marketplace"
```

---

## Files Requiring Review

| Priority | File Path | Line(s) | Issue |
|----------|-----------|---------|-------|
| 🔴 | `services/souq/fulfillment-service.ts` | 250 | Hardcoded phone |
| 🔴 | `services/souq/fulfillment-service.ts` | 249-256 | Hardcoded warehouse |
| 🟠 | `services/souq/seller-kyc-service.ts` | 445, 655 | Test email in prod code |
| 🟠 | `services/souq/seller-kyc-service.ts` | 479 | Placeholder URL |
| 🟠 | `services/notifications/seller-notification-service.ts` | 60-208 | Brand hardcoding |
| 🟡 | Multiple | Various | VAT rate 0.15 |

---

## Search Commands Used

```bash
# Phone numbers
grep -rE '\+?966[0-9]{8,9}|\b0?5[0-9]{8}\b' --include="*.ts"

# Passwords
grep -rE 'password.*=.*["'"'"'][^"'"'"']{6,}["'"'"']' --include="*.ts"

# URLs
grep -rE 'https?://[a-zA-Z0-9.-]+\.(com|co|io|net|org|sa)[/\w.-]*' --include="*.ts"

# Brand references
grep -rE 'Fixzit|fixzit\.co' --include="*.ts"

# VAT/Tax
grep -rE 'vat.*=.*0\.\d{2}|tax.*=.*0\.\d{2}' --include="*.ts"

# Pagination
grep -rE 'pageSize.*=.*\d+|LIMIT.*=.*\d+' --include="*.ts"
```

---

## Related Documents

- `docs/PENDING_MASTER.md` - Master pending items list
- `docs/ISSUES_REGISTER.md` - Issue tracking
- `.env.example` - Environment variable documentation
- `.github/copilot-instructions.md` - Agent guidelines

---

**Last Updated:** 2025-12-10T20:45:00+03:00  
**Status:** Complete  
**Next Review:** Before next major deployment
