# Fixizit Onboarding, Verification & User Guidance – Final Blueprint v7.0

**Status:** Final consolidated blueprint (Prisma + PostgreSQL + S3 aligned)  
**Scope:** Onboarding, KYC/KYB, tutorials, help/escalation, admin queue & KPIs  
**Mandated Stack:** Node.js, Express, Prisma, PostgreSQL, S3, BullMQ, React/TS  
**Design System:** Primary `#0061A8`, success `#00A859`, accent `#FFB400`, 24–32px spacing, RTL + dark supported

---

## 1. Purpose & Scope

This blueprint delivers production-ready modules for:

1. **Onboarding**: corporate customers (CUSTOMER), property owners (PROPERTY_OWNER), tenants (TENANT), vendors & agents (VENDOR/AGENT).
2. **Verification (KYC/KYB)**: centralized doc types/profiles, S3 uploads, OCR + manual review, expiry tracking/alerts, API gating (403) with escalation info.
3. **First-Time Tutorials**: role-based Joyride tours with completion tracking and replay.
4. **Help & Escalation**: help center under profile, role/module-aware KB suggestions, “Access Denied” → CRM ticket to highest access role.
5. **Admin Module**: `AdminModule` with `UsersTab`, `RolesTab`, `OnboardingTab`, `AuditTab`, `SettingsTab` (React Query, typed, A11y).

---

## 2. Architecture & Integration

### 2.1 Tech Stack & Boundaries

- **Backend**: Node.js + Express, Prisma ORM with PostgreSQL, S3 for document storage (pre-signed uploads), Redis + BullMQ for OCR/expiry jobs.
- **Frontend**: React (Next.js or SPA) + TypeScript, `@tanstack/react-query`, `react-joyride` for tutorials, Ant Design (or design lib) styled with Fixzit tokens.
- **Impacted Modules**: Auth/Users, Organizations/Tenancies, Marketplace/Vendors, Support/CRM, Admin/Settings, Reports & KPIs.

---

## 3. Data Model (Prisma + PostgreSQL)

### 3.1 Enums

```prisma
// prisma/schema.prisma
enum OnboardingRole {
  CUSTOMER
  PROPERTY_OWNER
  TENANT
  VENDOR
  AGENT
}

enum OnboardingStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  DOCS_PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum DocumentStatus {
  UPLOADED
  PROCESSING
  UNDER_REVIEW
  VERIFIED
  REJECTED
  EXPIRED
}
```

### 3.2 Core Onboarding Case

```prisma
model OnboardingCase {
  id             String           @id @default(uuid())
  org_id         String?          @db.Uuid
  organization   Organization?    @relation(fields: [org_id], references: [id])
  role           OnboardingRole
  status         OnboardingStatus @default(DRAFT)
  current_step   Int              @default(1) // 1: Basic, 2: Docs, 3: Tutorial, 4: Complete
  subject_user_id String?         @db.Uuid
  subject_user    User?           @relation("OnboardingSubjectUser", fields: [subject_user_id], references: [id])
  subject_org_id  String?         @db.Uuid
  subject_org     Organization?   @relation("OnboardingSubjectOrg", fields: [subject_org_id], references: [id])
  basic_info     Json             // { name,email,phone,type,property_id,unit_id... }
  payload        Json?            // role-specific (e.g., vendor categories)
  tutorial_completed Boolean     @default(false)
  sla_deadline       DateTime?
  documents      VerificationDocument[]
  created_by_id  String           @db.Uuid
  created_by     User             @relation("OnboardingCreatedBy", fields: [created_by_id], references: [id])
  verified_by_id String?          @db.Uuid
  verified_by    User?            @relation("OnboardingVerifiedBy", fields: [verified_by_id], references: [id])
  created_at     DateTime         @default(now())
  updated_at     DateTime         @updatedAt

  @@index([org_id, status, role])
  @@index([subject_user_id, tutorial_completed])
  @@index([created_at, status])
}
```

### 3.3 DocumentType & DocumentProfile

