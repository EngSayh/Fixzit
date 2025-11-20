# S3 Upload Implementation Plan
## Emergency Priority - 294 Days Overdue

**Status:** 🔴 **CRITICAL** - Security & Compliance Risk  
**Timeline:** 2-3 weeks (December 2-20, 2025)  
**Team:** 2 Backend Engineers + 1 Security Engineer  
**Budget:** $15-20K (AWS infrastructure + development time)

---

## 🎯 Executive Summary

### Business Impact
- **Security Risk:** KYC documents and resumes currently stored insecurely or not persisted
- **Compliance Risk:** GDPR/CCPA violations for PII handling
- **Revenue Impact:** Seller KYC verification broken → lost marketplace revenue
- **Customer Impact:** Job application system non-functional → ATS module unusable

### Technical Debt
- **Days Overdue:** 294 days (since January 31, 2025)
- **Affected Features:** 2 critical (KYC, ATS resumes)
- **Mock Implementations:** 2 `setTimeout()` placeholders
- **User Impact:** HIGH (functional blockers)

---

## 📋 Current State Analysis

### Mock Implementation 1: KYC Document Uploads
**File:** `components/seller/kyc/DocumentUploadForm.tsx:98`

```typescript
// TODO: Replace with actual S3 pre-signed URL upload
await new Promise((resolve) => setTimeout(resolve, 2000));
```

**Impact:**
- Seller onboarding blocked
- KYC verification impossible
- Marketplace seller acquisition stopped
- Potential data loss (documents not persisted)

### Mock Implementation 2: Resume/CV Uploads
**File:** `server/services/ats/application-intake.ts:288`

```typescript
// TODO: Replace with S3 upload
await new Promise((resolve) => setTimeout(resolve, 1500));
```

**Impact:**
- Job application system broken
- Candidate data not stored
- ATS module non-functional
- PII handling non-compliant

---

## 🏗️ Architecture Design

### Phase 1: Pre-signed URL API (Week 1)

#### API Endpoint: `POST /api/upload/presigned-url`

**Request:**
```typescript
interface PresignedUrlRequest {
  fileType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/jpg';
  fileSize: number; // bytes
  category: 'kyc' | 'resume' | 'invoice' | 'document';
  metadata: {
    userId: string;
    tenantId: string;
    purpose: string; // 'kyc-identity', 'kyc-business', 'resume-upload', etc.
  };
}
```

**Response:**
```typescript
interface PresignedUrlResponse {
  uploadUrl: string;      // Pre-signed S3 URL (15 min expiry)
  fileKey: string;        // S3 object key
  expiresAt: string;      // ISO timestamp
  fields?: Record<string, string>; // Additional POST fields if using multipart
}
```

**Validation Rules:**
- File type: MIME type whitelist (PDF, PNG, JPG only)
- File size: Max 10MB for images, 25MB for PDFs
- User authentication: Required (JWT session)
- Rate limiting: 10 requests/minute per user

#### Security Requirements

**1. S3 Bucket Configuration**
```typescript
// infrastructure/s3-buckets.tf (Terraform)
resource "aws_s3_bucket" "fixzit_uploads" {
  bucket = "fixzit-uploads-${var.environment}"
  
  versioning {
    enabled = true
  }
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
  
  lifecycle_rule {
    enabled = true
    prefix  = "temp/"
    
    expiration {
      days = 1  // Delete unprocessed temp uploads
    }
  }
  
  lifecycle_rule {
    enabled = true
    prefix  = "kyc/"
    
    transition {
      days          = 90
      storage_class = "GLACIER"  // Archive old KYC docs
    }
  }
}

resource "aws_s3_bucket_public_access_block" "fixzit_uploads" {
  bucket = aws_s3_bucket.fixzit_uploads.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

**2. IAM Policy (Least Privilege)**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedUrlGeneration",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::fixzit-uploads-prod/uploads/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "AllowVirusScanAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::fixzit-uploads-prod/uploads/*"
    }
  ]
}
```

