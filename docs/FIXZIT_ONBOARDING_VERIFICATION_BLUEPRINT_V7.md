# Fixzit Onboarding, Verification & User Guidance
## Final Consolidated Blueprint – MongoDB Atlas / Mongoose (v10)

**Status:** Final, copy-paste-ready, MongoDB + Mongoose aligned  
**Stack:** Node.js, Express, MongoDB Atlas (Mongoose), S3 (pre-signed), in-memory queue, React/TS  
**Design System:** Primary `#0061A8`, success `#00A859`, accent `#FFB400`, spacing 24–32px, RTL + dark supported  
**Governance:** STRICT v4/V5

---

## 1. Purpose & Scope

Deliver production-ready onboarding and guidance for Fixzit:
- **OnboardingCase** for roles: CUSTOMER (corporate admin), PROPERTY_OWNER, TENANT, VENDOR, AGENT.
- **Verification (KYC/KYB):** DocumentType, DocumentProfile, VerificationDocument, VerificationLog; S3 pre-signed uploads; OCR via in-memory queue; expiry tracking; API gating with escalation in 403.
- **FTUE Tutorials:** role-based react-joyride, completion on OnboardingCase, replayable.
- **Help & Escalation:** Help/Support under profile; role/context-aware KB; Access Denied shows required role + “Ask for Access” ticket to highest access role (Owner / Corporate Admin / Marketplace Admin).
- **Admin Refactor:** AdminModule with UsersTab, RolesTab, OnboardingTab (queue), AuditTab, SettingsTab.
- **KPIs:** Onboarding metrics via Mongoose aggregations.

---

## 2. Architecture & Integration

### 2.1 Backend
- Node.js + Express
- MongoDB Atlas + Mongoose
- S3 (pre-signed URLs) for documents
- in-memory queue: `ocr` queue (OCR jobs), `expiry` queue (nightly expiry scans)

### 2.2 Frontend
- React / Next.js + TypeScript
- `@tanstack/react-query` for APIs
- `react-joyride` for tutorials
- Ant Design (or equivalent) themed with Fixzit tokens (colors above, spacing 24–32px, RTL/dark)

### 2.3 Modules Affected
Auth/Users, Organizations/Tenancies, Marketplace (Vendors/Agents), Support/CRM, Admin/Settings, Analytics/KPIs  
External hooks: Ejar (tenancy), ZATCA (vendor)

---

## 3. Data Model (Mongoose / MongoDB Atlas)

### 3.1 OnboardingCase
```ts
// src/models/onboardingCase.model.ts
import { Schema, model, Types, Document } from 'mongoose';

export type OnboardingRole = 'CUSTOMER' | 'PROPERTY_OWNER' | 'TENANT' | 'VENDOR' | 'AGENT';
export type OnboardingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'DOCS_PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface IOnboardingCase extends Document {
  org_id?: Types.ObjectId;
  role: OnboardingRole;
  status: OnboardingStatus;
  current_step: number;
  tutorial_completed: boolean;
  sla_deadline?: Date;
  subject_user_id?: Types.ObjectId;
  subject_org_id?: Types.ObjectId;
  basic_info: {
    name: string;
    email: string;
    phone?: string;
    type?: string;
    property_id?: Types.ObjectId;
    unit_id?: Types.ObjectId;
  };
  payload?: any; // role-specific payload (e.g. vendor.categories)
  documents: Types.ObjectId[];
  created_by_id: Types.ObjectId;
  verified_by_id?: Types.ObjectId;
  source_channel: 'web' | 'mobile' | 'internal_admin';
  createdAt: Date;
  updatedAt: Date;
}

const onboardingCaseSchema = new Schema<IOnboardingCase>(
  {
    org_id: { type: Types.ObjectId, ref: 'Organization', index: true },
    role: {
      type: String,
      enum: ['CUSTOMER', 'PROPERTY_OWNER', 'TENANT', 'VENDOR', 'AGENT'],
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCS_PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    current_step: { type: Number, min: 1, max: 4, default: 1 },
    tutorial_completed: { type: Boolean, default: false },
    sla_deadline: { type: Date },
    subject_user_id: { type: Types.ObjectId, ref: 'User' },
    subject_org_id: { type: Types.ObjectId, ref: 'Organization' },
    basic_info: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      type: String,
      property_id: { type: Types.ObjectId, ref: 'Property' },
      unit_id: { type: Types.ObjectId, ref: 'Unit' },
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (v: any) {
          if (this.role === 'VENDOR') {
            return Array.isArray(v?.categories) && v.categories.length > 0;
          }
          return true;
        },
        message: 'Vendor payload must include at least one service category',
      },
    },
    documents: [{ type: Types.ObjectId, ref: 'VerificationDocument' }],
    created_by_id: { type: Types.ObjectId, ref: 'User', required: true },
    verified_by_id: { type: Types.ObjectId, ref: 'User' },
    source_channel: { type: String, enum: ['web', 'mobile', 'internal_admin'], default: 'web' },
  },
  { timestamps: true, collection: 'onboarding_cases' },
);

onboardingCaseSchema.index({ org_id: 1, status: 1, role: 1 });
onboardingCaseSchema.index({ subject_user_id: 1, tutorial_completed: 1 });
onboardingCaseSchema.index({ createdAt: 1, status: 1 });

export const OnboardingCase = model<IOnboardingCase>('OnboardingCase', onboardingCaseSchema);
```

