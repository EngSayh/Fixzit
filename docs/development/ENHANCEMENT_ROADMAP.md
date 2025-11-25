# Fixzit Enhancement Roadmap

## Extracted from Gemini Code Review (Adapted for Next.js/React)

---

## 🎯 High Priority Enhancements

### 1. Referral Program System

**Status**: Not Implemented  
**Technology**: Next.js API routes + MongoDB

**Requirements**:

- Dual-sided incentive (referrer + referee both get rewards)
- 10% discount on maintenance services
- Maximum 20 SAR per month cap
- 3 uses per month limit
- Unique referral codes per user
- WhatsApp/SMS/Email sharing integration
- Super Admin toggle to enable/disable program

**Implementation Plan**:

```typescript
// Models needed:
-ReferralCode(user_id, code, created_at) -
  ReferralReward(referrer_id, referee_id, amount, status, used_count) -
  ReferralUsage(user_id, month, usage_count, total_savings) -
  // API Routes needed:
  POST / api / referrals / generate -
  code -
  POST / api / referrals / apply -
  code -
  GET / api / referrals / stats -
  GET / api / referrals / history;
```

**Files to Create/Modify**:

- `models/Referral.ts` - MongoDB schema
- `app/api/referrals/*` - API routes
- `app/(dashboard)/referrals/page.tsx` - UI page
- `contexts/ReferralContext.tsx` - State management

---

### 2. Family Account Management

**Status**: Not Implemented  
**Technology**: Next.js + MongoDB

**Requirements**:

- Main user can invite family members
- No spending caps (unlimited access to main account)
- Relationship tracking (spouse, child, parent, sibling)
- Family members can update their own relationship
- Sub-users can order and pay from main account
- Optional: Set monthly budget per family member

**Implementation Plan**:

```typescript
// Models needed:
-FamilyMember(main_user_id, member_user_id, relationship, permissions) -
  FamilyInvitation(inviter_id, email, code, status, expires_at) -
  // API Routes needed:
  POST / api / family / invite -
  POST / api / family / accept -
  invitation -
  PUT / api / family / update -
  relationship -
  GET / api / family / members -
  DELETE / api / family / remove -
  member;
```

---

### 3. Project Bidding System Enhancement

**Status**: Partially Implemented  
**Needs**: Backend API + Geo-location filtering

**Requirements**:

- 10 KM radius service provider matching
- Google Maps integration for address selection
- Drag-and-drop service arrangement
- Maximum 3 offers per service
- Electronic agreement generation (Saudi law compliant)
- Escrow-style payment (release after customer confirmation)
- Partial payments for materials (with customer consent)
- Dual rating system (customer ↔ service provider)

**Implementation Plan**:

```typescript
// API Routes needed:
- POST /api/projects/create
- GET /api/projects/nearby-providers?lat=...&lng=...&radius=10
- POST /api/projects/:id/bids
- PUT /api/projects/:id/approve-bid
- POST /api/projects/:id/payments/escrow
- POST /api/projects/:id/payments/release
- POST /api/projects/:id/rate
```

---

### 4. Receipt Voucher System

**Status**: Not Implemented  
**Technology**: PDF generation + QR codes

**Requirements**:

- Email/SMS/WhatsApp delivery based on customer preference
- QR code for verification
- Separate verification page to prevent fraud
- Auto-populate recipient (customer), employee, line manager
- Integration with HR organizational structure

**Implementation Plan**:

```typescript
// Libraries needed:
- @react-pdf/renderer or jsPDF for PDF generation
- qrcode for QR code generation
- nodemailer for email
- twilio for SMS
- whatsapp-web.js for WhatsApp

// API Routes needed:
- POST /api/receipts/generate
- POST /api/receipts/send
- GET /api/receipts/verify/:code
```

---

### 5. HR Module

**Status**: Not Implemented  
**Requirements**:

- Employee tracking
- Vacation request system
- Line manager approval workflow
- Organizational structure definition
- Employee services automation

**Implementation Plan**:

```typescript
// Models needed:
- Employee (user_id, department, line_manager_id, hire_date)
- VacationRequest (employee_id, start_date, end_date, status, reason)
- OrganizationalStructure (employee_id, reports_to, level)

// API Routes needed:
- POST /api/hr/employees
- POST /api/hr/vacation-requests
- PUT /api/hr/vacation-requests/:id/approve
- GET /api/hr/organizational-chart
```

---

## 🔧 Technical Improvements

### 6. Payment Method Storage (Secure)

**Status**: Not Implemented  
**Requirements**:

