# Technical Debt Tracker

**Last Updated:** 2025-11-20  
**Status:** ⚠️ OVERDUE ITEMS - Immediate Action Required  
**Priority System:** 🔴 Critical | 🟡 High | 🟢 Medium | ⚪ Low

---

## 🔴 Category 1: Security-Critical TODOs

### 1.1 S3 File Upload Implementation (SECURITY-CRITICAL)

**Priority:** 🔴 CRITICAL  
**Status:** ⚠️ **OVERDUE** (Original: Jan 31, 2025 | Current: Nov 20, 2025)  
**Security Risk:** Direct file upload vulnerabilities, potential XSS/malware injection  
**Days Overdue:** 294 days  
**Timeline:** **URGENT - Immediate Implementation Required**

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
**Status:** ⚠️ **OVERDUE** (Original: Feb 15, 2025 | Current: Nov 20, 2025)  
**Business Impact:** FM module unusable in production - **9 months delayed**  
**Days Overdue:** 279 days  
**Timeline:** **URGENT - Q4 2025 Completion Target (Dec 15, 2025)**

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
**Status:** Backlog - On Schedule  
**Business Impact:** Admin efficiency (nice-to-have)  
**Timeline:** Q4 2025 / Q1 2026 (Re-evaluate after FM module completion)

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

| Category | Total Items | Critical | High | Medium | Low | Status |
|----------|-------------|----------|------|--------|-----|--------|
| Security-Critical | 2 | 2 | 0 | 0 | 0 | ⚠️ **294 days overdue** |
| FM Module APIs | 6 | 0 | 6 | 0 | 0 | ⚠️ **279 days overdue** |
| Feature Completeness | 1 | 0 | 0 | 1 | 0 | ✅ On track |
| **TOTAL** | **9** | **2** | **6** | **1** | **0** | **8 overdue, 1 on track** |

### ⚠️ Critical Alert
**2 security-critical items and 6 high-priority items are significantly overdue.**  
**Recommended Action:** Immediate sprint planning and resource allocation.

---

## 🎯 Next Actions - **UPDATED Nov 20, 2025**

### 🚨 IMMEDIATE (This Week - Nov 20-27)
1. ✅ Document all technical debt items
2. 🔴 **URGENT:** Emergency sprint planning for S3 uploads
3. 🔴 **URGENT:** Security audit of current file upload workarounds
4. 🔴 Create emergency Jira tickets with escalation
5. 🔴 Assess production risk and mitigation strategies

### Short-term (Next 4 Weeks - Nov-Dec 2025)
1. 🔴 **Week 1-2:** S3 upload implementation (security-first approach)
   - Pre-signed URL generation
   - Virus scanning integration
   - File type/size validation
2. 🟡 **Week 3-4:** Begin FM module API implementation
   - OpenAPI specs for 6 endpoints
   - Database schema design
   - Authentication/authorization

### Medium-term (Q4 2025 - Dec 2025)
1. 🔴 Deploy S3 uploads to production (with security audit)
2. 🟡 Complete 3-4 FM module APIs
3. 🟡 Integration testing and UAT

### Long-term (Q1 2026)
1. 🟡 Complete remaining FM module APIs
2. 🟢 Evaluate bulk actions feature priority
3. 📊 Technical debt retrospective

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

## ⚠️ Risk Assessment (Nov 20, 2025)

### Security Risk Analysis
**S3 Upload Delay Impact:**
- ❌ KYC documents may be stored insecurely (294 days exposure)
- ❌ Resume/CV uploads lack encryption and virus scanning
- ❌ Potential compliance violations (GDPR/CCPA)
- ❌ No audit trail for file operations

**Immediate Mitigation Required:**
1. Disable file upload features until security implementation complete
2. Manual KYC verification process as workaround
3. Security audit of current temporary solutions
4. Incident response plan if breach detected

### Business Impact Analysis
**FM Module Delay Impact:**
- ❌ FM module non-functional for 9 months
- ❌ Lost revenue from FM customers
- ❌ Customer churn risk
- ❌ Competitive disadvantage

**Recommended Actions:**
1. Executive escalation of FM module priority
2. Resource reallocation from lower-priority features
3. Consider temporary third-party integration
4. Customer communication plan

---

**Maintained by:** Engineering Team  
**Review Cadence:** **WEEKLY until overdue items resolved** (was: Bi-weekly)  
**Last Reviewed:** 2025-11-20  
**Next Review:** 2025-11-27  
**Status:** 🔴 **RED ALERT - Immediate Action Required**