### 3.2 DocumentType & DocumentProfile
```ts
// src/models/documentType.model.ts
import { Schema, model, Document } from 'mongoose';
import { OnboardingRole } from './onboardingCase.model';

export interface IDocumentType extends Document {
  code: string;
  name_en: string;
  name_ar: string;
  applies_to: OnboardingRole[];
  is_mandatory: boolean;
  requires_expiry: boolean;
  max_file_size_mb: number;
  allowed_mime_types: string[];
  review_required: boolean;
}

const documentTypeSchema = new Schema<IDocumentType>(
  {
    code: { type: String, required: true, unique: true },
    name_en: { type: String, required: true },
    name_ar: { type: String, required: true },
    applies_to: [{ type: String, enum: ['CUSTOMER', 'PROPERTY_OWNER', 'TENANT', 'VENDOR', 'AGENT'] }],
    is_mandatory: { type: Boolean, default: true },
    requires_expiry: { type: Boolean, default: true },
    max_file_size_mb: { type: Number, default: 10 },
    allowed_mime_types: [{ type: String }],
    review_required: { type: Boolean, default: true },
  },
  { collection: 'document_types' },
);

export const DocumentType = model<IDocumentType>('DocumentType', documentTypeSchema);
```

```ts
// src/models/documentProfile.model.ts
import { Schema, model, Document } from 'mongoose';
import { OnboardingRole } from './onboardingCase.model';

export interface IDocumentProfile extends Document {
  role: OnboardingRole;
  country: string;
  required_doc_codes: string[];
}

const documentProfileSchema = new Schema<IDocumentProfile>(
  {
    role: { type: String, enum: ['CUSTOMER', 'PROPERTY_OWNER', 'TENANT', 'VENDOR', 'AGENT'], required: true },
    country: { type: String, required: true },
    required_doc_codes: [{ type: String, required: true }],
  },
  { collection: 'document_profiles' },
);

documentProfileSchema.index({ role: 1, country: 1 });

export const DocumentProfile = model<IDocumentProfile>('DocumentProfile', documentProfileSchema);
```

