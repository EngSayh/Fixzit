# 📱 RTL QA Testing Plan - November 17, 2025

**Priority:** 🔴 CRITICAL BLOCKER  
**Impact:** 70% of users (Arabic speakers)  
**Estimated Time:** 8-12 hours  
**Status:** ⏳ Ready to start after security validation

---

## 🎯 Overview

Comprehensive right-to-left (RTL) layout testing for Arabic language support across all major features of the Fixzit platform.

### Why This Matters

- **70% of users** speak Arabic as primary language
- RTL issues create poor user experience
- Affects critical transactions (checkout, bookings, claims)
- Can cause data entry errors (phone numbers, addresses)

---

## 📋 Testing Phases

### Phase 1: Core Shell (4 hours) 🔴 HIGH PRIORITY

**Modules:**

- Dashboard (FM/Souq/Aqar views)
- Authentication pages (login, signup, forgot password)
- Profile & settings pages
- Work orders list & details
- Property listings (Aqar)

**Per-Page Checklist:**

- [ ] Text direction changes to RTL
- [ ] Icons mirror properly (arrows, chevrons)
- [ ] Navigation menu reverses order
- [ ] Sidebar positioned on right
- [ ] Breadcrumbs read right-to-left
- [ ] Form fields align correctly
- [ ] Buttons positioned correctly
- [ ] Tables scroll in correct direction
- [ ] Date/time displays use Arabic locale
- [ ] Numbers use Arabic numerals (optional, but test)

**Test Process:**

```bash
# 1. Start dev server
pnpm dev

# 2. Open browser (http://localhost:3000)

# 3. In browser console:
localStorage.setItem('fixzit_locale', 'ar');
document.body.dir = 'rtl';
document.documentElement.dir = 'rtl';
window.location.reload();

# 4. Navigate through each page systematically
# 5. Take screenshots of issues
# 6. Document in spreadsheet
```

---

### Phase 2: Transactional Flows (4 hours) 🔴 CRITICAL

**Flows to Test:**

1. **Souq Checkout**
   - Add product to cart
   - Review cart page
   - Checkout form (address, payment)
   - Order confirmation

2. **PayTabs Integration**
   - Payment form display
   - Card input fields
   - Apple Pay button position
   - Mada card support
   - Success/failure pages

3. **Aqar Booking**
   - Property search/filter
   - Property details page
   - Booking calendar
   - Booking confirmation
   - Payment flow

4. **Work Order Creation**
   - Create work order form
   - File uploads
   - Service selection
   - Date/time picker
   - Confirmation page

5. **Support/Help**
   - Support ticket form
   - Chat widget (if enabled)
   - Help center articles
   - Contact page

**Critical Elements:**

- [ ] Form validation messages
- [ ] Error states
- [ ] Loading indicators
- [ ] Progress bars/steps
- [ ] Confirmation dialogs
- [ ] Toast notifications
- [ ] Payment card inputs (mask must be RTL-aware)
- [ ] Phone number input (+966 prefix)
- [ ] Currency display (SAR positioning)

---

### Phase 3: Admin Panels (2 hours) 🟡 MEDIUM PRIORITY

**Admin Pages:**

1. **Claims Review Panel**
   - Claims list table
   - Filter/sort controls
   - Detail drawer/modal
   - Evidence viewer
   - Decision form
   - Timeline/history

2. **User Management**
   - User list table
   - Search/filter
   - User detail page
   - Role assignment
   - Action buttons

3. **Analytics Dashboards**
   - Chart displays
   - KPI cards
   - Data tables
   - Export buttons
   - Date range pickers

4. **Reports**
   - Report list
   - Report viewer
   - Print layout
   - Export options

**Admin-Specific Checks:**

- [ ] Data tables handle Arabic text
- [ ] Column headers reverse
- [ ] Sort indicators mirror
- [ ] Action dropdown menus
- [ ] Batch operation buttons
- [ ] Filter panels
- [ ] Status badges
- [ ] Progress indicators

---

### Phase 4: Edge Cases & Mobile (2 hours) 🟡 MEDIUM PRIORITY

**Components to Test:**

1. **Toast Notifications**
   - Position (top-right in LTR = top-left in RTL?)
   - Icon position
   - Close button position
   - Animation direction