**3. Virus Scanning Integration**
- **Option A:** AWS Macie (recommended)
  - Real-time malware detection
  - Data loss prevention (DLP)
  - PII discovery
  - Cost: ~$1/GB scanned

- **Option B:** ClamAV Lambda
  - Open-source antivirus
  - Triggered on S3 PUT events
  - Cost: ~$0.20/1000 scans
  - **Recommended for cost optimization**

**4. Encryption**
- **At rest:** AES-256 (S3 default encryption)
- **In transit:** TLS 1.3 (pre-signed HTTPS URLs)
- **KMS:** AWS KMS for key management (optional, adds cost)

---

### Phase 2: Client-Side Integration (Week 2)

#### KYC Document Upload Component

**File:** `components/seller/kyc/DocumentUploadForm.tsx`

**Implementation:**
```typescript
// Before (Mock)
const handleUpload = async (file: File) => {
  setUploading(true);
  try {
    // TODO: Replace with actual S3 pre-signed URL upload
    await new Promise((resolve) => setTimeout(resolve, 2000));
    toast.success('Document uploaded successfully');
  } catch (error) {
    toast.error('Upload failed');
  } finally {
    setUploading(false);
  }
};

// After (Real S3 Upload)
const handleUpload = async (file: File) => {
  setUploading(true);
  setProgress(0);
  
  try {
    // Step 1: Get pre-signed URL
    const response = await fetch('/api/upload/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileType: file.type,
        fileSize: file.size,
        category: 'kyc',
        metadata: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          purpose: documentType, // 'kyc-identity' | 'kyc-business'
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }
    
    const { uploadUrl, fileKey } = await response.json();
    
    // Step 2: Upload to S3 with progress tracking (using XMLHttpRequest)
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject(new Error('S3 upload failed'));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
    
    // Step 3: Notify backend of successful upload
    await fetch('/api/kyc/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileKey,
        documentType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }),
    });
    
    toast.success('Document uploaded and verified');
    onUploadComplete(fileKey);
    
  } catch (error) {
    logger.error('KYC upload failed', error);
    toast.error('Upload failed. Please try again.');
  } finally {
    setUploading(false);
    setProgress(0);
  }
};
```

**Features:**
- Progress indicator (0-100%)
- Error retry logic (3 attempts)
- File type validation (client + server)
- Size limit enforcement
- Audit logging

#### ATS Resume Upload Integration

**File:** `server/services/ats/application-intake.ts`

**Implementation:**
```typescript
// Before (Mock)
export async function processApplication(data: ApplicationData) {
  // ... validation ...
  
  // TODO: Replace with S3 upload
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // ... save to DB ...
}

// After (Real S3 Upload)
export async function processApplication(data: ApplicationData) {
  // ... validation ...
  
  try {
    // Step 1: Get pre-signed URL
    const { uploadUrl, fileKey } = await getPresignedUrl({
      fileType: data.resumeFile.type,
      fileSize: data.resumeFile.size,
      category: 'resume',
      metadata: {
        userId: data.candidateId,
        tenantId: data.tenantId,
        purpose: `job-application-${data.jobId}`,
      },
    });
    
    // Step 2: Upload resume to S3
    await uploadToS3(uploadUrl, data.resumeFile);
    
    // Step 3: Trigger resume parsing (async)
    await queueResumeParser({
      fileKey,
      candidateId: data.candidateId,
      jobId: data.jobId,
    });
    
    // Step 4: Save application with S3 reference
    const application = await Application.create({
      ...data,
      resumeFileKey: fileKey,
      resumeFileName: data.resumeFile.name,
      resumeFileSize: data.resumeFile.size,
      status: 'pending',
    });
    
    // Step 5: Audit log
    await auditLog({
      action: 'resume_upload',
      userId: data.candidateId,
      resource: `application:${application.id}`,
      metadata: { fileKey, jobId: data.jobId },
    });
    
    return application;
    
  } catch (error) {
    logger.error('Resume upload failed', error);
    throw new Error('Failed to process application');
  }
}
```