### 3.3 VerificationDocument & VerificationLog
```ts
// src/models/verificationDocument.model.ts
import { Schema, model, Types, Document as MDoc } from 'mongoose';

export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface IVerificationDocument extends MDoc {
  onboarding_case_id: Types.ObjectId;
  document_type_code: string;
  file_storage_key: string;
  original_name: string;
  mime_type?: string;
  size_bytes?: number;
  status: DocumentStatus;
  ocr_data?: any;
  ocr_confidence?: number;
  expiry_date?: Date;
  rejection_reason?: string;
  uploaded_by_id: Types.ObjectId;
  verified_by_id?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const verificationDocumentSchema = new Schema<IVerificationDocument>(
  {
    onboarding_case_id: { type: Types.ObjectId, ref: 'OnboardingCase', required: true, index: true },
    document_type_code: { type: String, required: true, index: true },
    file_storage_key: { type: String, required: true },
    original_name: { type: String, required: true },
    mime_type: String,
    size_bytes: Number,
    status: {
      type: String,
      enum: ['UPLOADED', 'PROCESSING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'],
      default: 'UPLOADED',
      index: true,
    },
    ocr_data: {
      extracted_text: String,
      confidence: Number,
      fields: Schema.Types.Mixed,
    },
    ocr_confidence: Number,
    expiry_date: Date,
    rejection_reason: String,
    uploaded_by_id: { type: Types.ObjectId, ref: 'User', required: true },
    verified_by_id: { type: Types.ObjectId, ref: 'User' },
  },
  { collection: 'verification_documents', timestamps: true },
);

verificationDocumentSchema.index({ status: 1, expiry_date: 1 });
verificationDocumentSchema.index({ onboarding_case_id: 1, status: 1 });

export const VerificationDocument = model<IVerificationDocument>('VerificationDocument', verificationDocumentSchema);
```

```ts
// src/models/verificationLog.model.ts
import { Schema, model, Types, Document as MDoc } from 'mongoose';

export interface IVerificationLog extends MDoc {
  document_id: Types.ObjectId;
  action: 'UPLOADED' | 'AUTO_CHECK' | 'MANUAL_CHECK' | 'STATUS_CHANGE' | 'VIEWED';
  performed_by_id?: Types.ObjectId;
  details?: any;
  timestamp: Date;
}

const verificationLogSchema = new Schema<IVerificationLog>(
  {
    document_id: { type: Types.ObjectId, ref: 'VerificationDocument', required: true, index: true },
    action: { type: String, enum: ['UPLOADED', 'AUTO_CHECK', 'MANUAL_CHECK', 'STATUS_CHANGE', 'VIEWED'], required: true },
    performed_by_id: { type: Types.ObjectId, ref: 'User' },
    details: Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
  },
  { collection: 'verification_logs' },
);

export const VerificationLog = model<IVerificationLog>('VerificationLog', verificationLogSchema);
```

---

## 4. Seed & Migration

### 4.1 Seed DocumentTypes & Profiles
```ts
// scripts/seedOnboarding.ts
import mongoose from 'mongoose';
import { DocumentType } from '../src/models/documentType.model';
import { DocumentProfile } from '../src/models/documentProfile.model';

export async function seedOnboarding() {
  await mongoose.connect(process.env.MONGODB_ATLAS_URI!);

  await DocumentType.insertMany(
    [
      {
        code: 'NATIONAL_ID',
        name_en: 'National ID',
        name_ar: 'بطاقة الهوية الوطنية',
        applies_to: ['TENANT', 'PROPERTY_OWNER'],
        is_mandatory: true,
        requires_expiry: false,
        max_file_size_mb: 10,
        allowed_mime_types: ['image/jpeg', 'image/png', 'application/pdf'],
        review_required: true,
      },
      {
        code: 'CR_LICENSE',
        name_en: 'Commercial Register',
        name_ar: 'السجل التجاري',
        applies_to: ['VENDOR', 'CUSTOMER', 'AGENT'],
        is_mandatory: true,
        requires_expiry: true,
        max_file_size_mb: 10,
        allowed_mime_types: ['application/pdf'],
        review_required: true,
      },
      {
        code: 'VAT_CERT',
        name_en: 'VAT Certificate',
        name_ar: 'شهادة ضريبة القيمة المضافة',
        applies_to: ['VENDOR', 'CUSTOMER'],
        is_mandatory: true,
        requires_expiry: true,
        max_file_size_mb: 10,
        allowed_mime_types: ['application/pdf'],
        review_required: true,
      },
      {
        code: 'IBAN_CERT',
        name_en: 'IBAN Certificate',
        name_ar: 'شهادة IBAN',
        applies_to: ['VENDOR'],
        is_mandatory: true,
        requires_expiry: false,
        max_file_size_mb: 5,
        allowed_mime_types: ['application/pdf', 'image/jpeg'],
        review_required: true,
      },
    ],
    { ordered: false },
  ).catch(() => {});

  await DocumentProfile.insertMany(
    [
      { role: 'TENANT', country: 'SA', required_doc_codes: ['NATIONAL_ID'] },
      { role: 'VENDOR', country: 'SA', required_doc_codes: ['CR_LICENSE', 'VAT_CERT', 'IBAN_CERT'] },
      { role: 'CUSTOMER', country: 'SA', required_doc_codes: ['CR_LICENSE', 'VAT_CERT'] },
      { role: 'AGENT', country: 'SA', required_doc_codes: ['CR_LICENSE'] },
      { role: 'PROPERTY_OWNER', country: 'SA', required_doc_codes: ['NATIONAL_ID'] },
    ],
    { ordered: false },
  ).catch(() => {});

  console.log('Onboarding seed done');
  await mongoose.disconnect();
}
```