2. **Dialogs/Modals**
   - Modal positioning
   - Close button (should be on left in RTL)
   - Footer buttons order
   - Scroll behavior

3. **Tables**
   - Horizontal scroll direction
   - Column order
   - Row actions
   - Sticky columns

4. **Form Validation**
   - Error message position
   - Field highlighting
   - Tooltip position
   - Help text alignment

5. **Mobile Views**
   - Bottom navigation
   - Swipe gestures
   - Pull to refresh
   - Drawer navigation
   - Mobile modals
   - Touch targets

**Edge Cases:**

- [ ] Mixed LTR/RTL content (English names + Arabic text)
- [ ] Email addresses in RTL context
- [ ] URLs in RTL context
- [ ] Code snippets
- [ ] Phone numbers (+966 prefix)
- [ ] Lat/long coordinates
- [ ] File paths
- [ ] Currency with symbols (SAR)

---

## 🛠️ Testing Tools & Setup

### Browser Setup

**Recommended Browsers:**

- Chrome/Edge (Chromium) - Best dev tools
- Safari - iOS testing
- Firefox - Gecko engine differences

**Dev Tools:**

```javascript
// Quick RTL toggle bookmarklet
javascript: (function () {
  const isRTL = document.dir === "rtl";
  document.dir = isRTL ? "ltr" : "rtl";
  document.documentElement.dir = isRTL ? "ltr" : "rtl";
  localStorage.setItem("fixzit_locale", isRTL ? "en" : "ar");
  location.reload();
})();
```

### Mobile Testing

**Physical Devices (Preferred):**

- iPhone 13+ (iOS Safari)
- Samsung Galaxy (Chrome Android)
- iPad (tablet view)

**Emulators:**

```bash
# iOS Simulator
open -a Simulator

# Android Emulator
emulator -avd Pixel_5_API_33
```

**Browser DevTools:**

- Chrome DevTools Device Mode (F12 → Toggle device toolbar)
- Responsive Design Mode

---

## 📊 Issue Tracking Template

### Create Spreadsheet: `RTL_QA_Issues.xlsx`

| ID      | Page/Component | Issue Description    | Severity | Screenshot | Status | Notes |
| ------- | -------------- | -------------------- | -------- | ---------- | ------ | ----- |
| RTL-001 | Dashboard      | Sidebar not flipping | High     | link       | Open   |       |
| RTL-002 | Login          | Button alignment off | Medium   | link       | Open   |       |
| RTL-003 | Checkout       | Payment form labels  | High     | link       | Fixed  |       |

**Severity Levels:**

- 🔴 **Critical** - Blocks functionality (wrong data entry, payment fails)
- 🟠 **High** - Poor UX, major visual issues
- 🟡 **Medium** - Minor visual issues, inconsistencies
- 🟢 **Low** - Nice-to-have improvements

---

## ✅ Page-by-Page Checklist

### Authentication Pages

- [ ] `/login`
  - [ ] Form layout
  - [ ] Social login buttons
  - [ ] "Remember me" checkbox
  - [ ] Links alignment
  - [ ] Error messages

- [ ] `/signup`
  - [ ] Multi-step form
  - [ ] Progress indicator
  - [ ] Field validation
  - [ ] Terms checkbox
  - [ ] Submit button

- [ ] `/forgot-password`
  - [ ] Form layout
  - [ ] Back button
  - [ ] Success message

### Dashboard Pages

- [ ] `/dashboard` (FM)
  - [ ] Layout grid
  - [ ] Widget cards
  - [ ] Quick actions
  - [ ] Recent activity
  - [ ] Statistics

- [ ] `/dashboard` (Souq)
  - [ ] Sales charts
  - [ ] Order list
  - [ ] Product cards
  - [ ] Action buttons

- [ ] `/dashboard` (Aqar)
  - [ ] Property stats
  - [ ] Booking calendar
  - [ ] Revenue charts
  - [ ] Tenant list

### Work Orders

- [ ] `/work-orders`
  - [ ] List view
  - [ ] Filter sidebar
  - [ ] Status badges
  - [ ] Action buttons
  - [ ] Pagination

- [ ] `/work-orders/[id]`
  - [ ] Detail view
  - [ ] Timeline
  - [ ] Comments
  - [ ] File attachments
  - [ ] Status updates