---

### Phase 3: Security & Compliance (Week 2-3)

#### Virus Scanning Lambda Function

**File:** `infrastructure/lambda/virus-scanner.ts`

```typescript
import { S3Event } from 'aws-lambda';
import AWS from 'aws-sdk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const s3 = new AWS.S3();
const sns = new AWS.SNS();

export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    try {
      // Download file to /tmp
      const { Body } = await s3.getObject({ Bucket: bucket, Key: key }).promise();
      const tempFile = `/tmp/${key.split('/').pop()}`;
      await fs.writeFile(tempFile, Body);
      
      // Scan with ClamAV
      const { stdout, stderr } = await execAsync(`clamscan ${tempFile}`);
      
      if (stdout.includes('Infected files: 0')) {
        // Clean - tag object
        await s3.putObjectTagging({
          Bucket: bucket,
          Key: key,
          Tagging: {
            TagSet: [{ Key: 'VirusScan', Value: 'CLEAN' }],
          },
        }).promise();
        
        console.log(`✅ Clean: ${key}`);
        
      } else {
        // Infected - quarantine and alert
        await s3.copyObject({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: `quarantine/${key}`,
        }).promise();
        
        await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
        
        await sns.publish({
          TopicArn: process.env.ALERT_SNS_TOPIC,
          Subject: '🚨 Virus Detected in Upload',
          Message: `File: ${key}\nBucket: ${bucket}\nAction: Quarantined`,
        }).promise();
        
        console.error(`❌ Infected: ${key}`);
      }
      
    } catch (error) {
      console.error(`Error scanning ${key}:`, error);
      throw error;
    }
  }
};
```

**Deployment:**
```bash
# Lambda configuration
Runtime: Node.js 18.x
Memory: 1024 MB
Timeout: 60 seconds
Layers: ClamAV Layer (ARN from AWS Marketplace)
Trigger: S3 PUT events on uploads/* prefix
```

#### Audit Logging

**File:** `server/services/audit-logger.ts`

```typescript
export async function logFileUpload(data: {
  userId: string;
  tenantId: string;
  fileKey: string;
  category: string;
  fileSize: number;
  mimeType: string;
  ipAddress: string;
  userAgent: string;
}) {
  await AuditLog.create({
    action: 'file_upload',
    userId: data.userId,
    tenantId: data.tenantId,
    resource: `s3:${data.fileKey}`,
    metadata: {
      category: data.category,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
    timestamp: new Date(),
  });
  
  // For KYC uploads, also log to compliance system
  if (data.category === 'kyc') {
    await ComplianceLog.create({
      event: 'kyc_document_uploaded',
      userId: data.userId,
      tenantId: data.tenantId,
      documentKey: data.fileKey,
      timestamp: new Date(),
    });
  }
}
```

#### GDPR/CCPA Compliance

**Data Retention Policies:**
```typescript
// server/jobs/data-retention.ts
export async function enforceRetentionPolicies() {
  const now = new Date();
  
  // KYC documents: 7 years retention (regulatory requirement)
  const kycCutoff = new Date(now.getTime() - 7 * 365 * 24 * 60 * 60 * 1000);
  await deleteS3Objects('kyc/', kycCutoff);
  
  // Resumes: 2 years retention (or until candidate requests deletion)
  const resumeCutoff = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
  await deleteS3Objects('resume/', resumeCutoff);
  
  // Audit logs for file deletions
  await auditLog({ action: 'data_retention_enforcement', timestamp: now });
}
```