### 4.2 Optional Migration for Existing Users
```ts
// scripts/migrateOnboarding.ts
import mongoose from 'mongoose';
import { OnboardingCase } from '../src/models/onboardingCase.model';
import { User } from '../src/models/user.model';

export async function migrateOnboarding() {
  await mongoose.connect(process.env.MONGODB_ATLAS_URI!);

  const users = await User.find({ onboarding_completed: { $exists: false } });
  for (const user of users) {
    await OnboardingCase.create({
      subject_user_id: user._id,
      org_id: user.org_id,
      role: user.role, // ensure mapping to OnboardingRole values
      status: 'APPROVED',
      tutorial_completed: false,
      basic_info: { name: user.name, email: user.email },
      created_by_id: user._id,
      source_channel: 'internal_admin',
    });
    user.onboarding_completed = true;
    await user.save();
  }

  console.log('Migration done');
  await mongoose.disconnect();
}
```

---

## 5. Backend APIs & Workflows (Express + Mongoose)

### 5.1 Initiate Onboarding
```ts
// src/routes/onboarding.routes.ts
import express from 'express';
import { OnboardingCase } from '../models/onboardingCase.model';
import { DocumentProfile } from '../models/documentProfile.model';
import { VerificationDocument } from '../models/verificationDocument.model';
import { VerificationLog } from '../models/verificationLog.model';
import { authMiddleware, rbacMiddleware } from '../middleware';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { enqueueOCRJob } from '../services/ocr.queue';

const router = express.Router();
const s3 = new S3Client({ region: process.env.AWS_REGION || 'me-south-1' });

router.use(authMiddleware);

router.post('/initiate', rbacMiddleware('ONBOARDING_MANAGE'), async (req: any, res) => {
  const { role, basic_info, payload } = req.body;

  const onboarding = await OnboardingCase.create({
    org_id: req.user.org_id || null,
    subject_user_id: req.user._id,
    role,
    basic_info,
    payload,
    created_by_id: req.user._id,
    source_channel: 'web',
  });

  res.status(201).json({ id: onboarding._id, step: onboarding.current_step });
});
```

### 5.2 S3 Request & Confirm
```ts
router.post('/:caseId/documents/request-upload', async (req: any, res) => {
  const { document_type_code } = req.body;
  const onboarding = await OnboardingCase.findById(req.params.caseId);
  if (!onboarding) return res.status(404).json({ error: 'Onboarding case not found' });

  const profile = await DocumentProfile.findOne({ role: onboarding.role, country: 'SA' });
  if (!profile || !profile.required_doc_codes.includes(document_type_code)) {
    return res.status(400).json({ error: 'Document type not required for this role' });
  }

  const key = `fixzit/docs/${onboarding._id}/${Date.now()}-${document_type_code}.pdf`;
  const command = new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  res.json({ uploadUrl, file_storage_key: key });
});

router.post('/:caseId/documents/confirm-upload', async (req: any, res) => {
  const { document_type_code, file_storage_key, original_name } = req.body;
  const onboarding = await OnboardingCase.findById(req.params.caseId);
  if (!onboarding) return res.status(404).json({ error: 'Onboarding case not found' });

  const doc = await VerificationDocument.create({
    onboarding_case_id: onboarding._id,
    document_type_code,
    file_storage_key,
    original_name,
    status: 'PROCESSING',
    uploaded_by_id: req.user._id,
  });

  await enqueueOCRJob({ docId: doc._id.toString() });

  onboarding.status = 'UNDER_REVIEW';
  await onboarding.save();

  res.json({ docId: doc._id, status: doc.status });
});
```