```prisma
model DocumentType {
  id              String          @id @default(uuid())
  code            String          @unique  // e.g. NATIONAL_ID, CR_LICENSE, VAT_CERT
  name_en         String
  name_ar         String
  applies_to      OnboardingRole[]
  is_mandatory    Boolean         @default(true)
  requires_expiry Boolean         @default(false)
}

model DocumentProfile {
  id                 String    @id @default(uuid())
  role               OnboardingRole
  country            String    // e.g. "SA"
  required_doc_codes String[]  // e.g. ["CR_LICENSE", "VAT_CERT"]

  @@index([role, country])
}
```

### 3.4 VerificationDocument & Log

```prisma
model VerificationDocument {
  id                 String           @id @default(uuid())
  onboarding_case_id String           @db.Uuid
  onboarding_case    OnboardingCase   @relation(fields: [onboarding_case_id], references: [id])
  document_type_code String
  file_storage_key   String           // S3 key
  original_name      String
  status             DocumentStatus   @default(UPLOADED)
  ocr_data           Json?
  ocr_confidence     Float?
  expiry_date        DateTime?
  rejection_reason   String?
  uploaded_by_id     String           @db.Uuid
  uploaded_by        User             @relation("DocUploadedBy", fields: [uploaded_by_id], references: [id])
  verified_by_id     String?          @db.Uuid
  verified_by        User?            @relation("DocVerifiedBy", fields: [verified_by_id], references: [id])
  created_at         DateTime         @default(now())
  updated_at         DateTime         @updatedAt

  @@index([onboarding_case_id, status])
  @@index([status, expiry_date])
}

model VerificationLog {
  id              String               @id @default(uuid())
  document_id     String               @db.Uuid
  document        VerificationDocument @relation(fields: [document_id], references: [id])
  action          String               // UPLOADED / AUTO_CHECK / MANUAL_CHECK / STATUS_CHANGE / VIEWED
  performed_by_id String?              @db.Uuid
  performed_by    User?                @relation(fields: [performed_by_id], references: [id])
  details         Json?
  timestamp       DateTime             @default(now())

  @@index([document_id])
}
```

---

## 4. Seed & Migration (Document Types & Profiles)

### 4.1 Seed Script (Prisma)

```ts
// prisma/seedOnboarding.ts
import { PrismaClient, OnboardingRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOnboardingDocs() {
  await prisma.documentType.createMany({
    skipDuplicates: true,
    data: [
      {
        code: 'NATIONAL_ID',
        name_en: 'National ID',
        name_ar: 'بطاقة الهوية الوطنية',
        applies_to: [OnboardingRole.TENANT, OnboardingRole.CUSTOMER, OnboardingRole.PROPERTY_OWNER],
        requires_expiry: false,
      },
      {
        code: 'CR_LICENSE',
        name_en: 'Commercial Register',
        name_ar: 'السجل التجاري',
        applies_to: [OnboardingRole.VENDOR, OnboardingRole.CUSTOMER, OnboardingRole.AGENT],
        requires_expiry: true,
      },
      {
        code: 'VAT_CERT',
        name_en: 'VAT Certificate',
        name_ar: 'شهادة ضريبة القيمة المضافة',
        applies_to: [OnboardingRole.VENDOR, OnboardingRole.CUSTOMER],
        requires_expiry: true,
      },
      {
        code: 'IBAN_CERT',
        name_en: 'IBAN Certificate',
        name_ar: 'شهادة IBAN',
        applies_to: [OnboardingRole.VENDOR],
        requires_expiry: false,
      },
      // TODO: IQAMA, SIGNATORY_ID, etc.
    ],
  });

  await prisma.documentProfile.createMany({
    skipDuplicates: true,
    data: [
      { role: OnboardingRole.TENANT, country: 'SA', required_doc_codes: ['NATIONAL_ID'] },
      { role: OnboardingRole.VENDOR, country: 'SA', required_doc_codes: ['CR_LICENSE', 'VAT_CERT', 'IBAN_CERT'] },
      { role: OnboardingRole.CUSTOMER, country: 'SA', required_doc_codes: ['CR_LICENSE', 'VAT_CERT'] },
      { role: OnboardingRole.AGENT, country: 'SA', required_doc_codes: ['CR_LICENSE'] },
      { role: OnboardingRole.PROPERTY_OWNER, country: 'SA', required_doc_codes: ['NATIONAL_ID'] },
    ],
  });
}
```

Run once after schema migration.

---