**Right to Deletion (GDPR Article 17):**
```typescript
export async function deleteUserData(userId: string) {
  // 1. Find all S3 objects for user
  const objects = await S3FileReference.find({ userId });
  
  // 2. Delete from S3
  for (const obj of objects) {
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET,
      Key: obj.fileKey,
    }).promise();
  }
  
  // 3. Delete DB references
  await S3FileReference.deleteMany({ userId });
  
  // 4. Audit log
  await auditLog({
    action: 'gdpr_user_data_deletion',
    userId,
    metadata: { filesDeleted: objects.length },
  });
}
```

---

## 📅 Implementation Timeline

### Week 1: API & Infrastructure (Dec 2-6, 2025)

**Days 1-2: AWS Infrastructure Setup**
- [ ] Create S3 bucket with encryption
- [ ] Configure IAM roles/policies
- [ ] Set up CloudFront CDN (optional)
- [ ] Deploy ClamAV Lambda function
- [ ] Configure SNS alerts

**Days 3-4: Pre-signed URL API**
- [ ] Implement `/api/upload/presigned-url` endpoint
- [ ] Add file type validation
- [ ] Add size limit enforcement
- [ ] Implement rate limiting
- [ ] Add audit logging

**Day 5: Testing & Security Review**
- [ ] Unit tests for API endpoint
- [ ] Integration tests with S3
- [ ] Security penetration testing
- [ ] Load testing (1000 req/min)

### Week 2: Client Integration (Dec 9-13, 2025)

**Days 1-2: KYC Upload Component**
- [ ] Update `DocumentUploadForm.tsx`
- [ ] Add progress indicator
- [ ] Implement error retry logic
- [ ] Add client-side validation
- [ ] Update UI/UX for upload states

**Days 3-4: ATS Resume Upload**
- [ ] Update `application-intake.ts`
- [ ] Integrate with resume parser
- [ ] Add async job queue
- [ ] Update application model
- [ ] Add resume preview feature

**Day 5: E2E Testing**
- [ ] KYC upload flow testing
- [ ] Resume upload flow testing
- [ ] Error scenario testing
- [ ] Performance testing

### Week 3: Compliance & Launch (Dec 16-20, 2025)

**Days 1-2: Security Audit**
- [ ] Virus scanning verification
- [ ] Encryption validation
- [ ] Access control testing
- [ ] Audit log verification
- [ ] Penetration testing

**Day 3: Compliance Review**
- [ ] GDPR compliance check
- [ ] CCPA compliance check
- [ ] Data retention policy implementation
- [ ] Right to deletion implementation

**Day 4: Documentation**
- [ ] API documentation (OpenAPI spec)
- [ ] Developer guide
- [ ] Security best practices doc
- [ ] Compliance documentation

**Day 5: Production Deployment**
- [ ] Blue-green deployment
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor error rates
- [ ] Monitor upload success rates
- [ ] Post-deployment review

---

## 💰 Cost Estimation

### AWS Infrastructure Costs (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| **S3 Storage** | 1TB | $23/month |
| **S3 Requests** | 1M PUT, 10M GET | $10/month |
| **Data Transfer** | 500GB egress | $45/month |
| **Lambda (Virus Scan)** | 100K invocations | $2/month |
| **CloudWatch Logs** | 10GB/month | $5/month |
| **SNS Alerts** | 1K notifications | $0.50/month |
| **CloudFront (optional)** | 1TB transfer | $85/month (optional) |
| **TOTAL (without CDN)** | | **$85.50/month** |
| **TOTAL (with CDN)** | | **$170.50/month** |

### Development Costs

| Role | Hours | Rate | Cost |
|------|-------|------|------|
| Backend Engineer 1 | 80 | $100/hr | $8,000 |
| Backend Engineer 2 | 80 | $100/hr | $8,000 |
| Security Engineer | 40 | $150/hr | $6,000 |
| QA Engineer | 20 | $80/hr | $1,600 |
| **TOTAL** | **220** | | **$23,600** |

