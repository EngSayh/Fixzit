# RTL QA Testing Session - November 17, 2025

**Status:** 🟢 Server Running - Ready for Testing  
**Server:** http://localhost:3000  
**Duration:** 8-12 hours (can be split across multiple sessions)  
**Impact:** Critical - 70% of users (Arabic speakers)

---

## 🚀 Quick Start - Enable RTL Mode

### Step 1: Open Browser Console

Press `F12` or `Cmd+Option+I` (Mac) to open DevTools

### Step 2: Run RTL Setup Commands

Paste these commands into the console:

```javascript
// Enable Arabic locale and RTL direction
localStorage.setItem("fixzit_locale", "ar");
document.documentElement.dir = "rtl";
document.documentElement.lang = "ar";
document.body.dir = "rtl";

// Reload to apply changes
window.location.reload();
```

### Step 3: Verify RTL Mode Active

After reload, check:

- ✓ Text aligns to the right
- ✓ Navigation menu on the right side
- ✓ Scrollbars on the left
- ✓ Icons and arrows flipped

---

## 📋 Testing Phases

### Phase 1: Core Shell (4 hours)

**Priority:** Highest - Most frequently used pages

| Page                   | URL                    | Status | Issues Found |
| ---------------------- | ---------------------- | ------ | ------------ |
| **Dashboard - FM**     | `/fm/dashboard`        | ☐      |              |
| **Dashboard - Souq**   | `/souq`                | ☐      |              |
| **Dashboard - Aqar**   | `/aqar`                | ☐      |              |
| **Login**              | `/login`               | ☐      |              |
| **Signup**             | `/signup`              | ☐      |              |
| **Forgot Password**    | `/forgot-password`     | ☐      |              |
| **Profile**            | `/profile`             | ☐      |              |
| **Settings**           | `/settings`            | ☐      |              |
| **Work Orders List**   | `/fm/work-orders`      | ☐      |              |
| **Work Order Details** | `/fm/work-orders/[id]` | ☐      |              |
| **Properties List**    | `/aqar`                | ☐      |              |
| **Property Details**   | `/aqar/[id]`           | ☐      |              |

### Phase 2: Transactions (4 hours)

**Priority:** High - Revenue-generating flows

| Page                    | URL                     | Status | Issues Found |
| ----------------------- | ----------------------- | ------ | ------------ |
| **Souq Marketplace**    | `/souq`                 | ☐      |              |
| **Product Details**     | `/souq/product/[id]`    | ☐      |              |
| **Shopping Cart**       | `/souq/cart`            | ☐      |              |
| **Checkout**            | `/souq/checkout`        | ☐      |              |
| **PayTabs Payment**     | `/souq/payment`         | ☐      |              |
| **Order Confirmation**  | `/souq/orders/[id]`     | ☐      |              |
| **Aqar Booking**        | `/aqar/booking/[id]`    | ☐      |              |
| **Work Order Creation** | `/fm/work-orders/new`   | ☐      |              |
| **Invoice Payment**     | `/fm/invoices/[id]/pay` | ☐      |              |
| **Support Ticket**      | `/support/new`          | ☐      |              |

### Phase 3: Admin Panels (2 hours)

**Priority:** Medium - Internal users

| Page                    | URL                           | Status | Issues Found |
| ----------------------- | ----------------------------- | ------ | ------------ |
| **Claims Review**       | `/admin/claims`               | ☐      |              |
| **User Management**     | `/admin/users`                | ☐      |              |
| **Analytics Dashboard** | `/admin/analytics`            | ☐      |              |
| **Reports**             | `/admin/reports`              | ☐      |              |
| **Seller Central**      | `/marketplace/seller-central` | ☐      |              |
| **Vendor Management**   | `/admin/vendors`              | ☐      |              |

### Phase 4: Edge Cases & Mobile (2 hours)

**Priority:** Medium - Polish and responsiveness

