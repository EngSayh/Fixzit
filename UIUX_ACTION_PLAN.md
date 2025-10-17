# UI/UX Issues - Action Plan & Progress

**Date**: October 16, 2025  
**Status**: In Progress  
**Commit**: Starting fixes

## ✅ COMPLETED FIXES

### 1. TopBar Dropdown Issues

- [x] Fixed z-index conflicts (changed from z-[9999] to z-[100])
- [x] Added pathname listener to close dropdowns on navigation
- [x] Ensured mutual exclusivity (closing one dropdown closes others)
- [x] Click-outside detection already implemented and working
- [x] Escape key closes all dropdowns

**Files Modified**: `components/TopBar.tsx`

---

## 🔄 IN PROGRESS

### 2. RTL/LTR Language Switching

**Issue**: Sidebar stuck in RTL, requires double-click  
**Status**: Investigating  
**Priority**: HIGH

**Tasks**:

- [ ] Check LanguageSelector component
- [ ] Ensure immediate DOM update when language changes
- [ ] Fix Sidebar RTL/LTR class application
- [ ] Test with Arabic ↔ English switching

---

### 3. Sidebar Height & Scrolling

**Issue**: Huge gap when scrolling, doesn't fit page size  
**Status**: Not Started  
**Priority**: HIGH

**Tasks**:

- [ ] Make sidebar `position: sticky` with `top: 0`
- [ ] Set `height: 100vh` or `min-height: screen`
- [ ] Fix overflow behavior
- [ ] Test on Help page, Privacy page

---

## 📋 PENDING - HIGH PRIORITY

### 4. Missing Privacy Page

**Issue**: Privacy page returns 404, should exist for super admin editing  
**Status**: Not Started  
**Priority**: HIGH

**Tasks**:

- [ ] Create `/app/privacy/page.tsx` - public view
- [ ] Create `/app/admin/privacy/page.tsx` - admin editor
- [ ] Add rich text editor (TipTap or similar)
- [ ] Store content in database
- [ ] Add link in footer and navigation

---

### 5. Profile Page Issues

**Issue**: Security & Notifications tabs not working, no save confirmation  
**Status**: Not Started  
**Priority**: HIGH

**Tasks**:

- [ ] Implement Security tab UI and functionality
- [ ] Implement Notifications preferences tab
- [ ] Add toast notification on save success
- [ ] Add API endpoint to persist profile changes
- [ ] Fix excessive gap between profile and footer

---

### 6. Page Stretching & Footer Gaps

**Issue**: Empty content areas stretch, large gaps before footer  
**Status**: Not Started  
**Priority**: MEDIUM

**Tasks**:

- [ ] Add `min-h-screen` to main layout
- [ ] Implement consistent padding/margins
- [ ] Fix footer positioning (sticky or at bottom)
- [ ] Audit all pages for spacing consistency

---

## 📋 PENDING - MEDIUM PRIORITY

### 7. Marketplace Material (Amazon-like)

**Issue**: Previous implementation lost, not showing products  
**Status**: Not Started  
**Priority**: MEDIUM

**Tasks**:

- [ ] Review git history for previous implementation
- [ ] Restore product grid layout
- [ ] Add filters (category, price, rating)
- [ ] Implement product detail pages
- [ ] Add cart functionality
- [ ] Test search and sorting

---

### 8. 404 Routing Errors

**Issue**: Multiple pages return 404, buttons link to wrong routes  
**Status**: Not Started  
**Priority**: MEDIUM

**Tasks**:

- [ ] Audit all navigation links in Sidebar
- [ ] Audit all TopBar menu links
- [ ] Check dashboard button routes
- [ ] Verify all `/fm/*` routes exist
- [ ] Create missing pages or redirect appropriately
- [ ] Document route map

---

## 📋 PENDING - CRITICAL FEATURES

### 9. Super Admin User Search & Management

**Issue**: Can't search/view all users, missing 14 user types support  
**Status**: Not Started  
**Priority**: CRITICAL

**Requirements**:

- [ ] Create `/app/admin/users/page.tsx`
- [ ] Implement search by: ID, Email, Mobile, Corporate ID
- [ ] Support 14 user types:
  1. Super Admin
  2. Corporate Admin
  3. Admin
  4. FM Manager
  5. Property Manager
  6. Finance
  7. HR
  8. Procurement
  9. Technician
  10. Employee
  11. Owner
  12. Tenant
  13. Vendor
  14. Customer
- [ ] View all logs for technical support
- [ ] Full access to all system information
- [ ] User management (create, edit, disable, delete)

---

### 10. Corporate Login & Billing System

**Issue**: No corporate ID field, no billing implementation  
**Status**: Not Started  
**Priority**: CRITICAL

**Requirements**:

- [ ] Add "Corporate ID" input field on login page
- [ ] Implement corporate authentication flow
- [ ] Track user quota per subscription
- [ ] Auto-charge for users beyond quota
- [ ] Create billing dashboard for corporate admin
- [ ] Implement credit card charging system
- [ ] Generate detailed billing invoices
- [ ] Email billing notifications

**Database Schema Needed**:

```typescript
CorporateAccount {
  id: string
  corporateId: string (unique)
  name: string
  subscription: {
    plan: string
    userLimit: number
    pricePerUser: number
    billingCycle: 'monthly' | 'annual'
  }
  payment: {
    cardLast4: string
    cardBrand: string
    billingEmail: string
  }
  usage: {
    currentUsers: number
    additionalUsers: number
    lastBilledDate: Date
  }
}
```

---

## 📊 PROGRESS SUMMARY

**Total Issues**: 17  
**Completed**: 1 (TopBar dropdowns)  
**In Progress**: 1 (RTL/LTR)  
**Not Started**: 15

**Estimated Time**:

- High Priority: 3-4 days
- Medium Priority: 2-3 days  
- Critical Features: 5-7 days
- **Total**: 10-14 days

---

## 🎯 RECOMMENDED WORKFLOW

### Phase 1 - Critical UI Fixes (Today)

1. ✅ TopBar dropdowns (DONE)
2. RTL/LTR language switching
3. Sidebar height/scrolling
4. Profile page tabs

### Phase 2 - Missing Pages (Tomorrow)

5. Privacy page with admin editor
6. Fix 404 routing errors
7. Page stretching & footer gaps

### Phase 3 - Feature Restoration (Days 3-4)

8. Marketplace Amazon-like behavior
9. Additional missing features

### Phase 4 - Critical Business Features (Days 5-10)

10. Super admin user search (14 types)
11. Corporate login system
12. Billing & quota tracking

---

## 📝 NOTES

- All changes should be committed to feature branches first
- Each major feature should have its own branch
- Open PRs for review before merging to main
- Test thoroughly on both desktop and mobile
- Test RTL (Arabic) and LTR (English) for all changes
- Ensure all pages are responsive

---

**Last Updated**: October 16, 2025, 15:50 UTC  
**Next Review**: After Phase 1 completion