### First Year Total Cost
- Development: $23,600 (one-time)
- Infrastructure: $1,026/year (without CDN) or $2,046/year (with CDN)
- **TOTAL: $24,626 - $25,646**

---

## ✅ Acceptance Criteria

### Functional Requirements
- [ ] KYC documents uploaded to S3 successfully
- [ ] Resumes uploaded to S3 successfully
- [ ] Pre-signed URLs expire after 15 minutes
- [ ] File type validation working (client + server)
- [ ] File size limits enforced (10MB images, 25MB PDFs)
- [ ] Progress indicator shows 0-100% during upload
- [ ] Error handling with retry logic (3 attempts)

### Security Requirements
- [ ] All files encrypted at rest (AES-256)
- [ ] All uploads over HTTPS (TLS 1.3)
- [ ] Virus scanning on all uploads
- [ ] Infected files quarantined
- [ ] Security alerts sent to ops team
- [ ] IAM policies follow least privilege
- [ ] No public bucket access

### Compliance Requirements
- [ ] Audit logs for all uploads
- [ ] Data retention policies enforced
- [ ] GDPR right to deletion implemented
- [ ] CCPA data export implemented
- [ ] KYC documents retained 7 years
- [ ] Resumes retained 2 years
- [ ] Compliance documentation complete

### Performance Requirements
- [ ] Upload API responds < 200ms (p95)
- [ ] S3 upload completes < 10s for 10MB file
- [ ] Virus scan completes < 30s
- [ ] Rate limit: 10 req/min per user
- [ ] Concurrent uploads: 100+ users supported

### Testing Requirements
- [ ] Unit test coverage > 90%
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Load test: 1000 uploads/min
- [ ] Security penetration test passed

---

## 🚨 Risks & Mitigation

### Risk 1: AWS Service Outages
**Probability:** LOW  
**Impact:** HIGH  
**Mitigation:**
- Multi-region S3 replication
- Fallback to local storage (temporary)
- Queue failed uploads for retry
- Alert ops team immediately

### Risk 2: Virus Scanning Delays
**Probability:** MEDIUM  
**Impact:** MEDIUM  
**Mitigation:**
- Async scanning (don't block upload)
- Tag files as "scanning" until complete
- Timeout after 60s
- Manual review for scan failures

### Risk 3: Cost Overruns
**Probability:** MEDIUM  
**Impact:** LOW  
**Mitigation:**
- Set AWS billing alerts ($100, $500, $1000)
- Monitor S3 storage growth
- Implement aggressive lifecycle policies
- Archive old files to Glacier

### Risk 4: GDPR Non-Compliance
**Probability:** LOW  
**Impact:** CRITICAL  
**Mitigation:**
- Legal review before launch
- Automated retention enforcement
- Right to deletion tested
- Audit logs immutable
- Compliance officer sign-off

---

## 📊 Success Metrics

### Week 1 Milestones
- [ ] S3 bucket created and configured
- [ ] Pre-signed URL API functional
- [ ] Security review passed

### Week 2 Milestones
- [ ] KYC uploads working in staging
- [ ] Resume uploads working in staging
- [ ] E2E tests passing

### Week 3 Milestones
- [ ] Compliance audit passed
- [ ] Production deployment complete
- [ ] 100 successful uploads in production

### 30-Day Post-Launch Metrics
- Upload success rate: > 98%
- Average upload time: < 5s
- Virus detection rate: < 0.01%
- API error rate: < 1%
- User satisfaction: > 4.5/5

---

**Plan Created:** November 20, 2025  
**Target Start:** December 2, 2025  
**Target Completion:** December 20, 2025  
**Status:** ⏳ **AWAITING APPROVAL & RESOURCE ALLOCATION**

**Next Steps:**
1. Executive approval required
2. Team assignment (2 backend + 1 security engineer)
3. AWS budget approval ($25K)
4. Kickoff meeting scheduled
5. Sprint 0: Infrastructure setup
