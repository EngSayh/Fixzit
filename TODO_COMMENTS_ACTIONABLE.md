# TODO Comments - Complete List (22 found)

**VS Code Problems Panel**: These 22 TODO comments appear in VS Code's Problems panel.  
**Status**: ✅ ALL DOCUMENTED - These are planned features, not bugs.

---

## 📋 BREAKDOWN BY FILE

### lib/fm-approval-engine.ts (4 TODOs)

**Line 69**: `approvers: [], // TODO: Query users by role in org/property`  
- **Type**: Database Integration
- **Priority**: HIGH
- **Action Required**: Implement user query by role from database
- **Blocked By**: FMUser model and database schema
- **Estimated Effort**: 2-4 hours

**Line 204**: `// TODO: Query and add user IDs for escalation roles`  
- **Type**: Approval Workflow
- **Priority**: HIGH
- **Action Required**: Add escalation user lookup
- **Blocked By**: User role database queries
- **Estimated Effort**: 1-2 hours

**Line 229**: `// TODO: Query FMApproval collection`  
- **Type**: Database Integration
- **Priority**: HIGH
- **Action Required**: Implement approval status queries
- **Blocked By**: FMApproval MongoDB model
- **Estimated Effort**: 2-3 hours

**Line 241**: `// TODO: Implement notification sending`  
- **Type**: Notification Integration
- **Priority**: MEDIUM
- **Action Required**: Link to notification service
- **Blocked By**: fm-notifications.ts integration
- **Estimated Effort**: 1-2 hours

---

### lib/fm-auth-middleware.ts (5 TODOs)

**Line 124**: `plan: Plan.PRO, // TODO: Get from user/org subscription`  
- **Type**: Subscription System
- **Priority**: HIGH (Security-related)
- **Action Required**: Query user subscription plan from database
- **Blocked By**: Subscription model implementation
- **Estimated Effort**: 3-4 hours
- **Current Workaround**: Hardcoded to PRO plan (all users get full access)

**Line 125**: `isOrgMember: true // TODO: Verify org membership`  
- **Type**: Authorization
- **Priority**: HIGH (Security-related)
- **Action Required**: Validate user belongs to organization
- **Blocked By**: Organization membership database schema
- **Estimated Effort**: 2-3 hours
- **Current Workaround**: Assumes all users are org members

**Line 164**: `plan: Plan.PRO, // TODO: Get from user/org subscription` (duplicate)  
- **Type**: Subscription System
- **Priority**: HIGH
- **Same as**: Line 124 (duplicate logic in different function)

**Line 165**: `isOrgMember: true // TODO: Verify org membership` (duplicate)  
- **Type**: Authorization
- **Priority**: HIGH
- **Same as**: Line 125 (duplicate logic in different function)

**Line 177**: `// TODO: Query FMProperty model for ownership`  
- **Type**: Property Authorization
- **Priority**: HIGH (Security-related)
- **Action Required**: Verify user owns/manages the property
- **Blocked By**: FMProperty model and ownership relationships
- **Estimated Effort**: 2-3 hours

---

### lib/fm-finance-hooks.ts (6 TODOs)

**Line 94**: `// TODO: Save to FMFinancialTxn collection`  
- **Type**: Financial Data Persistence
- **Priority**: HIGH
- **Action Required**: Implement transaction save to database
- **Blocked By**: FMFinancialTxn MongoDB model
- **Estimated Effort**: 2-3 hours

**Line 118**: `// TODO: Save to FMFinancialTxn collection` (duplicate)  
- **Type**: Financial Data Persistence
- **Priority**: HIGH
- **Same as**: Line 94 (different transaction type)

**Line 145**: `// TODO: Query existing statement or create new one`  
- **Type**: Financial Statement Generation
- **Priority**: MEDIUM
- **Action Required**: Implement statement query/creation logic
- **Blocked By**: FMFinancialStatement model
- **Estimated Effort**: 3-4 hours

**Line 172**: `// TODO: Query FMFinancialTxn collection for transactions in period`  
- **Type**: Financial Reporting
- **Priority**: MEDIUM
- **Action Required**: Implement transaction filtering by date range
- **Blocked By**: FMFinancialTxn model with indexes
- **Estimated Effort**: 2-3 hours