| Component               | Test Scenario                 | Status | Issues Found |
| ----------------------- | ----------------------------- | ------ | ------------ |
| **Toast Notifications** | Trigger success/error toasts  | ☐      |              |
| **Modal Dialogs**       | Open confirmation modals      | ☐      |              |
| **Data Tables**         | Scroll wide tables            | ☐      |              |
| **Form Validation**     | Submit invalid forms          | ☐      |              |
| **Date Picker**         | Select dates in Arabic        | ☐      |              |
| **Number Formatting**   | Check Arabic numerals         | ☐      |              |
| **Mobile Menu**         | Test on mobile viewport       | ☐      |              |
| **Long Text**           | Test with lengthy Arabic text | ☐      |              |

---

## ✅ Per-Page Checklist

For each page, verify the following:

### Layout & Alignment

- [ ] Text aligns to the right (not left)
- [ ] Main navigation appears on the right side
- [ ] Sidebar/drawer opens from the right
- [ ] Breadcrumbs flow right to left
- [ ] Content reads naturally in RTL direction

### Icons & Visual Elements

- [ ] Arrow icons point in correct direction (← instead of →)
- [ ] Chevrons are mirrored appropriately
- [ ] Back buttons point right (to go back)
- [ ] Forward buttons point left (to go forward)
- [ ] Dropdown carets positioned correctly
- [ ] Icons with directional meaning are flipped

### Forms & Inputs

- [ ] Labels appear on the right of inputs
- [ ] Radio buttons aligned to the right
- [ ] Checkboxes aligned to the right
- [ ] Form validation messages appear correctly
- [ ] Placeholder text aligns right
- [ ] Input icons (search, clear) positioned correctly

### Tables & Lists

- [ ] Table headers read right to left
- [ ] First column appears on the right
- [ ] Action buttons in rightmost position
- [ ] Sorting indicators work correctly
- [ ] Horizontal scroll starts from right
- [ ] Row expansion arrows face correct direction

### Buttons & Actions

- [ ] Primary actions on the left (modal confirmation)
- [ ] Secondary actions on the right (modal cancel)
- [ ] Button groups flow right to left
- [ ] Icon buttons mirrored where needed
- [ ] Tooltips appear in correct position

### Navigation & Menus

- [ ] Top navigation bar flows RTL
- [ ] Dropdown menus align to right edge
- [ ] Nested menus expand to the left
- [ ] Tabs flow right to left
- [ ] Pagination controls work intuitively

### Numbers, Dates & Time

- [ ] Numbers use Arabic-Indic numerals (١٢٣٤) or Western (1234) based on locale
- [ ] Dates formatted as DD/MM/YYYY (Arabic standard)
- [ ] Time displayed in 24-hour or 12-hour with AM/PM in Arabic
- [ ] Currency symbols position correctly (SAR 100 or 100 ريال)
- [ ] Phone numbers formatted correctly (+966 5X XXX XXXX)

### Content & Typography

- [ ] Arabic text renders without cuts/wraps
- [ ] Font weights appropriate for Arabic glyphs
- [ ] Line height comfortable for Arabic diacritics
- [ ] Text doesn't overflow containers
- [ ] Mixed Arabic/English displays correctly
- [ ] URLs and emails don't break layout

### Responsive Behavior

- [ ] Mobile menu opens from right
- [ ] Mobile navigation stack order correct
- [ ] Touch targets appropriately sized
- [ ] Swipe gestures feel natural (RTL context)
- [ ] Bottom sheets/modals appear correctly

---

## 🐛 Issue Reporting Template

When you find an issue, document it in this format:

### Issue #1: [Brief Description]

**Page:** `/path/to/page`  
**Severity:** 🔴 Critical / 🟡 Medium / 🟢 Low  
**Type:** Layout / Icon / Form / Table / Content / Navigation

**Expected:**
[What should happen in RTL]

**Actual:**
[What currently happens]

**Screenshot:**
[Attach or describe visual issue]

**Steps to Reproduce:**

1. Navigate to X
2. Click on Y
3. Observe Z

---

## 🎯 Common RTL Issues to Watch For

### High Severity (Fix Immediately)

1. **Overlapping content** - Text or elements overlap in RTL
2. **Wrong scroll direction** - Tables/carousels scroll incorrectly
3. **Inaccessible actions** - Buttons hidden or outside viewport
4. **Form submission broken** - Submit buttons not clickable
5. **Navigation broken** - Can't access key features

