# Theme Upgrade Action Plan

## Session Goal
Systematically fix ALL Yellow-flagged components by:
1. Replacing hardcoded colors with theme classes
2. Adding RTL support
3. Adding missing interactivity
4. Implementing proper state management

## Priority Queue

### 🔴 HIGH PRIORITY (Core User Flows)
1. ✅ `/app/login/page.tsx` - 17 hardcoded colors
2. `/app/signup/page.tsx` - Login flow dependency  
3. `/app/profile/page.tsx` - User settings
4. `/app/forgot-password/page.tsx` - Password recovery
5. `/app/not-found.tsx` - Error handling

### 🟡 MEDIUM PRIORITY (Feature Pages)
6. `/app/help/page.tsx` - Support system
7. `/app/help/[slug]/page.tsx` - Help articles
8. `/app/notifications/page.tsx` - User notifications
9. `/app/careers/[slug]/page.tsx` - Job applications

### 🟢 LOW PRIORITY (Admin/Finance)
10. `/app/finance/budgets/new/page.tsx`
11. `/app/finance/invoices/new/page.tsx`
12. `/app/finance/payments/new/page.tsx`
13. `/app/finance/expenses/new/page.tsx`

## Color Mapping Reference

| Old Hardcoded | New Theme Class | Usage |
|---------------|-----------------|-------|
| `#0061A8` | `brand-500` | Primary brand color |
| `#00A859` | `success` | Success/green actions |
| `#FFB400` | `accent` | Accent/yellow highlights |
| `fixzit-blue` | `brand-500` | Legacy blue |
| `fixzit-green` | `success` | Legacy green |
| `fixzit-yellow` | `accent` | Legacy yellow |

## RTL Support Checklist
- [ ] Root container: Add `${isRTL ? 'rtl' : 'ltr'}`
- [ ] Flex containers: Add `${isRTL ? 'flex-row-reverse' : ''}`
- [ ] Text alignment: Add `${isRTL ? 'text-right' : 'text-left'}`
- [ ] Margins/Padding: Use logical properties or conditionals

## Interactive Components Checklist
- [ ] Add `useState` for form fields
- [ ] Add `onChange` handlers
- [ ] Add `onClick` handlers for buttons
- [ ] Replace DOM manipulation with React state
- [ ] Add loading states
- [ ] Add error handling
- [ ] Implement API calls

## Progress Tracking

### Completed This Session
- ✅ ViewingScheduler.tsx (Commit 7ffa57b9f)
- ✅ Terms page (Commit 22a0fe107)
- ✅ Souq landing page (Commit e1299eb5b)
- ✅ Property Detail page (Commit 65f558097)
- ✅ Login page - 17 replacements (Commit 2236722fc)
- ✅ Signup page - 19 replacements (Commit 270001832)
- ✅ Forgot-password page - 10 replacements (Commit f6abb4592)
- ✅ Not-found page - 7 replacements (Commit d5a33eb15)
- ✅ Help page - 8 replacements (Commit 75d99ee4e)
- ✅ Profile page - 20+ replacements (Commit ff37d0bc0)

### In Progress
- 🔄 Notifications page (NEXT)

### Pending High Priority
- Careers pages
- Finance forms (53 total instances)
