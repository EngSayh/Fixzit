# Translation Completeness Report
**Date:** November 18, 2025  
**Audit Type:** Comprehensive i18n Coverage Check

---

## Executive Summary

### Coverage Statistics
- **Pages with translations:** 136 / 205 (66.3%)
- **Components with translations:** 79 / 144 (54.9%)
- **Overall i18n adoption:** ~60%

### Status: ⚠️ PARTIAL COVERAGE
The core user-facing pages (Dashboard, Marketplace, Aqar, Work Orders, Settings) have **good translation coverage**. However, several internal admin tools, form components, and dropdown options still contain hardcoded English text.

---

## 🔴 HIGH PRIORITY - Missing Translations

### 1. Sidebar Navigation (`app/_shell/ClientSidebar.tsx`)
**Lines:** 41-216  
**Issue:** Has translation mapping defined but keys missing from dictionaries

**Missing Keys:**
- `sidebar.legacy.items.work-orders` → "Work Orders"
- `sidebar.legacy.sections.human-resources` → "Human Resources"
- `sidebar.legacy.items.employee-directory` → "Employee Directory"
- `sidebar.legacy.items.asset-management` → "Asset Management"
- `sidebar.legacy.items.customer-directory` → "Customer Directory"
- `sidebar.legacy.items.service-catalog` → "Service Catalog"
- `sidebar.legacy.items.procurement-requests` → "Procurement Requests"
- `sidebar.legacy.items.knowledge-base` → "Knowledge Base"
- `sidebar.legacy.items.live-chat-bot` → "Live Chat / Bot"
- `sidebar.legacy.items.standard-reports` → "Standard Reports"
- `sidebar.legacy.items.custom-reports` → "Custom Reports"
- `sidebar.legacy.sections.system-management` → "System Management"
- `sidebar.legacy.items.user-management` → "User Management"

**Action:** Add these keys to both `i18n/dictionaries/en.ts` and `i18n/dictionaries/ar.ts`

### 2. Form Labels (`app/careers/page.tsx`)
**Lines:** 654-717

**Untranslated:**
```tsx
<Label htmlFor="firstName">First Name *</Label>
<Label htmlFor="lastName">Last Name *</Label>
<Label htmlFor="email">Email Address *</Label>
<Label htmlFor="phone">Phone Number *</Label>
<Label htmlFor="coverLetter">Cover Letter *</Label>
```

**Action:** Replace with:
```tsx
<Label htmlFor="firstName">{auto('First Name *', 'careers.form.firstName')}</Label>
```

### 3. Error Messages
**Files:**
- `app/fm/vendors/[id]/page.tsx` (line 108): "Failed to load vendor"
- `app/fm/properties/[id]/page.tsx` (line 84): "Failed to load property"

**Action:** Use translation keys like `errors.loadVendor` and `errors.loadProperty`

---

## 🟡 MEDIUM PRIORITY - Partial Translation

### 4. Admin Feature Settings (`app/admin/feature-settings/page.tsx`)
**Lines:** 325-516  
**Count:** 16 feature toggle labels

**Untranslated Labels:**
- Referral Program
- Family Management
- Vacation Requests
- Electronic Contracts
- Electronic Attorneys
- Auto Payments
- Payment Links
- Receipt Vouchers with QR
- Ejar Wallet Integration
- Service Ratings
- Warranty Tracker
- Spare Parts Approval
- Emergency Maintenance
- Project Bidding System
- Vendor Verification
- Online Store (Souq)
- Audit Logging

**Recommendation:** Create keys under `admin.features.*` namespace

### 5. Seller Components

#### Bank Details Form (`components/seller/kyc/BankDetailsForm.tsx`)
**Lines:** 104-113  
**Issue:** Bank names hardcoded

**Note:** These are proper nouns (Al Rajhi Bank, NCB, Riyad Bank, etc.). Decision needed:
- Keep in English (standard practice for bank names)
- Add Arabic equivalents for local banks