- [ ] `/work-orders/create`
  - [ ] Form layout
  - [ ] Service selection
  - [ ] Date picker
  - [ ] Address autocomplete
  - [ ] File upload

### Souq (Marketplace)

- [ ] `/souq`
  - [ ] Product grid
  - [ ] Category filters
  - [ ] Sort dropdown
  - [ ] Search bar
  - [ ] Cart icon

- [ ] `/souq/products/[id]`
  - [ ] Image gallery
  - [ ] Product details
  - [ ] Add to cart
  - [ ] Reviews section
  - [ ] Related products

- [ ] `/souq/cart`
  - [ ] Cart items list
  - [ ] Quantity controls
  - [ ] Price summary
  - [ ] Checkout button
  - [ ] Continue shopping

- [ ] `/souq/checkout`
  - [ ] Shipping address
  - [ ] Payment method
  - [ ] Order summary
  - [ ] Place order button
  - [ ] Progress steps

- [ ] `/souq/claims`
  - [ ] Claims list
  - [ ] Claim detail
  - [ ] Evidence upload
  - [ ] Messages thread

### Aqar (Real Estate)

- [ ] `/aqar`
  - [ ] Property grid
  - [ ] Map view
  - [ ] Filters panel
  - [ ] Sort options
  - [ ] Saved properties

- [ ] `/aqar/properties/[id]`
  - [ ] Photo gallery
  - [ ] Property details
  - [ ] Amenities list
  - [ ] Location map
  - [ ] Book now button

- [ ] `/aqar/bookings`
  - [ ] Booking list
  - [ ] Calendar view
  - [ ] Booking details
  - [ ] Payment history

### Admin Pages

- [ ] `/admin/claims`
  - [ ] Claims table
  - [ ] Filter controls
  - [ ] Bulk actions
  - [ ] Detail drawer

- [ ] `/admin/users`
  - [ ] Users table
  - [ ] Search
  - [ ] Role badges
  - [ ] Action menu

- [ ] `/admin/analytics`
  - [ ] Charts
  - [ ] KPI cards
  - [ ] Date range
  - [ ] Export button

### Profile & Settings

- [ ] `/profile`
  - [ ] Profile form
  - [ ] Avatar upload
  - [ ] Save button
  - [ ] Account info

- [ ] `/settings`
  - [ ] Settings tabs
  - [ ] Form fields
  - [ ] Toggle switches
  - [ ] Save buttons

---

## 🎨 Common RTL Issues & Fixes

### Issue 1: Text Not Reversing

**Problem:**

```css
/* Text stays LTR */
.element {
  text-align: left;
}
```

**Fix:**

```css
/* Use logical properties */
.element {
  text-align: start; /* Becomes 'right' in RTL */
}
```

### Issue 2: Icons Not Mirroring

**Problem:**

```jsx
{
  /* Arrow always points right */
}
<ChevronRight />;
```

**Fix:**

```jsx
{
  /* Mirror arrow in RTL */
}
<ChevronRight className="rtl:rotate-180" />;
```

### Issue 3: Margins/Padding Wrong Side

**Problem:**

```css
.element {
  margin-left: 16px; /* Always left */
}
```

**Fix:**

```css
/* Use logical properties */
.element {
  margin-inline-start: 16px; /* Left in LTR, right in RTL */
}
```

### Issue 4: Absolute Positioning

**Problem:**

```css
.element {
  left: 0; /* Always left */
}
```

**Fix:**

```css
/* Use logical properties */
.element {
  inset-inline-start: 0; /* Left in LTR, right in RTL */
}
```

### Issue 5: Flexbox Direction

**Problem:**

```css
.container {
  display: flex;
  flex-direction: row; /* Always LTR */
}
```

**Fix:**

```css
/* Flexbox auto-reverses in RTL if row-reverse isn't forced */
.container {
  display: flex;
  /* Direction auto-adjusts in RTL */
}

/* Or use Tailwind RTL utilities */
<div className="flex flex-row rtl:flex-row-reverse">
```

---

## 📸 Screenshot Documentation

### Naming Convention

```
RTL-[PAGE]-[ISSUE]-[TIMESTAMP].png

Examples:
RTL-Dashboard-SidebarAlignment-20251117-1430.png
RTL-Checkout-ButtonOrder-20251117-1445.png
RTL-Claims-TableScroll-20251117-1500.png
```