### Medium Severity (Fix Soon)

1. **Incorrect icon direction** - Arrows point wrong way but functional
2. **Awkward alignment** - Content works but looks off
3. **Inconsistent styling** - Some areas RTL, others LTR
4. **Spacing issues** - Margins/padding feel wrong
5. **Date/number formatting** - Wrong locale format

### Low Severity (Polish)

1. **Minor visual glitches** - Subtle alignment issues
2. **Tooltip positioning** - Slight misalignment
3. **Hover states** - Animations feel off
4. **Loading states** - Spinners or skeletons not ideal
5. **Focus indicators** - Tab order or ring position

---

## 📊 Progress Tracking

### Overall Progress

- [ ] Phase 1: Core Shell (0/12 pages)
- [ ] Phase 2: Transactions (0/10 pages)
- [ ] Phase 3: Admin Panels (0/6 pages)
- [ ] Phase 4: Edge Cases (0/8 scenarios)

### Time Tracking

| Session | Date   | Hours | Pages Tested | Issues Found |
| ------- | ------ | ----- | ------------ | ------------ |
| 1       | Nov 17 |       |              |              |
| 2       |        |       |              |              |
| 3       |        |       |              |              |

### Issue Summary

| Severity    | Count | Resolved | Remaining |
| ----------- | ----- | -------- | --------- |
| 🔴 Critical | 0     | 0        | 0         |
| 🟡 Medium   | 0     | 0        | 0         |
| 🟢 Low      | 0     | 0        | 0         |
| **Total**   | **0** | **0**    | **0**     |

---

## 🛠️ Quick Fixes Reference

### Common CSS Fixes

```css
/* Force RTL direction */
.container {
  direction: rtl;
  text-align: right;
}

/* Flip icons */
.icon-arrow {
  transform: scaleX(-1);
}

/* Fix float */
.float-left-ltr {
  float: right;
}

/* Margin/Padding */
.ml-4 {
  margin-right: 1rem;
  margin-left: 0;
}

/* Logical properties (preferred) */
.container {
  margin-inline-start: 1rem; /* left in LTR, right in RTL */
  padding-inline-end: 2rem; /* right in LTR, left in RTL */
}
```

### Tailwind RTL Utilities

```jsx
// Use rtl: prefix for RTL-specific styles
<div className="ml-4 rtl:mr-4 rtl:ml-0">

// Use start/end instead of left/right
<div className="text-start"> {/* right in RTL, left in LTR */}

// Logical properties
<div className="ms-4 pe-2"> {/* margin-inline-start, padding-inline-end */}
```

---

## 📞 Support & Resources

**Documentation:**

- RTL Testing Plan: `RTL_QA_TESTING_PLAN.md`
- Theme Guidelines: `THEME_UPGRADE_PLAN.md`
- API Documentation: `/docs/api/`

**Testing Tools:**

```bash
# Run automated RTL tests (after manual QA)
pnpm playwright test --project rtl-ar

# Visual regression tests
pnpm test:visual --rtl

# Accessibility audit
pnpm test:a11y --rtl
```

**Browser Extensions:**

- React DevTools - Inspect component tree
- Axe DevTools - Accessibility scanning
- Chrome DevTools - Responsive mode testing

---

## ✅ Session Completion Checklist

Before marking RTL QA as complete:

- [ ] All 4 phases tested
- [ ] Critical issues resolved
- [ ] Medium issues documented for sprint
- [ ] Screenshots captured for comparison
- [ ] Issue tracker updated
- [ ] Automated tests cover regression
- [ ] Product owner sign-off received
- [ ] Documentation updated
- [ ] Release notes prepared

---

## 🎉 Ready to Begin!

**Current Status:** ✅ Development server running at http://localhost:3000

**Next Steps:**

1. Open http://localhost:3000 in your browser
2. Open browser console (F12)
3. Run the RTL setup commands (from top of this document)
4. Start testing Phase 1: Core Shell
5. Document issues as you find them
6. Create screenshots for visual issues
7. Update progress tracking section

**Good luck with the testing! 🚀**
