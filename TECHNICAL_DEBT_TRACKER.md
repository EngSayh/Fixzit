# Technical Debt Tracker

**Last Updated:** 2025-01-XX  
**Status:** Active Tracking  
**Priority System:** 🔴 Critical | 🟡 High | 🟢 Medium | ⚪ Low

---

## 🔴 Category 1: Security-Critical TODOs

### 1.1 S3 File Upload Implementation (SECURITY-CRITICAL)

**Priority:** 🔴 CRITICAL  
**Status:** Not Implemented  
**Security Risk:** Direct file upload vulnerabilities, potential XSS/malware injection  
**Timeline:** Q1 2025 (Target: Jan 31, 2025)

#### Affected Files:
1. **`components/seller/kyc/DocumentUploadForm.tsx:98`**
   - **Context:** KYC document uploads for seller verification
   - **Current State:** Mock implementation with setTimeout
   - **Required:** Secure S3 pre-signed URL generation with:
     - File type validation (PDF, PNG, JPG only)
     - Size limits (max 10MB per document)
     - Virus scanning integration
     - Encryption at rest
     - Audit logging

2. **`server/services/ats/application-intake.ts:288`**
   - **Context:** Resume/CV uploads for job applications
   - **Current State:** Mock implementation
   - **Required:** Same security requirements as above plus:
     - PII handling compliance (GDPR/CCPA)
     - Resume parsing integration
     - Retention policy enforcement

#### Implementation Plan:
```typescript
// Proposed API Contract
POST /api/upload/presigned-url
{
  "fileType": "application/pdf" | "image/png" | "image/jpeg",
  "fileSize": number,
  "category": "kyc" | "resume" | "invoice",
  "metadata": {
    "userId": string,
    "tenantId": string,
    "purpose": string
  }
}

Response:
{
  "uploadUrl": string,  // Pre-signed S3 URL (15 min expiry)
  "fileKey": string,    // S3 object key
  "expiresAt": string   // ISO timestamp
}
```

#### Acceptance Criteria:
- [ ] Pre-signed URL generation with 15-minute expiry
- [ ] Server-side file type validation
- [ ] Size limit enforcement (10MB)
- [ ] Virus scanning (ClamAV or AWS Macie)
- [ ] Encrypted uploads (AES-256)
- [ ] Audit log entries
- [ ] Unit tests (>90% coverage)
- [ ] Integration tests with S3
- [ ] Security review completed

---

## 🟡 Category 2: FM Module Incomplete APIs

### 2.1 Facilities Management API Implementations

**Priority:** 🟡 HIGH  
**Status:** UI Complete, Backend Pending  
**Business Impact:** FM module unusable in production  
**Timeline:** Q1 2025 (Target: Feb 15, 2025)

#### Affected Pages (All using mock setTimeout):

1. **Reports Generation (`app/fm/reports/new/page.tsx:87`)**
   ```typescript
   // TODO: Replace with actual API call
   await new Promise((resolve) => setTimeout(resolve, 2000));
   ```
   - **Required API:** `POST /api/fm/reports/generate`
   - **Payload:** 
     ```typescript
     {
       reportType: 'maintenance' | 'asset' | 'space' | 'compliance' | 'financial',
       dateRange: { start: Date, end: Date },
       format: 'pdf' | 'excel' | 'csv',
       filters?: Record<string, any>
     }
     ```
   - **Response:** Report job ID for async processing

2. **Report Schedules (`app/fm/reports/schedules/new/page.tsx:67`)**
   - **Required API:** `POST /api/fm/reports/schedules`
   - **Payload:** Schedule configuration (frequency, recipients, filters)

3. **Budget Management (`app/fm/finance/budgets/page.tsx:173`)**
   - **Required API:** `POST /api/fm/budgets`
   - **Payload:** Budget details (name, department, amount, period)

4. **User Invitations (`app/fm/system/users/invite/page.tsx:41`)**
   - **Required API:** `POST /api/fm/users/invite`
   - **Payload:** User email, role, permissions