## 5. Onboarding Workflows (Per Role)

### 5.1 Corporate Customer (CUSTOMER)

1. Signup → Email verify → create `OnboardingCase` with `role=CUSTOMER`, `status=DRAFT`, `basic_info={ name, email, phone, type: 'corporate' }`.
2. Wizard (mandatory): company profile → first property → invite team → DoA thresholds.
3. Documents (KYB): lookup `DocumentProfile(role=CUSTOMER, country='SA')`; required `CR_LICENSE`, `VAT_CERT`; S3 pre-signed upload.
4. Review: Super Admin / Sales Admin approves via Onboarding Queue → creates `Organization` tenant + `User` as `corporate_admin`.
5. Gating: before APPROVED, no Finance/key admin flows/limited settings.

### 5.2 Property Owner (PROPERTY_OWNER)

Same as CUSTOMER but org type `owner`, focused on properties/units/tenants; reduced team complexity on owner tier.

### 5.3 Vendor (VENDOR) & Agent (AGENT)

1. Application: “Become a Vendor/Agent” → `OnboardingCase(role=VENDOR|AGENT)`, `basic_info={ name, email, phone }`.
2. Payload: `payload={ categories:[...] }` includes at least one allowed service category (HVAC, Electrical, Plumbing, etc.).
3. Docs: profile for role/country → `CR_LICENSE`, `VAT_CERT`, `IBAN_CERT`.
4. Review: Marketplace Admin / Super Admin approves → create `Organization` (`vendor`/`agent`) and `User` (`vendor_admin`/`agent`); call ZATCA stub on vendor approval.
5. Gating: RFQs/bids/invoices blocked until `OnboardingCase` APPROVED and docs VERIFIED.

### 5.4 Tenant (TENANT)

1. Invite: Property Manager/Owner creates Tenancy draft → sends invite.
2. Registration: Tenant sets password + 2FA → `OnboardingCase(role=TENANT, basic_info.property_id, basic_info.unit_id)`.
3. Docs: `DocumentProfile(role=TENANT, country='SA')` → `NATIONAL_ID` (later `IQAMA`).
4. Review: Property Manager / Corporate Admin reviews docs + tenancy → optional Ejar registration after approval.
5. Activation: create `User` with `tenant` role + `Tenancy` linking user ↔ unit.
6. Gating: No access to My Unit, Work Orders, Payments until APPROVED & VERIFIED.

---

## 6. Document Verification Flow

### 6.1 S3 Upload Flow

- `POST /api/onboarding/:caseId/documents/request-upload` → returns `uploadUrl`, `fileStorageKey`.
- Client uploads direct to S3.
- `POST /api/onboarding/:caseId/documents/confirm-upload` with `document_type_code`, `fileStorageKey`, `original_name`.
- Backend: validates doc type in profile, creates `VerificationDocument(status=PROCESSING)`, enqueues OCR job.

### 6.2 OCR & Manual Review

- Worker (BullMQ): download from S3 → OCR → update `VerificationDocument` (`ocr_data`, `ocr_confidence`, status `UNDER_REVIEW` or auto `VERIFIED` if above threshold) → log `AUTO_CHECK`.
- Manual review: `PATCH /api/onboarding/documents/:id/review` (`decision: VERIFIED|REJECTED`, `rejection_reason?`).
- On VERIFIED: if all required docs VERIFIED → `OnboardingCase.status = APPROVED` → `createEntitiesFromCase(case)`.

### 6.3 Expiry Alerts

- Daily cron: query `VerificationDocument` with `status='VERIFIED'` and `expiry_date <= now()+30d`; create compliance notification/ticket + send email/notification.

---

## 7. Gating Middleware with Escalation Info

Express middleware ensuring verified docs before feature access:

```ts
// src/middleware/requireVerifiedDocs.ts
import { prisma } from '../prismaClient';
import { resolveEscalationContact } from '../services/escalation.service';

export function requireVerifiedDocs(requiredRole: 'TENANT' | 'VENDOR') {
  return async (req, res, next) => {
    const userId = req.user.id;
    const onboardingCase = await prisma.onboardingCase.findFirst({
      where: { subject_user_id: userId, role: requiredRole, status: 'APPROVED' },
      include: { documents: true },
    });

    const notVerified = !onboardingCase || onboardingCase.documents.some((doc) => doc.status !== 'VERIFIED');

    if (notVerified) {
      const escalation = await resolveEscalationContact(req.user, req.path);
      return res.status(403).json({
        error: 'Verification pending. Please complete onboarding.',
        escalate_to: escalation, // { role, name, email }
      });
    }

    next();
  };
}
```