#### Health Score Messages (`components/seller/health/HealthScore.tsx`)
**Lines:** 107-128  
**Untranslated:**
- "Your account is in excellent standing..."
- "Your account is performing well..."
- "Your account needs improvement..."
- "Account at Risk: Your performance is below target..."

#### Pricing Rules (`components/seller/pricing/PricingRuleCard.tsx`)
**Lines:** 72-176  
**Untranslated labels:**
- "Default Rule", "Enable Rule", "Minimum Price", "Maximum Price"
- "Target Position", "Win Buy Box", "Stay Competitive"
- "Undercut Amount", "Protect Margin"

#### Analytics Components
- `ProductPerformanceTable.tsx`: "Product Performance", "Top Selling Products", "Products Needing Attention"
- `TrafficAnalytics.tsx`: "Traffic Analytics", "Page Views Over Time"

---

## 🟢 LOW PRIORITY - Data-Driven Content

### 6. Property/Location Dropdown Options

**Files affected:**
- `app/work-orders/pm/page.tsx` (127-130)
- `app/work-orders/new/page.tsx` (64-66, 105-107)
- `app/properties/inspections/page.tsx` (135-154)
- `app/properties/units/page.tsx` (133-151)
- `app/properties/leases/page.tsx` (153-155)
- `app/properties/documents/page.tsx` (158-179)

**Examples:**
```tsx
<option>All Properties</option>
<option>Tower A</option>
<option>Tower B</option>
<option>Villa Complex</option>
```

**Recommendation:**  
These should come from **database queries**, not hardcoded options. Properties should be fetched dynamically from the backend.

**Technician Names:**
```tsx
<option value="tech-1">Ahmed Al-Rashid</option>
<option value="tech-2">Mohammed Al-Saud</option>
```
These are **test data** and should be replaced with actual employee records from the database.

### 7. Customer/Tenant Names in Finance Forms
**Files:**
- `app/finance/invoices/new/page.tsx` (571-573)
- `app/finance/expenses/new/page.tsx` (584)

**Example:**
```tsx
<option value="cust1">John Smith - Tower A</option>
```

**Recommendation:** Fetch from customer/tenant database tables.

---

## ✅ WELL-TRANSLATED AREAS

### Pages with Complete Translation Coverage:
- ✅ Dashboard pages (all modules)
- ✅ Marketplace (Aqar & Souq)
- ✅ Settings & Profile
- ✅ Login & Signup
- ✅ Notifications
- ✅ Work Orders (main pages)
- ✅ Help & Support

### Components with Good Coverage:
- ✅ Navigation components
- ✅ Aqar components (PropertyCard, ListingCard, etc.)
- ✅ Souq components (claims system)
- ✅ Admin panels (users, roles, audit logs)
- ✅ Notification system

---

## 📊 Detailed Breakdown by Module

| Module | Pages | Translated | % | Status |
|--------|-------|-----------|---|---------|
| Dashboard | 15 | 15 | 100% | ✅ Complete |
| Marketplace (Aqar/Souq) | 28 | 28 | 100% | ✅ Complete |
| Work Orders | 12 | 10 | 83% | ⚠️ Needs dropdown options |
| Properties | 8 | 5 | 63% | ⚠️ Needs dropdowns |
| Finance | 10 | 7 | 70% | ⚠️ Needs form options |
| HR | 6 | 5 | 83% | ✅ Good (filters added) |
| Admin | 8 | 4 | 50% | ⚠️ Feature settings untranslated |
| Settings | 5 | 5 | 100% | ✅ Complete |
| Careers | 2 | 0 | 0% | 🔴 Needs translation |
| Seller Components | 12 | 4 | 33% | ⚠️ Needs work |

---

## 🎯 Action Plan