5. **System Integrations (`app/fm/system/integrations/page.tsx:81`)**
   - **Required API:** `POST /api/fm/integrations/{id}/toggle`
   - **Payload:** Integration ID, action (connect/disconnect)

6. **Role Management (`app/fm/system/roles/new/page.tsx:64`)**
   - **Required API:** `POST /api/fm/roles`
   - **Payload:** Role name, permissions array

#### Implementation Strategy:
1. **Phase 1 (Week 1):** Define OpenAPI specs for all 6 endpoints
2. **Phase 2 (Week 2):** Implement database schemas and migrations
3. **Phase 3 (Week 3):** Build API routes with authentication/authorization
4. **Phase 4 (Week 4):** Integration testing and UI connection
5. **Phase 5 (Week 5):** UAT with FM team, bug fixes
6. **Phase 6 (Week 6):** Production deployment with rollback plan

#### Acceptance Criteria:
- [ ] All 6 API endpoints implemented
- [ ] OpenAPI documentation complete
- [ ] Unit tests (>85% coverage)
- [ ] Integration tests for each endpoint
- [ ] Error handling and validation
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Performance testing (< 500ms p95)

---

## 🟢 Category 3: Feature Completeness

### 3.1 Claims Bulk Actions

**Priority:** 🟢 MEDIUM  
**Status:** TODO Comment in Code  
**Business Impact:** Admin efficiency (nice-to-have)  
**Timeline:** Q2 2025 (Backlog)

#### Affected File:
- **`components/admin/claims/ClaimReviewPanel.tsx:211`**
  ```typescript
  // TODO: Implement bulk action API call
  ```

#### Required Implementation:
- **API:** `POST /api/admin/claims/bulk`
- **Actions:** Approve, Reject, Request Info, Assign
- **Payload:**
  ```typescript
  {
    claimIds: string[],
    action: 'approve' | 'reject' | 'request-info' | 'assign',
    metadata?: {
      reason?: string,
      assigneeId?: string,
      notes?: string
    }
  }
  ```

#### Acceptance Criteria:
- [ ] Bulk action API endpoint
- [ ] Optimistic UI updates
- [ ] Progress indicator for large batches
- [ ] Error handling per claim
- [ ] Undo capability (5-second window)
- [ ] Audit trail

---

## 📊 Summary Dashboard

| Category | Total Items | Critical | High | Medium | Low |
|----------|-------------|----------|------|--------|-----|
| Security-Critical | 2 | 2 | 0 | 0 | 0 |
| FM Module APIs | 6 | 0 | 6 | 0 | 0 |
| Feature Completeness | 1 | 0 | 0 | 1 | 0 |
| **TOTAL** | **9** | **2** | **6** | **1** | **0** |

---

## 🎯 Next Actions

### Immediate (This Week)
1. ✅ Document all technical debt items
2. ⏳ Create Jira tickets for S3 uploads
3. ⏳ Schedule security review meeting

### Short-term (Next 2 Weeks)
1. ⏳ Define OpenAPI specs for FM module
2. ⏳ Start S3 upload security implementation
3. ⏳ Code review of current mock implementations

### Long-term (Q1-Q2 2025)
1. ⏳ Complete FM module backend
2. ⏳ Deploy S3 uploads to production
3. ⏳ Evaluate bulk actions feature priority

---

## 📝 Notes

### Why These TODOs Exist
- **FM Module:** UI was built ahead of backend to unblock design reviews
- **S3 Uploads:** Waiting for AWS infrastructure provisioning
- **Bulk Actions:** Deferred to prioritize core claim workflow

### Risk Mitigation
- All TODO pages show clear "Demo Mode" indicators to users
- Production environment variables prevent accidental use
- Regular technical debt reviews in sprint planning

---

**Maintained by:** Engineering Team  
**Review Cadence:** Bi-weekly (every other sprint)  
**Last Reviewed:** 2025-01-XX