- Bank-level encryption (tokenization)
- Multiple card support (Visa, Mastercard, Mada, Amex)
- Default payment method selection
- Auto-payment settings with spending limits
- Integration with Saudi payment gateways (Tap, MyFatoorah)

**Implementation Plan**:

```typescript
// Use payment gateway tokenization - NEVER store card details
// API Routes needed:
- POST /api/payment-methods/add (returns token from gateway)
- GET /api/payment-methods
- PUT /api/payment-methods/:id/set-default
- DELETE /api/payment-methods/:id
- PUT /api/payment-methods/auto-pay-settings
```

---

### 7. Service Provider Registration & Verification

**Status**: Partially Implemented  
**Requirements**:

- Amazon-style vendor registration
- Document upload for Saudi government compliance
- Pending → Approved → Active workflow
- Super Admin approval required
- Two types: Technical service providers, Material vendors

**Implementation Plan**:

```typescript
// Models needed:
-ServiceProvider(user_id, company_name, license_number, status, documents) -
  ProviderDocument(provider_id, doc_type, file_url, verified_at);

// Statuses: pending, under_review, approved, rejected, suspended
```

---

### 8. Maintenance Scheduling with Availability

**Status**: Partially Implemented  
**Requirements**:

- Real-time availability calendar
- Service provider can set their schedule
- Customer selects date/time from available slots
- 5% platform fee (configurable by Super Admin)
- Spare parts approval workflow
- Option to buy from online store if customer declines

**Implementation Plan**:

```typescript
// Models needed:
-ProviderAvailability(provider_id, date, time_slots, is_available) -
  MaintenanceAppointment(ticket_id, provider_id, scheduled_at, status) -
  SparePartsApproval(ticket_id, parts_list, customer_response, store_order_id);
```

---

## 📊 UI/UX Enhancements

### 9. iOS-Style Toggle Switches

**Status**: Not Implemented  
**Requirements**:

- Replace all on/off options with iOS-style toggles
- Consistent design across admin settings
- Super Admin can hide/show feature groups
- Feature flags for gradual rollout

**Implementation Plan**:

```typescript
// Create reusable component:
// components/ui/IOSToggle.tsx

// Store feature flags in:
// models/FeatureFlag.ts
// API: /api/admin/feature-flags
```

---

### 10. Language-Specific Content

**Status**: Partially Implemented  
**Requirements**:

- If English selected: ALL content in English
- If Arabic selected: ALL content in Arabic
- No mixing of languages on same page
- Store user language preference in profile
- Persistent across sessions

**Current Issues**:

- Some pages have mixed language content
- Need to audit all pages for language consistency

---

### 11. Date/Calendar Improvements

**Status**: Partially Implemented  
**Requirements**:

- Auto-detect device locale or user preference
- Format: DD Month-Name YYYY (e.g., "25 October 2025")
- Toggle for Hijri calendar conversion
- Calendar picker should change dynamically

---

### 12. Universal Action Buttons

**Status**: Partially Implemented  
**Requirements**:

- Save, Back, Home buttons on ALL screens
- Confirmation dialog when clicking Back without saving
- Consistent placement across application

---

## 🔐 Security & Compliance

### 13. Comprehensive Audit Logging

**Status**: Not Implemented  
**Requirements**:

- Log ALL database operations (create, update, delete)
- Timestamp every entry
- Track which user made the change
- Separate audit log viewer page
- Include soft-deleted data in logs

**Implementation Plan**:

```typescript
// Middleware for Mongoose to auto-log changes
// Model: AuditLog (user_id, action, model, record_id, changes, timestamp)
// API: /api/admin/audit-logs (Super Admin only)
```

---

### 14. Backup & Data Export

**Status**: Not Implemented  
**Requirements**:

- Daily automatic backups
- Ad-hoc backup option (Super Admin only)
- Data download restricted to Super Admin
- Subscribers must create ticket to request data
- Backup retention policy

---

### 15. Two-Level Admin Structure

**Status**: Partially Implemented  
**Requirements**:

- **Super Admin**: Manages ALL subscriptions, global settings
- **Subscribed Admin**: Manages own company data only
- Clear separation of permissions
- Notification system for communications

---

## 📢 Notification System

### 16. Multi-Channel Notifications

**Status**: Partially Implemented  
**Requirements**:

- Web push notifications
- iOS/Android push notifications (when apps deployed)
- SMS notifications
- WhatsApp notifications
- Email notifications
- User can select preferred channels in profile
- Send by contract number with auto-populated customer data

---

## 🎨 Branding & UI