### 5.3 Review & Approval
```ts
router.patch('/documents/:id/review', rbacMiddleware('DOC_VERIFY'), async (req: any, res) => {
  const { decision, rejection_reason } = req.body; // 'VERIFIED' | 'REJECTED'

  const doc = await VerificationDocument.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const oldStatus = doc.status;
  doc.status = decision;
  doc.rejection_reason = rejection_reason;
  doc.verified_by_id = req.user._id;
  await doc.save();

  await VerificationLog.create({
    document_id: doc._id,
    action: 'STATUS_CHANGE',
    performed_by_id: req.user._id,
    details: { from: oldStatus, to: decision, rejection_reason },
  });

  if (decision === 'VERIFIED') {
    const onboarding = await OnboardingCase.findById(doc.onboarding_case_id).populate('documents');
    if (onboarding) {
      const allVerified = (onboarding.documents as any[]).every((d: any) => d.status === 'VERIFIED');
      if (allVerified) {
        onboarding.status = 'APPROVED';
        await onboarding.save();
        await createEntitiesFromCase(onboarding); // implement role-based entity creation with Ejar/ZATCA hooks
      }
    }
  }

  res.json({ status: doc.status });
});
```

### 5.4 Complete Tutorial
```ts
router.put('/:caseId/complete-tutorial', async (req, res) => {
  await OnboardingCase.findByIdAndUpdate(req.params.caseId, {
    tutorial_completed: true,
    current_step: 4,
  });
  res.json({ status: 'complete' });
});
```

### 5.5 Help Context & Escalate
```ts
// src/routes/help.routes.ts
router.get('/context', authMiddleware, async (req: any, res) => {
  const { module } = req.query;
  const escalation = await resolveEscalationContact(req.user, module as string);
  res.json({ articles: [], escalation }); // TODO: integrate KB lookup
});

router.post('/escalate', authMiddleware, async (req: any, res) => {
  const { module, attempted_action } = req.body;
  const escalation = await resolveEscalationContact(req.user, module);

  const ticket = await createSupportTicket({
    org_id: req.user.org_id,
    created_by_id: req.user._id,
    assigned_to_id: escalation.user_id,
    subject: `Access request: ${attempted_action}`,
    description: `User: ${req.user.email}, Role: ${req.user.role}, Module: ${module}`,
  });

  res.json({ ticket_id: ticket._id, escalated_to: escalation });
});
```

---

## 6. Gating Middleware (Verification + Escalation in 403)
```ts
// src/middleware/requireVerifiedDocs.ts
import { OnboardingCase } from '../models/onboardingCase.model';
import { resolveEscalationContact } from '../services/escalation.service';

export function requireVerifiedDocs(requiredRole: 'TENANT' | 'VENDOR') {
  return async (req: any, res: any, next: any) => {
    const caseRecord = await OnboardingCase.findOne({
      subject_user_id: req.user._id,
      role: requiredRole,
      status: 'APPROVED',
    }).populate('documents');

    const notVerified =
      !caseRecord || (caseRecord.documents as any[]).some((d: any) => d.status !== 'VERIFIED');

    if (notVerified) {
      const escalation = await resolveEscalationContact(req.user, req.path);
      return res.status(403).json({
        error: 'Verification pending. Please complete onboarding.',
        escalate_to: escalation,
      });
    }

    return next();
  };
}
```

Attach to tenant/vendor routes:
```ts
router.post('/tenant/requests', requireVerifiedDocs('TENANT'), createRequestHandler);
router.post('/vendor/bids', requireVerifiedDocs('VENDOR'), createBidHandler);
```

---

## 7. KPIs & Reports
```ts
// src/services/onboardingKpi.service.ts
import { OnboardingCase } from '../models/onboardingCase.model';
import { VerificationDocument } from '../models/verificationDocument.model';

export async function getOnboardingKPIs(orgId: string) {
  const avgTimes = await OnboardingCase.aggregate([
    { $match: { org_id: orgId, status: 'APPROVED' } },
    { $group: { _id: '$role', avgTimeMs: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } },
  ]);

  const [drafts, total] = await Promise.all([
    OnboardingCase.countDocuments({ org_id: orgId, status: 'DRAFT' }),
    OnboardingCase.countDocuments({ org_id: orgId }),
  ]);

  const expiredDocs = await VerificationDocument.countDocuments({ status: 'EXPIRED' });

  return { avgTimes, dropOffRate: total > 0 ? drafts / total : 0, expiredDocs };
}
```
Expose via `/api/admin/metrics/onboarding` and render cards in dashboard.