Attach to tenant/vendor routes (e.g., `POST /api/tenant/requests`, `POST /api/vendor/bids`).

---

## 8. First-Time Tutorials (react-joyride)

### 8.1 State & Trigger

- On client login, fetch `OnboardingCase` for `subject_user_id` + role.
- If `tutorial_completed === false` and `status === APPROVED`, run Joyride.

### 8.2 Steps (Role-based)

```ts
// src/constants/tutorialSteps.ts
import { Step } from 'react-joyride';

export const tutorialSteps: Record<string, Step[]> = {
  TENANT: [
    { target: '.my-requests', content: 'Create and track maintenance requests here.' },
    { target: '.my-unit', content: 'View your unit details and lease info.' },
    { target: '.support-help', content: 'Need help? Contact support or your property owner here.' },
  ],
  VENDOR: [
    { target: '.rfq-list', content: 'View RFQs suitable for your services here.' },
    { target: '.quotation-list', content: 'Create and manage quotations.' },
    { target: '.vendor-finance', content: 'Track invoices and payments.' },
  ],
  CUSTOMER: [
    { target: '.owner-dashboard', content: 'Monitor KPIs for your portfolio from here.' },
    { target: '.properties-module', content: 'Manage properties and units.' },
    { target: '.approvals-widget', content: 'Review and approve key actions.' },
  ],
  // PROPERTY_OWNER, AGENT...
};
```

On finish: `PUT /api/onboarding/:caseId/complete-tutorial` sets `tutorial_completed = true`, `current_step = 4`; add “Replay Tutorial” under profile → Tutorial.

---

## 9. Help Center & Access Denied Guidance

### 9.1 Help Context API

`GET /api/help/context?module=work_orders` → `{ articles: KBArticle[], escalation: { role, name, email } }`

- `resolveEscalationContact(user, module)`:
  - TENANT → Property Owner / Corporate Admin (for property/org).
  - VENDOR → Marketplace Admin / Corporate Admin.
  - AGENT → Marketplace Admin / Owner.
  - EMPLOYEE / TECH → Tenant Admin / Corporate Admin.
  - Fallback: Super Admin.

### 9.2 Escalation API

`POST /api/help/escalate` (`{ module, attempted_action }`) → creates Support Ticket, returns `{ ticket_id, escalated_to }`.

UI pattern on 403: show required role/feature, contact info, and “Request Access / Help” button to create ticket.

---

## 10. Admin Module Refactor

### 10.1 AdminModule Shell

```tsx
// src/components/admin/AdminModule.tsx
import React, { useState } from 'react';
import { Tabs } from 'antd';
import UsersTab from './UsersTab';
import RolesTab from './RolesTab';
import AuditTab from './AuditTab';
import SettingsTab from './SettingsTab';
import OnboardingTab from './OnboardingTab';

interface AdminModuleProps {
  orgId: string;
}

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
    <section className="admin-module" role="main" aria-label="Administration Panel" style={{ padding: 24 }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </section>
  );
};

export default AdminModule;
```

### 10.2 UsersTab (Dynamic, Typed, Search, A11y)