### Phase 1: Critical (Do Now) ⏰ 2-3 hours
1. Add sidebar navigation keys to dictionaries
2. Translate careers form labels
3. Add error message translations
4. Replace hardcoded alt text

### Phase 2: Important (This Week) 📅 4-6 hours
1. Translate admin feature settings
2. Add seller component translations
3. Translate seller health/pricing messages
4. Add analytics component translations

### Phase 3: Refactoring (Next Sprint) 🔄 1-2 days
1. Replace hardcoded property dropdowns with database queries
2. Replace hardcoded customer/tenant names with API calls
3. Replace technician names with employee lookup
4. Create reusable translated dropdown components

### Phase 4: Enhancement (Future) 🚀
1. Add translation coverage tests
2. Set up CI check for untranslated strings
3. Create translation style guide
4. Add RTL testing for Arabic

---

## 🛠️ Implementation Guide

### Adding Missing Dictionary Keys

**Step 1:** Edit `i18n/dictionaries/en.ts`
```typescript
sidebar: {
  legacy: {
    items: {
      'work-orders': 'Work Orders',
      'employee-directory': 'Employee Directory',
      // ... add all sidebar items
    },
    sections: {
      'human-resources': 'Human Resources',
      'system-management': 'System Management',
    }
  }
}
```

**Step 2:** Edit `i18n/dictionaries/ar.ts`
```typescript
sidebar: {
  legacy: {
    items: {
      'work-orders': 'أوامر العمل',
      'employee-directory': 'دليل الموظفين',
      // ... add all Arabic translations
    },
    sections: {
      'human-resources': 'الموارد البشرية',
      'system-management': 'إدارة النظام',
    }
  }
}
```

**Step 3:** Regenerate JSON dictionaries
```bash
pnpm i18n:build
```

### Updating Components

**Before:**
```tsx
<Label>First Name *</Label>
```

**After:**
```tsx
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

const { auto } = useAutoTranslator();

<Label>{auto('First Name *', 'careers.form.firstName')}</Label>
```

---

## 📈 Progress Tracking

### Completion Checklist

- [x] Audit completed (Nov 18, 2025)
- [ ] Phase 1: Critical translations (0/4)
  - [ ] Sidebar navigation keys
  - [ ] Careers form labels
  - [ ] Error messages
  - [ ] Alt text
- [ ] Phase 2: Important translations (0/4)
  - [ ] Admin feature settings
  - [ ] Seller components
  - [ ] Health/pricing messages
  - [ ] Analytics components
- [ ] Phase 3: Refactoring (0/4)
  - [ ] Dynamic property dropdowns
  - [ ] Dynamic customer lookups
  - [ ] Employee lookup integration
  - [ ] Reusable components
- [ ] Phase 4: Enhancement (0/4)
  - [ ] Translation tests
  - [ ] CI checks
  - [ ] Style guide
  - [ ] RTL testing

---

## 📝 Notes

1. **Sidebar Navigation:** Translation mapping already exists in the code but dictionary keys are missing. This is the easiest fix with highest impact.

2. **Property/Location Data:** These should NOT be translated as hardcoded strings. They need to be fetched from the database where property names can be stored in both languages.

3. **Bank Names:** Industry standard is to keep bank names in their official format (usually English). Arabic equivalents can be added optionally.

4. **Test Data:** Technician and customer names in dropdowns are clearly test data and should be replaced with actual database queries.

5. **Seller Portal:** This is a newer module with less translation coverage. Should be prioritized if targeting international sellers.

---

## 🎉 Strengths

- Core user-facing features are well-translated
- Translation infrastructure is solid (auto translator, dictionary system)
- JSON dictionary generation working correctly
- Most dashboard modules have 100% coverage
- Marketplace (Aqar/Souq) fully translated

---

**Generated by:** Translation Audit Tool  
**Run:** `pnpm i18n:build` after adding new keys  
**Verify:** `pnpm tsc --noEmit` to check types