---

## 8. Frontend Components (React / TS)

### 8.1 AdminModule, UsersTab, OnboardingTab
Cleaned TSX (REST + Mongoose, design tokens applied):

```tsx
// src/components/admin/AdminModule.tsx
import React, { useState } from 'react';
import { Tabs } from 'antd';
import UsersTab from './UsersTab';
import RolesTab from './RolesTab';
import AuditTab from './AuditTab';
import SettingsTab from './SettingsTab';
import OnboardingTab from './OnboardingTab';

interface AdminModuleProps { orgId: string; }

const AdminModule: React.FC<AdminModuleProps> = ({ orgId }) => {
  const [activeTab, setActiveTab] = useState('users');
  const items = [
    { key: 'users', label: 'Users', children: <UsersTab orgId={orgId} /> },
    { key: 'roles', label: 'Roles', children: <RolesTab orgId={orgId} /> },
    { key: 'onboarding', label: 'Onboarding Queue', children: <OnboardingTab orgId={orgId} /> },
    { key: 'audit', label: 'Audit Logs', children: <AuditTab orgId={orgId} /> },
    { key: 'settings', label: 'Settings', children: <SettingsTab orgId={orgId} /> },
  ];
  return (
    <section role="main" aria-label="Administration Panel" style={{ padding: 24, fontFamily: 'Inter, Nunito Sans' }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </section>
  );
};

export default AdminModule;
```

```tsx
// src/components/admin/UsersTab.tsx
import React, { useState } from 'react';
import { Table, Button, Input, Space, Modal, Tag } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2 } from 'lucide-react';

interface IUser { _id: string; name: string; email: string; role: string; status: 'Active' | 'Inactive'; }
interface UsersTabProps { orgId: string; }

const UsersTab: React.FC<UsersTabProps> = ({ orgId }) => {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<IUser[]>({
    queryKey: ['admin-users', orgId, search],
    queryFn: () => fetch(`/api/admin/users?orgId=${orgId}&search=${encodeURIComponent(search)}`).then((res) => res.json()),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/users/${id}`, { method: 'DELETE' }).then((res) => res.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users', orgId] }),
  });

  const handleDelete = (id: string, name: string) => Modal.confirm({ title: `Delete ${name}?`, onOk: () => deleteUser.mutate(id) });

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' as const },
    { title: 'Email', dataIndex: 'email', key: 'email' as const },
    { title: 'Role', dataIndex: 'role', key: 'role' as const },
    { title: 'Status', dataIndex: 'status', key: 'status' as const, render: (s: string) => <Tag color={s === 'Active' ? '#00A859' : '#DC2626'}>{s}</Tag> },
    { title: 'Actions', key: 'actions' as const, render: (_: any, user: IUser) => (
      <Space>
        <Button aria-label={`Edit ${user.name}`} icon={<Edit size={16} />} size="small" onClick={() => {}} />
        <Button aria-label={`Delete ${user.name}`} icon={<Trash2 size={16} />} size="small" danger onClick={() => handleDelete(user._id, user.name)} />
      </Space>
    ) },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Input.Search placeholder="Search users..." value={search} onSearch={setSearch} onChange={(e) => setSearch(e.target.value)} allowClear />
        <Button type="primary" onClick={() => {}}>Add User</Button>
      </Space>
      <Table<IUser> rowKey="_id" loading={isLoading} dataSource={data || []} columns={columns} pagination={{ pageSize: 10 }} />
    </div>
  );
};