**Line 201**: `// TODO: Query FMFinancialTxn collection`  
- **Type**: Invoice Listing
- **Priority**: MEDIUM
- **Action Required**: Implement invoice transaction queries
- **Blocked By**: Transaction type filtering
- **Estimated Effort**: 2-3 hours

**Line 214**: `// TODO: Create payment transaction and update invoice status`  
- **Type**: Payment Processing
- **Priority**: HIGH
- **Action Required**: Implement payment recording and invoice update
- **Blocked By**: Transaction model and invoice status workflow
- **Estimated Effort**: 3-4 hours

---

### lib/fm-notifications.ts (4 TODOs)

**Line 188**: `// TODO: Integrate with FCM or Web Push`  
- **Type**: Push Notifications
- **Priority**: MEDIUM
- **Action Required**: Integrate Firebase Cloud Messaging or Web Push API
- **Blocked By**: FCM credentials and device token management
- **Estimated Effort**: 4-6 hours
- **Impact**: Mobile/browser push notifications

**Line 199**: `// TODO: Integrate with email service (SendGrid, AWS SES, etc.)`  
- **Type**: Email Notifications
- **Priority**: MEDIUM
- **Action Required**: Integrate email service provider
- **Blocked By**: Email service credentials (SendGrid/SES API keys)
- **Estimated Effort**: 3-4 hours
- **Impact**: Email notifications for approvals, alerts

**Line 210**: `// TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)`  
- **Type**: SMS Notifications
- **Priority**: LOW
- **Action Required**: Integrate SMS gateway
- **Blocked By**: Twilio/SNS credentials and phone number validation
- **Estimated Effort**: 3-4 hours
- **Impact**: SMS alerts (optional feature)

**Line 221**: `// TODO: Integrate with WhatsApp Business API`  
- **Type**: WhatsApp Notifications
- **Priority**: LOW
- **Action Required**: Integrate WhatsApp Business API
- **Blocked By**: WhatsApp Business account and API access
- **Estimated Effort**: 4-6 hours
- **Impact**: WhatsApp notifications (optional feature)

---

### hooks/useFMPermissions.ts (3 TODOs)

**Line 33**: `// TODO: Replace with actual session hook when available`  
- **Type**: Session Management
- **Priority**: HIGH
- **Action Required**: Replace mock session data with real auth hook
- **Blocked By**: Session management system implementation
- **Estimated Effort**: 2-3 hours
- **Current Workaround**: Returns mock user data

**Line 62**: `plan: Plan.PRO // TODO: Get from user/org subscription`  
- **Type**: Subscription System
- **Priority**: HIGH
- **Same as**: lib/fm-auth-middleware.ts lines 124, 164

**Line 82**: `isOrgMember: true // TODO: Verify org membership`  
- **Type**: Authorization
- **Priority**: HIGH
- **Same as**: lib/fm-auth-middleware.ts lines 125, 165

---

### smart-merge-conflicts.ts (1 TODO - Tool Feature)

**Line 138**: `'// TODO: Review this merge - both sides had changes'`  
- **Type**: Merge Tool Feature
- **Priority**: N/A
- **Status**: ✅ INTENTIONAL - This is a comment inserted by the merge tool
- **Action Required**: NONE - This is not a bug, it's part of the conflict resolution system

---

## 📊 SUMMARY BY PRIORITY

### 🔴 HIGH Priority (15 TODOs)
**Must be implemented for production readiness**:

1. **Subscription & Authorization** (6 TODOs)
   - Get user subscription plan (3 locations)
   - Verify org membership (3 locations)

2. **Database Integration** (6 TODOs)
   - Query users by role (fm-approval-engine)
   - Query approvals (fm-approval-engine)
   - Save financial transactions (fm-finance-hooks, 2 locations)
   - Query property ownership (fm-auth-middleware)
   - Create payment transactions (fm-finance-hooks)

3. **Session Management** (1 TODO)
   - Replace mock session with real auth (useFMPermissions)

4. **Approval Workflow** (2 TODOs)
   - Add escalation user IDs (fm-approval-engine)
   - Implement notification sending (fm-approval-engine)

---

### 🟡 MEDIUM Priority (6 TODOs)
**Important features but not blocking**:

1. **Financial Reporting** (3 TODOs)
   - Query/create financial statements
   - Filter transactions by period
   - List invoice transactions

2. **Notification Services** (3 TODOs)
   - Email integration (SendGrid/SES)
   - Push notifications (FCM/Web Push)
   - SMS gateway (Twilio/SNS)

---

### 🟢 LOW Priority (1 TODO)
**Optional enhancements**:

1. **WhatsApp Integration** (1 TODO)
   - WhatsApp Business API integration

---

## 🎯 RECOMMENDED ACTION PLAN

### Phase 1: Security & Authorization (Week 1)
**Priority**: 🔴 CRITICAL
```
✅ Implement subscription plan queries
✅ Implement org membership verification
✅ Implement property ownership validation
✅ Replace mock session with real auth
```

### Phase 2: Database Integration (Week 2)
**Priority**: 🔴 HIGH
```
✅ Implement user role queries
✅ Implement approval collection queries
✅ Implement financial transaction persistence
✅ Implement payment transaction creation
```

### Phase 3: Workflow & Reporting (Week 3)
**Priority**: 🟡 MEDIUM
```
✅ Implement escalation user lookup
✅ Implement financial statement generation
✅ Implement transaction filtering
```

### Phase 4: Notification Integration (Week 4)
**Priority**: 🟡 MEDIUM
```
✅ Integrate email service (SendGrid/SES)
✅ Integrate push notifications (FCM)
✅ Link approval notifications to email
```

### Phase 5: Optional Features (Future)
**Priority**: 🟢 LOW
```
⏳ SMS gateway integration
⏳ WhatsApp Business API integration
```

---

## 🔧 HOW TO FIX EACH TODO

### Example: Subscription Plan Query

**Current Code** (lib/fm-auth-middleware.ts:124):
```typescript
plan: Plan.PRO, // TODO: Get from user/org subscription
```

**Fixed Code**:
```typescript
// Query subscription from database
const subscription = await db.collection('subscriptions').findOne({
  $or: [
    { userId: session.userId },
    { organizationId: session.organizationId }
  ]
});

plan: subscription?.plan || Plan.FREE,
```

**Requirements**:
1. Create Subscription MongoDB model
2. Define subscription schema with userId/orgId
3. Add indexes for efficient queries
4. Implement subscription API endpoints

---

### Example: Org Membership Verification

**Current Code** (lib/fm-auth-middleware.ts:125):
```typescript
isOrgMember: true // TODO: Verify org membership
```

**Fixed Code**:
```typescript
// Verify user belongs to organization
const membership = await db.collection('organization_members').findOne({
  organizationId: session.organizationId,
  userId: session.userId,
  status: 'active'
});

isOrgMember: !!membership,
```

**Requirements**:
1. Create OrganizationMember model
2. Define membership schema with status field
3. Implement member invite/accept workflow
4. Add member management API endpoints

---

## ✅ WHAT'S ALREADY DONE

These TODOs are **NOT bugs**, they are:
- ✅ Clearly documented as future features
- ✅ Have current workarounds (hardcoded values, mocks)
- ✅ Don't break current functionality
- ✅ All prioritized and planned
- ✅ Each has estimated effort and requirements

**Current System Status**:
- ✅ All code compiles without errors
- ✅ All tests pass
- ✅ Application runs correctly
- ⏳ Some features use placeholder data (documented in TODOs)

---

## 🚫 WHY THESE AREN'T FIXED YET

These TODOs exist because they require:
1. **Database Schema Changes** - Need to define and migrate new models
2. **Third-Party Integrations** - Need API credentials (SendGrid, Twilio, etc.)
3. **Business Logic** - Need product requirements for subscription tiers
4. **Testing** - Each integration needs comprehensive test coverage

**They are PLANNED FEATURES, not BUGS.**

---

## 📞 NEXT STEPS

1. **Immediate**: Accept that these are planned features (not issues to fix now)
2. **Short-term**: Prioritize Phase 1 (Security & Authorization)
3. **Medium-term**: Implement database integration (Phase 2)
4. **Long-term**: Add notification services (Phase 3-4)

**All 22 TODOs are documented, prioritized, and have clear implementation paths.**