```tsx
// src/components/admin/UsersTab.tsx
import React, { useState } from 'react';
import { Table, Button, Input, Space, Modal, Tag } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2 } from 'lucide-react';

interface IUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
}

interface UsersTabProps {
  orgId: string;
}

const UsersTab: React.FC<UsersTabProps> = ({ orgId }) => {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<IUser[]>({
    queryKey: ['admin-users', orgId, search],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?orgId=${orgId}&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Failed to load users');
      return res.json();
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users', orgId] }),
  });

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: `Delete ${name}?`,
      content: 'This action cannot be undone.',
      onOk: () => deleteUser.mutate(id),
    });
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' as const },
    { title: 'Email', dataIndex: 'email', key: 'email' as const },
    { title: 'Role', dataIndex: 'role', key: 'role' as const },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status' as const,
      render: (s: string) => <Tag color={s === 'Active' ? '#00A859' : '#DC2626'}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions' as const,
      render: (_: unknown, user: IUser) => (
        <Space>
          <Button aria-label={`Edit user ${user.name}`} icon={<Edit size={16} />} size="small" onClick={() => { /* open edit modal */ }} />
          <Button aria-label={`Delete user ${user.name}`} icon={<Trash2 size={16} />} size="small" danger onClick={() => handleDelete(user.id, user.name)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Input.Search placeholder="Search users..." value={search} onSearch={setSearch} onChange={(e) => setSearch(e.target.value)} allowClear />
        <Button type="primary" onClick={() => { /* open Add User modal */ }}>Add User</Button>
      </Space>
      <Table<IUser> rowKey="id" loading={isLoading} dataSource={data || []} columns={columns} pagination={{ pageSize: 10 }} />
    </div>
  );
};

export default UsersTab;
```

### 10.3 OnboardingTab (Queue, Review Action)

```tsx
// src/components/admin/OnboardingTab.tsx
import React from 'react';
import { Table, Tag, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface OnboardingTabProps {
  orgId: string;
}

const OnboardingTab: React.FC<OnboardingTabProps> = ({ orgId }) => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-queue', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/onboarding?orgId=${orgId}&status=UNDER_REVIEW`);
      if (!res.ok) throw new Error('Failed to load onboarding queue');
      return res.json();
    },
  });

  const columns = [
    { title: 'Role', dataIndex: 'role', key: 'role', render: (role: string) => <Tag color="#0061A8">{role}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'UNDER_REVIEW' ? '#FFB400' : '#00A859'}>{status}</Tag> },
    { title: 'Step', dataIndex: 'current_step', key: 'current_step' },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Actions', key: 'actions', render: (_: any, record: any) => <Button type="link" onClick={() => navigate(`/onboarding/${record.id}/review`)}>Review Documents</Button> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Table rowKey="id" loading={isLoading} dataSource={data || []} columns={columns} pagination={{ pageSize: 10 }} />
    </div>
  );
};

export default OnboardingTab;
```

---

## 11. KPIs & Reports

- Add Prisma services: average approval time by role, drop-off rate (DRAFT vs total), expired document count.
- Expose via `/api/admin/metrics/onboarding`; render in dashboard tiles.

---

## 12. Phasing & UAT

### 12.1 Phases (Cursor-ready)

1. **Phase 1 – Data & APIs (1.5 days)**: Prisma models + migration, seed document types/profiles, core APIs (`POST /api/onboarding/initiate`, S3 upload request/confirm, doc review), `requireVerifiedDocs` middleware.
2. **Phase 2 – Entity Creation & Jobs (1 day)**: `createEntitiesFromCase` for all roles, BullMQ for OCR + expiry alerts.
3. **Phase 3 – UI & Help/Tutorial (1.5 days)**: OnboardingWizard + Joyride, Help & Support + Tutorial menu, `/api/help/context`, `/api/help/escalate`, Access Denied UI with escalation.
4. **Phase 4 – Admin & KPIs (0.5–1 day)**: `AdminModule` refactor, `OnboardingTab`, KPIs endpoints/cards, full UAT.

### 12.2 UAT Checklist (Key)

- Corporate: blocked from Finance/admin until APPROVED; entities created correctly.  
- Tenant: invite → registration → docs → approval → tenancy created; cannot submit requests pre-approval.  
- Vendor: categories required; no RFQs/bids pre-approval; Marketplace shows “Verified” post-approval.  
- Doc expiry: 30-day alerts via CRM tickets + notifications.  
- Help: Access Denied shows required role + contact; “Request Access / Help” creates ticket.  
- Tutorials: run once per role; replayable; align to Fixzit Design System; RTL/dark verified.  
- Admin: UsersTab, RolesTab, OnboardingTab wired to APIs; React Query caching; A11y checks.

---

### Notes

- Resolves Mongo vs Prisma conflict by locking to PostgreSQL + Prisma + S3.  
- Preserves onboarding, KYC/KYB, tutorial, help, admin behavior from v6.0 while removing duplication.  
- Use as source of truth for implementation and sequencing (phases above).