### What to Capture

- Full page view (before fix)
- Close-up of issue (problem area)
- Expected behavior (reference)
- After fix (verification)

---

## ✅ Testing Script

### Automated Playwright Tests (Optional)

Create `tests/rtl/rtl-smoke.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("RTL Layout Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Set RTL mode
    await page.goto("http://localhost:3000");
    await page.evaluate(() => {
      localStorage.setItem("fixzit_locale", "ar");
      document.dir = "rtl";
    });
  });

  test("Dashboard displays in RTL", async ({ page }) => {
    await page.goto("/dashboard");
    const dir = await page.evaluate(() => document.dir);
    expect(dir).toBe("rtl");

    // Check sidebar on right
    const sidebar = page.locator('[data-testid="sidebar"]');
    const box = await sidebar.boundingBox();
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThan(viewport.width / 2);
  });

  test("Forms align correctly in RTL", async ({ page }) => {
    await page.goto("/login");
    const dir = await page.evaluate(() => document.dir);
    expect(dir).toBe("rtl");

    // Check text alignment
    const input = page.locator('input[type="email"]');
    const style = await input.evaluate(
      (el) => window.getComputedStyle(el).textAlign,
    );
    expect(style).toBe("right");
  });

  // Add more tests...
});
```

Run with:

```bash
pnpm playwright test tests/rtl/
```

---

## 📊 Progress Tracking

### Daily Progress Log

**Day 1 (4 hours):**

- [ ] Phase 1: Core Shell (Dashboard, Auth, Work Orders)
- [ ] 20 pages tested
- [ ] Issues found: \_\_\_
- [ ] Critical blockers: \_\_\_

**Day 2 (4 hours):**

- [ ] Phase 2: Transactional Flows (Souq, Aqar, Payments)
- [ ] 15 flows tested
- [ ] Issues found: \_\_\_
- [ ] Critical blockers: \_\_\_

**Day 3 (2 hours):**

- [ ] Phase 3: Admin Panels (Claims, Users, Analytics)
- [ ] 10 pages tested
- [ ] Issues found: \_\_\_
- [ ] Critical blockers: \_\_\_

**Day 4 (2 hours):**

- [ ] Phase 4: Edge Cases & Mobile
- [ ] All components tested
- [ ] Final verification
- [ ] Documentation complete

---

## 🎯 Definition of Done

Before marking RTL QA as complete:

- [ ] All 50+ pages tested in RTL mode
- [ ] Critical issues filed and prioritized
- [ ] Screenshot evidence collected
- [ ] Issue tracker spreadsheet complete
- [ ] At least 90% of issues have fixes planned
- [ ] No critical blockers remain
- [ ] Mobile/tablet views tested
- [ ] Playwright RTL tests created (optional)
- [ ] Results documented
- [ ] Team review completed

---

## 🚀 Quick Start

### Start Testing Now

```bash
# 1. Terminal 1: Start dev server
pnpm dev

# 2. Terminal 2: Open browser
open http://localhost:3000

# 3. Browser Console: Enable RTL
localStorage.setItem('fixzit_locale', 'ar');
document.body.dir = 'rtl';
document.documentElement.dir = 'rtl';
location.reload();

# 4. Start with Phase 1: Dashboard
# 5. Document issues as you find them
# 6. Take screenshots
# 7. Update checklist
```

---

## 📚 Resources

- **Tailwind RTL Plugin:** https://github.com/20lives/tailwindcss-rtl
- **Logical Properties:** https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties
- **RTL Best Practices:** https://rtlstyling.com/posts/rtl-styling
- **Arabic Localization:** https://www.w3.org/International/questions/qa-html-dir

---

**Testing Status:** 🔴 NOT STARTED  
**Blocked By:** Security validation completion  
**Estimated Start:** After security tests complete (~1 hour)  
**Estimated Completion:** 8-12 hours from start  
**Priority:** CRITICAL BLOCKER for production

---

**Next Steps:**

1. ✅ Complete security validation first
2. 🔴 Start Phase 1 (Core Shell) - 4 hours
3. 🔴 Start Phase 2 (Transactions) - 4 hours
4. 🟡 Continue with Phases 3-4 - 4 hours
5. ✅ Document all findings
6. ✅ Prioritize fixes with team