### 17. Company Branding Integration

**Status**: Logo provided, needs implementation  
**Requirements**:

- Company logo: [Provided in conversation]
- Application logo and letterhead design: [Provided - 8 images]
- Email signature template
- Consistent branding across all pages
- Downloadable branded PDF reports

---

## 📈 Analytics & Reporting

### 18. Market Intelligence Dashboard

**Status**: Not Implemented  
**Requirements**:

- Competitor pricing tracker (CEO/Super Admin only)
- Refresh mechanism for pricing data
- Not visible to subscribers
- Market trends and benchmarks

---

### 19. Dashboard Enhancements (Ejar-style)

**Status**: Partially Implemented  
**Requirements**:

- Swipeable dashboard cards (left/right navigation)
- Filters at top of each dashboard
- Summary view on home screen
- Match Ejar government system benchmark

---

## 🛠️ System Optimization

### 20. Page Consolidation

**Status**: Needs Review  
**Current Issue**: Too many separate pages, fragmented UX  
**Goal**: Consolidate related features into tabbed interfaces

**Example Consolidations**:

- "Create Service" + "Create Product" → "Marketplace Management" (with tabs)
- Multiple financial pages → Unified "Financial Management" (with sections)
- Service provider pages → Single dashboard with sub-sections

---

### 21. Permission Matrix UI

**Status**: Implemented but not functional  
**Requirements**:

- Interactive permission matrix
- Can select users
- Can add/remove/update permissions
- Visual indication of current permissions
- Bulk permission updates

---

### 22. Job Application Process

**Status**: Not Implemented  
**Requirements**:

- Career page with job listings
- Application form with CV upload
- LinkedIn profile integration
- Interview stage tracking
- Applicant management dashboard

---

## 🧪 Testing & Quality

### 23. Test Suite Fixes

**Status**: CRITICAL - 40 files failing  
**Priority**: HIGH  
**Requirements**:

- Fix all 230 failing tests
- Update test patterns for async operations
- Add missing test coverage
- Ensure tests run in CI/CD

---

### 24. Bug Reporting System with AI

**Status**: Not Implemented  
**Requirements**:

- In-app bug reporting
- AI-powered troubleshooting suggestions
- 300 character limit for complaints
- Upload up to 5 photos/documents
- Email confirmation with ticket details
- Help documentation search

---

## 🌍 Localization & Accessibility

### 25. Ejar System Alignment

**Status**: Needs Enhancement  
**Requirements**:

- Match Ejar field names and structure
- Optimize data entry flow to match government system
- Accurate Arabic translations
- Proper RTL layout for ALL pages

---

## 📦 Feature Flags & Rollout

### 26. Feature Group Management

**Status**: Not Implemented  
**Requirements**:

- Super Admin can hide feature groups (for bug fixes or staged rollout)
- iOS-style on/off toggles
- Applied everywhere on/off options exist
- Feature availability by subscription tier

---

## Implementation Priority Matrix

| Priority | Enhancement                 | Complexity | Business Value | Estimated Effort |
| -------- | --------------------------- | ---------- | -------------- | ---------------- |
| P0       | Test Suite Fixes            | Medium     | Critical       | 2-3 days         |
| P0       | Language Consistency        | Low        | High           | 1-2 days         |
| P1       | Referral Program            | Medium     | High           | 3-4 days         |
| P1       | Family Management           | Medium     | High           | 2-3 days         |
| P1       | Audit Logging               | Medium     | High           | 2-3 days         |
| P2       | Receipt Voucher System      | High       | Medium         | 4-5 days         |
| P2       | HR Module                   | High       | Medium         | 5-7 days         |
| P2       | Project Bidding Enhancement | High       | High           | 5-7 days         |
| P2       | Payment Method Storage      | High       | High           | 3-4 days         |
| P3       | iOS-Style Toggles           | Low        | Low            | 1 day            |
| P3       | Market Intelligence         | Medium     | Low            | 2-3 days         |
| P3       | Job Application System      | Medium     | Low            | 3-4 days         |
| P3       | Bug Reporting with AI       | High       | Medium         | 4-5 days         |

---

## Notes for Implementation

1. **Always maintain backward compatibility** - existing features must continue working
2. **Mobile-first approach** - all new features must work on mobile
3. **Security first** - never store sensitive data unencrypted
4. **Audit everything** - all changes must be logged
5. **Test before deploy** - no feature goes live without tests
6. **Document as you go** - update docs with each feature

---

**Last Updated**: 2025-10-25  
**Next Review**: After PR #141 merge