export default UsersTab;
```

```tsx
// src/components/admin/OnboardingTab.tsx
import React from 'react';
import { Table, Tag, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface OnboardingTabProps { orgId: string; }

const OnboardingTab: React.FC<OnboardingTabProps> = ({ orgId }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-queue', orgId],
    queryFn: () => fetch(`/api/onboarding?orgId=${orgId}&status=UNDER_REVIEW`).then((res) => res.json()),
  });

  const columns = [
    { title: 'Role', dataIndex: 'role', key: 'role', render: (role: string) => <Tag color="#0061A8">{role}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'UNDER_REVIEW' ? '#FFB400' : '#00A859'}>{s}</Tag> },
    { title: 'Step', dataIndex: 'current_step', key: 'current_step' },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Actions', key: 'actions', render: (_: any, record: any) => <Button type="link" onClick={() => navigate(`/onboarding/${record._id}/review`)}>Review</Button> },
  ];

  return <div style={{ padding: 24 }}><Table rowKey="_id" loading={isLoading} dataSource={data || []} columns={columns} pagination={{ pageSize: 10 }} /></div>;
};

export default OnboardingTab;
```

### 8.2 OnboardingWizard (FTUE)
```tsx
// src/components/onboarding/OnboardingWizard.tsx
import React, { useEffect, useState } from 'react';
import Joyride, { Step } from 'react-joyride';
import { Steps, Card, Button, Upload, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const SERVICE_CATEGORIES = ['Rental Management','Property Maintenance','HVAC','Electrical','Plumbing','Landscaping','Finance','Legal Advisory'];
type OnboardingRole = 'CUSTOMER' | 'PROPERTY_OWNER' | 'TENANT' | 'VENDOR' | 'AGENT';

interface Profile {
  _id: string;
  role: OnboardingRole;
  current_step: number;
  status: string;
  tutorial_completed: boolean;
  payload?: { categories?: string[] };
}

const roleSteps: Record<OnboardingRole, Step[]> = {
  TENANT: [
    { target: '.my-requests', content: 'Create and track work requests here.' },
    { target: '.my-unit', content: 'View your unit details and lease info.' },
    { target: '.support-help', content: 'Use Help & Support to contact your owner or admin.' },
  ],
  VENDOR: [
    { target: '.rfq-list', content: 'View RFQs relevant to your services.' },
    { target: '.quotation-list', content: 'Create and manage quotations.' },
    { target: '.vendor-finance', content: 'Track your invoices and payments here.' },
  ],
  CUSTOMER: [
    { target: '.owner-dashboard', content: 'Monitor key KPIs across your portfolio.' },
    { target: '.properties-module', content: 'Manage properties and units.' },
    { target: '.approvals-widget', content: 'Review and approve key actions.' },
  ],
  PROPERTY_OWNER: [
    { target: '.properties-module', content: 'Manage your owned properties and units.' },
    { target: '.work-orders', content: 'Review and approve maintenance work.' },
    { target: '.support-help', content: 'Get help or contact support from here.' },
  ],
  AGENT: [
    { target: '.listing-module', content: 'Manage your property listings.' },
    { target: '.appointments', content: 'Track viewings and client meetings.' },
  ],
};

const OnboardingWizard: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [currentStep, setCurrentStep] = useState(profile.current_step);
  const [runTour, setRunTour] = useState(!profile.tutorial_completed);
  const [categories, setCategories] = useState(profile.payload?.categories || []);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (profile.role === 'VENDOR' && currentStep === 1) {
      fetch(`/api/onboarding/${profile._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { categories } }),
      });
    }
  }, [categories]);

  const handleUpload = async (file: File, type: string) => {
    const requestRes = await fetch(`/api/onboarding/${profile._id}/documents/request-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_type_code: type }),
    });
    const { uploadUrl, file_storage_key } = await requestRes.json();

    await fetch(uploadUrl, { method: 'PUT', body: file });

    const confirmRes = await fetch(`/api/onboarding/${profile._id}/documents/confirm-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_type_code: type, file_storage_key, original_name: file.name }),
    });
    const data = await confirmRes.json();
    toast.success(data.status === 'VERIFIED' ? 'Document verified successfully.' : 'Document under review.');
    if (data.status === 'VERIFIED') setCurrentStep(3);
    queryClient.invalidateQueries({ queryKey: ['onboarding', profile._id] });
    return false;
  };

  const handleTourFinish = async () => {
    await fetch(`/api/onboarding/${profile._id}/complete-tutorial`, { method: 'PUT' });
    setRunTour(false);
    toast.success('Tutorial complete!');
  };

  return (
    <Card title={`${profile.role} Onboarding`} style={{ padding: 24, fontFamily: 'Inter, Nunito Sans' }}>
      <Steps current={currentStep - 1} style={{ marginBottom: 24 }} />

      {currentStep === 1 && profile.role === 'VENDOR' && (
        <Select mode="multiple" placeholder="Select your services" value={categories} onChange={setCategories} options={SERVICE_CATEGORIES.map((c) => ({ value: c, label: c }))} style={{ width: '100%', marginBottom: 16 }} />
      )}

      {currentStep === 2 && (
        <Upload beforeUpload={(f) => handleUpload(f as File, 'NATIONAL_ID')} showUploadList={false}>
          <Button icon={<UploadOutlined />}>Upload ID</Button>
        </Upload>
      )}

      {currentStep === 3 && (
        <Joyride
          steps={roleSteps[profile.role]}
          run={runTour}
          continuous
          showSkipButton
          callback={(data) => {
            if (data.status === 'finished' || data.status === 'skipped') handleTourFinish();
          }}
        />
      )}

      <Button style={{ marginTop: 24 }} onClick={() => setRunTour(true)}>Replay Tutorial</Button>
    </Card>
  );
};

export default OnboardingWizard;
```

---

## 9. Golden Workflows

- **Corporate (CUSTOMER):** Signup → OnboardingCase → Wizard (Org, first property, team, DoA) → Docs (CR_LICENSE, VAT_CERT) → Review → Approve → Organization + corporate_admin user → Tutorial.  
- **Vendor (VENDOR):** Apply → Select services (SERVICE_CATEGORIES) → Docs (CR_LICENSE, VAT_CERT, IBAN_CERT) → Review → Approve + ZATCA stub → Vendor org + vendor_admin → Marketplace access after approval.  
- **Tenant (TENANT):** Invite → Register → Docs (NATIONAL_ID) → Review → Approve + Ejar stub → Tenancy + tenant portal → Tutorial.  
- **Agent (AGENT):** Similar to Vendor; agent org + agent user.  
- **Access Denied & Escalation:** requireVerifiedDocs/RBAC → 403 JSON with `escalate_to` → UI shows contact + “Request Access” → Support ticket → Admin handles.

---

## 10. Phasing & UAT

### 10.1 Phases (Cursor/GitHub-friendly)
1) **Phase 1 – Models & Seeds (~1 day):** Add Mongoose models; seed DocumentType/DocumentProfile; optional migration.  
2) **Phase 2 – Backend Flows (~1 day):** `/api/onboarding/*`, S3 pre-sign/confirm, OCR queue stub, review route, `createEntitiesFromCase`, `requireVerifiedDocs`.  
3) **Phase 3 – Frontend UX (~1 day):** OnboardingWizard + Joyride; Help & Escalation UI; AdminModule + UsersTab + OnboardingTab.  
4) **Phase 4 – KPIs & UAT (~0.5–1 day):** KPIs service + dashboard tiles; full UAT.

### 10.2 UAT Checklist
- Corporate: blocked from Finance/admin until APPROVED; org/admin created correctly.  
- Vendor: cannot bid/see RFQs until docs VERIFIED; categories enforced; ZATCA stub on approval.  
- Tenant: cannot submit requests/view unit until docs VERIFIED; Ejar stub triggered.  
- Expiry: nearing-expiry docs create CRM tickets/alerts.  
- Help: 403 responses include `escalate_to`; UI shows contact + “Request Access/Help” creating a ticket.  
- Tutorials: run once per role, replayable; RTL/dark; spacing 24–32px.  
- Admin: UsersTab, RolesTab, OnboardingTab wired; React Query caching; A11y OK.

---

## 11. Quick Install & Env
- `npm i mongoose @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
- `.env` requirements: `MONGODB_ATLAS_URI`, `S3_BUCKET`, `AWS_REGION`, MongoDB connection, `OCR_QUEUE_NAME`, `EXPIRY_QUEUE_NAME`.
- Add OCR worker + expiry worker (in-memory queue) per queues declared in the app.


