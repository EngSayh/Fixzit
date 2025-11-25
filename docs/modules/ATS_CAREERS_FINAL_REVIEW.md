# Fixzit ATS & Careers – Final Review Summary (Software Engineer & Architect)

**Status:** Architecture Review Complete  
**Date:** November 16, 2025  
**Reviewer:** Senior Software Architect  
**Alignment:** SDD, Blueprint Bible vFinal, Master Governance V5, STRICT v4

---

## Context

Based on all ATS/Careers code snippets in the repo and the Fixzit blueprints (SDD, Blueprint Bible vFinal, Master Governance V5, STRICT v4), the module is a solid start but not yet at enterprise level. It must be fully aligned with:

- Multi-tenant, RBAC-driven SaaS design (org_id on all records; org-scoped queries)
- Sidebar & Top Bar governance with single global layout, RTL/LTR, dark mode, brand tokens (#0061A8, #00A859, #FFB400)
- STRICT v4 Halt–Fix–Verify with 0 console/network/build errors per page×role and enforced artifacts
- The ATS belongs under **HR → Recruitment (ATS)** and must behave like every other Fixzit module (Dashboard, Work Orders, Finance, etc.), not as a side project

---

## 1) Architecture & Integration

### ✅ Current State

- Next.js App Router + Mongo/Mongoose for ATS domain
- Basic job posting and application workflow

### 🔧 Required Changes

**1.1 Stack Standardization**

- ✅ **Keep:** Next.js App Router + Mongo/Mongoose for the ATS domain only
- ⚠️ **Clarify:** This is consistent with the "mongos database" decision for ATS
- ✅ **Note:** Core FM domains remain on main DB as per SDD

**1.2 Integration Requirements**

```typescript
// Integrate with existing building blocks:

// A. Notifications Service
import { sendNotification } from "@/services/notifications/fm-notification-engine";

// New application received
await sendNotification({
  type: "ATS_APPLICATION_RECEIVED",
  recipients: [hiringManager, hrTeam],
  data: { candidateName, jobTitle, applicationId },
  channels: ["email", "in-app"],
});

// B. Approvals Engine (DoA)
import { createApproval } from "@/lib/fm-approval-engine";

// Job posting approval
await createApproval({
  type: "JOB_POSTING",
  entityId: jobId,
  requestedBy: hrUserId,
  orgId,
  metadata: { position, salary, department },
});

// C. Finance Integration (Optional - Phase 2)
import { createExpense } from "@/server/finance/budget.service";

// Track recruitment costs
await createExpense({
  category: "RECRUITMENT",
  amount: jobBoardCost,
  linkedEntity: { type: "JOB", id: jobId },
  orgId,
});
```

**1.3 External Integrations (Phase 2)**

```typescript
// Webhooks & Feeds for external boards
// app/api/ats/webhooks/linkedin/route.ts
export async function POST(req: NextRequest) {
  // LinkedIn integration for job posting sync
  // Behind feature flag: LINKEDIN_INTEGRATION_ENABLED
}

// app/api/ats/feeds/indeed/route.ts
export async function GET(req: NextRequest) {
  // Generate Indeed XML feed
  // Format: Indeed Apply Now format
}
```

**1.4 Tooling Standards**

- ✅ **Zod** for API validation
- ✅ **React Hook Form** for forms
- ✅ **SWR** for client-side data fetching
- ✅ **pdf-parse** for resume parsing (Node.js, not Python)
- ✅ **string-similarity** for fuzzy matching (Node.js)

---

## 2) Multi-Tenancy & RBAC

### 🔧 Critical Fixes Required

**2.1 Enforce orgId Consistency**

```typescript
// server/models/ats/Job.ts
import { Schema, model } from "mongoose";
import { ObjectId } from "mongodb";

interface IJob {
  _id: ObjectId;
  orgId: ObjectId; // ⚠️ MUST be ObjectId, not string/number
  title: string;
  department: string;
  // ... other fields
}

const JobSchema = new Schema<IJob>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true },
  // ... rest of schema
});

// Compound indexes for multi-tenancy
JobSchema.index({ orgId: 1, status: 1, createdAt: -1 });
JobSchema.index({ orgId: 1, slug: 1 }, { unique: true });

export const Job = model<IJob>("Job", JobSchema);
```

**2.2 Org-Scoped Queries**

```typescript
// ❌ WRONG - No org scoping
const jobs = await Job.find({ status: "open" });

// ✅ CORRECT - Always scope by orgId
const jobs = await Job.find({
  orgId: session.user.orgId,
  status: "open",
});
```

**2.3 ATS RBAC Matrix**

| Role                | Jobs                 | Candidates    | Applications  | Interviews      | Offers    | Analytics     |
| ------------------- | -------------------- | ------------- | ------------- | --------------- | --------- | ------------- |
| **Super Admin**     | Read All (Audit)     | Read All      | Read All      | Read All        | Read All  | Global View   |
| **Corporate Admin** | Full CRUD            | Full CRUD     | Full CRUD     | Full CRUD       | Full CRUD | Org View      |
| **HR Manager**      | Full CRUD            | Full CRUD     | Full CRUD     | Full CRUD       | Approve   | Org View      |
| **Hiring Manager**  | Read/Update Assigned | Read Assigned | Read Assigned | Create/Update   | Request   | Assigned Only |
| **Interviewer**     | Read Assigned        | Read Assigned | Read Assigned | Update Assigned | None      | None          |
| **Candidate**       | Read Applied         | None          | Read Own      | Read Own        | Read Own  | None          |

**2.4 RBAC Middleware**

```typescript
// lib/ats-auth-middleware.ts
import { auth } from "@/auth";
import { NextRequest } from "next/server";

export async function atsRBACCheck(
  req: NextRequest,
  requiredRole: "super_admin" | "hr" | "hiring_manager" | "interviewer",
) {
  const session = await auth();

  if (!session?.user) {
    return { authorized: false, error: "Unauthorized" };
  }

  const { role, orgId } = session.user;

  // Super Admin can impersonate any tenant
  if (role === "SUPER_ADMIN") {
    const impersonateOrgId = req.headers.get("X-Impersonate-Org");
    return {
      authorized: true,
      orgId: impersonateOrgId || orgId,
      isSuperAdmin: true,
    };
  }

  // Role-based access
  const roleMap = {
    super_admin: ["SUPER_ADMIN"],
    hr: ["SUPER_ADMIN", "HR_MANAGER", "CORPORATE_ADMIN"],
    hiring_manager: ["SUPER_ADMIN", "HR_MANAGER", "HIRING_MANAGER"],
    interviewer: ["SUPER_ADMIN", "HR_MANAGER", "HIRING_MANAGER", "INTERVIEWER"],
  };

  if (!roleMap[requiredRole]?.includes(role)) {
    return { authorized: false, error: "Forbidden" };
  }

  return { authorized: true, orgId, role };
}
```

---

## 3) UI/UX & Governance Compliance

### 🔧 Critical Fixes Required

**3.1 Sidebar Integration**

```typescript
// config/navigation.ts
export const sidebarTree = [
  // ... existing modules
  {
    id: "hr",
    label: "Human Resources",
    icon: Users,
    children: [
      { id: "hr-dashboard", label: "Dashboard", path: "/hr" },
      { id: "hr-employees", label: "Employees", path: "/hr/employees" },
      { id: "hr-attendance", label: "Attendance", path: "/hr/attendance" },
      { id: "hr-payroll", label: "Payroll", path: "/hr/payroll" },
      {
        id: "hr-recruitment",
        label: "Recruitment (ATS)",
        icon: Briefcase,
        path: "/hr/ats",
        children: [
          { id: "ats-jobs", label: "Jobs", path: "/hr/ats/jobs" },
          { id: "ats-pipeline", label: "Pipeline", path: "/hr/ats/pipeline" },
          {
            id: "ats-candidates",
            label: "Candidates",
            path: "/hr/ats/candidates",
          },
          {
            id: "ats-interviews",
            label: "Interviews",
            path: "/hr/ats/interviews",
          },
          { id: "ats-offers", label: "Offers", path: "/hr/ats/offers" },
          {
            id: "ats-analytics",
            label: "Analytics",
            path: "/hr/ats/analytics",
          },
        ],
      },
    ],
  },
];
```

**3.2 Tab Layout (Monday-style)**

```typescript
// app/hr/ats/page.tsx
'use client';

import { Tabs } from '@/components/Tabs';
import { Briefcase, Users, Calendar, FileText, TrendingUp, GitBranch } from 'lucide-react';

const atsTabs = [
  { id: 'jobs', label: 'Jobs', icon: Briefcase, component: JobsView },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch, component: PipelineView },
  { id: 'candidates', label: 'Candidates', icon: Users, component: CandidatesView },
  { id: 'interviews', label: 'Interviews', icon: Calendar, component: InterviewsView },
  { id: 'offers', label: 'Offers', icon: FileText, component: OffersView },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, component: AnalyticsView }
];

export default function ATSPage() {
  return (
    <div className="h-full">
      {/* Use existing Header component - DO NOT create new header */}
      <Tabs tabs={atsTabs} defaultTab="jobs" />
    </div>
  );
}
```

**3.3 Layout Freeze Compliance**

```typescript
// ❌ WRONG - Creates duplicate header
export default function ATSLayout({ children }) {
  return (
    <div>
      <ATSHeader /> {/* DON'T DO THIS */}
      <ATSSidebar /> {/* DON'T DO THIS */}
      {children}
    </div>
  );
}

// ✅ CORRECT - Uses global layout
// No custom layout needed - uses app/layout.tsx
export default function ATSPage() {
  return <ATSContent />; // Just the content
}
```

**3.4 RTL/Dark Mode/Language Selector**

```typescript
// Must respect existing theme context
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';

export function ATSJobCard({ job }) {
  const { theme } = useTheme(); // 'light' | 'dark'
  const { t, locale } = useTranslation(); // 'en' | 'ar'
  const isRTL = locale === 'ar';

  return (
    <div
      className={`card ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <h3>{job.title[locale]}</h3>
      <p>{t('ats.jobs.location')}: {job.location}</p>
    </div>
  );
}
```

**3.5 Public Careers Page**

```typescript
// app/careers/page.tsx
import { Header } from '@/components/public/Header'; // Public header
import { Footer } from '@/components/public/Footer'; // Public footer

export default async function CareersPage() {
  return (
    <>
      <Header /> {/* Brand, Language Toggle, Login */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-[#0061A8]">
          Join Our Team
        </h1>
        {/* Job listings */}
      </main>
      <Footer /> {/* Company info, links, social */}
    </>
  );
}
```

---

## 4) Features Missing / Stubbed

### 🔧 Implementation Required

**4.1 Resume Parsing (Node.js)**

```typescript
// lib/ats/resume-parser.ts
import pdfParse from "pdf-parse";
import stringSimilarity from "string-similarity";

interface ParsedResume {
  email?: string;
  phone?: string;
  name?: string;
  skills: string[];
  experience?: string;
  education?: string;
}

export async function parseResume(buffer: Buffer): Promise<ParsedResume> {
  // Extract text from PDF
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch?.[0];

  // Extract phone (Saudi format)
  const phoneMatch = text.match(/\+?966[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}/);
  const phone = phoneMatch?.[0];

  // Extract name (heuristic: first line with 2-4 words)
  const lines = text.split("\n").filter((l) => l.trim());
  const nameMatch = lines.find((l) => {
    const words = l.trim().split(/\s+/);
    return words.length >= 2 && words.length <= 4 && /^[A-Za-z\s]+$/.test(l);
  });
  const name = nameMatch?.trim();

  // Extract skills (keywords)
  const skillKeywords = [
    "javascript",
    "typescript",
    "react",
    "node",
    "python",
    "java",
    "sql",
    "mongodb",
    "aws",
    "docker",
    "kubernetes",
    "leadership",
    "management",
    "communication",
  ];

  const skills = skillKeywords.filter((skill) =>
    text.toLowerCase().includes(skill.toLowerCase()),
  );

  return { email, phone, name, skills, experience: text, education: text };
}

export function scoreCandidate(
  candidateSkills: string[],
  requiredSkills: string[],
  niceToHaveSkills: string[] = [],
): number {
  if (requiredSkills.length === 0) return 0;

  let score = 0;
  let maxScore = requiredSkills.length * 10 + niceToHaveSkills.length * 5;

  // Required skills (10 points each)
  for (const required of requiredSkills) {
    const bestMatch = stringSimilarity.findBestMatch(
      required.toLowerCase(),
      candidateSkills.map((s) => s.toLowerCase()),
    );

    if (bestMatch.bestMatch.rating > 0.7) {
      score += 10 * bestMatch.bestMatch.rating;
    }
  }

  // Nice-to-have skills (5 points each)
  for (const nice of niceToHaveSkills) {
    const bestMatch = stringSimilarity.findBestMatch(
      nice.toLowerCase(),
      candidateSkills.map((s) => s.toLowerCase()),
    );

    if (bestMatch.bestMatch.rating > 0.7) {
      score += 5 * bestMatch.bestMatch.rating;
    }
  }

  return Math.round((score / maxScore) * 100);
}
```

**4.2 ICS Calendar Generation (Node.js)**

```typescript
// lib/ats/ics-generator.ts
export interface ICSEvent {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  organizerEmail: string;
}

export function generateICS(event: ICSEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Fixzit//ATS Interview Scheduler//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${Date.now()}@fixzit.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.startTime)}
DTEND:${formatDate(event.endTime)}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, "\\n")}
LOCATION:${event.location}
ORGANIZER:CN=Fixzit ATS:MAILTO:${event.organizerEmail}
${event.attendees.map((email) => `ATTENDEE:MAILTO:${email}`).join("\n")}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  return ics;
}

// Usage in interview scheduling
import { sendEmail } from "@/lib/email";

export async function scheduleInterview(
  interview: Interview,
  candidate: Candidate,
  interviewer: User,
) {
  const icsContent = generateICS({
    title: `Interview: ${candidate.name} - ${interview.jobTitle}`,
    description: `Interview for ${interview.jobTitle} position\n\nCandidate: ${candidate.name}\nInterviewer: ${interviewer.name}`,
    location: interview.location || "Virtual (Link to be shared)",
    startTime: interview.scheduledAt,
    endTime: new Date(interview.scheduledAt.getTime() + 60 * 60 * 1000), // 1 hour
    attendees: [candidate.email, interviewer.email],
    organizerEmail: "ats@fixzit.com",
  });

  // Send calendar invite
  await sendEmail(
    [candidate.email, interviewer.email],
    `Interview Scheduled: ${interview.jobTitle}`,
    `Your interview has been scheduled. Please find the calendar invite attached.`,
    [
      {
        filename: "interview.ics",
        content: Buffer.from(icsContent),
        contentType: "text/calendar; charset=utf-8; method=REQUEST",
      },
    ],
  );
}
```

**4.3 Offer PDF Generation**

```typescript
// lib/ats/offer-pdf.ts
import PDFDocument from "pdfkit";

export async function generateOfferPDF(offer: Offer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(24).text("Fixzit", { align: "center" });
    doc.fontSize(16).text("Employment Offer Letter", { align: "center" });
    doc.moveDown(2);

    // Offer details
    doc.fontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Dear ${offer.candidateName},`);
    doc.moveDown();
    doc.text(`We are pleased to offer you the position of ${offer.jobTitle}.`);
    doc.moveDown();

    // Terms
    doc.text("Position Details:", { underline: true });
    doc.text(`Title: ${offer.jobTitle}`);
    doc.text(`Department: ${offer.department}`);
    doc.text(`Location: ${offer.location}`);
    doc.text(`Start Date: ${offer.startDate.toLocaleDateString()}`);
    doc.moveDown();

    doc.text("Compensation:", { underline: true });
    doc.text(
      `Base Salary: SAR ${offer.salary.toLocaleString()} per ${offer.salaryPeriod}`,
    );
    if (offer.benefits?.length) {
      doc.text(`Benefits: ${offer.benefits.join(", ")}`);
    }
    doc.moveDown();

    // Signature
    doc.moveDown(3);
    doc.text(
      "Please sign and return this offer by " +
        offer.expiresAt.toLocaleDateString(),
    );
    doc.moveDown(2);
    doc.text("Accepted by: ________________________  Date: __________");

    doc.end();
  });
}
```

**4.4 Job Board Feeds**

```typescript
// app/api/ats/feeds/indeed/route.ts
import { NextResponse } from "next/server";
import { Job } from "@/server/models/ats/Job";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  const jobs = await Job.find({
    orgId,
    status: "open",
    publishToIndeed: true,
  }).lean();

  // Generate Indeed XML feed
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>Fixzit</publisher>
  <publisherurl>https://fixzit.com</publisherurl>
  ${jobs
    .map(
      (job) => `
  <job>
    <title><![CDATA[${job.title}]]></title>
    <date>${job.createdAt.toISOString().split("T")[0]}</date>
    <referencenumber>${job._id}</referencenumber>
    <url><![CDATA[https://fixzit.com/careers/${job.slug}]]></url>
    <company><![CDATA[Fixzit]]></company>
    <city>${job.location.city}</city>
    <country>${job.location.country}</country>
    <description><![CDATA[${job.description}]]></description>
  </job>
  `,
    )
    .join("\n")}
</source>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}

// app/careers/[slug]/page.tsx - Add JSON-LD for Google Jobs
export async function generateMetadata({ params }) {
  const job = await Job.findOne({ slug: params.slug });

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.createdAt.toISOString(),
    validThrough: job.applicationDeadline?.toISOString(),
    employmentType: job.employmentType, // FULL_TIME, PART_TIME, etc.
    hiringOrganization: {
      "@type": "Organization",
      name: "Fixzit",
      sameAs: "https://fixzit.com",
      logo: "https://fixzit.com/logo.png",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location.city,
        addressCountry: job.location.country,
      },
    },
    baseSalary: job.salaryRange
      ? {
          "@type": "MonetaryAmount",
          currency: "SAR",
          value: {
            "@type": "QuantitativeValue",
            minValue: job.salaryRange.min,
            maxValue: job.salaryRange.max,
            unitText: "YEAR",
          },
        }
      : undefined,
  };

  return {
    title: job.title,
    description: job.description.substring(0, 160),
    other: {
      "application/ld+json": JSON.stringify(jsonLd),
    },
  };
}
```

**4.5 Analytics Dashboard**

```typescript
// app/api/ats/analytics/route.ts
import { Application } from "@/server/models/ats/Application";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  // Stage distribution
  const stageDistribution = await Application.aggregate([
    { $match: { orgId: new ObjectId(orgId) } },
    { $group: { _id: "$stage", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Time to hire (Applied → Hired)
  const timeToHire = await Application.aggregate([
    {
      $match: {
        orgId: new ObjectId(orgId),
        stage: "hired",
        hiredAt: { $exists: true },
      },
    },
    {
      $project: {
        days: {
          $divide: [
            { $subtract: ["$hiredAt", "$appliedAt"] },
            1000 * 60 * 60 * 24,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgDays: { $avg: "$days" },
        minDays: { $min: "$days" },
        maxDays: { $max: "$days" },
      },
    },
  ]);

  // Source mix
  const sourceMix = await Application.aggregate([
    { $match: { orgId: new ObjectId(orgId) } },
    { $group: { _id: "$source", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return NextResponse.json({
    stageDistribution,
    timeToHire: timeToHire[0] || null,
    sourceMix,
  });
}
```

---

## 5) Logic Corrections & Guards

### 🔧 Critical Fixes Required

**5.1 Fuzzy Scoring (Node.js)**

```typescript
// Already implemented in section 4.1
// Uses string-similarity library, not Python/mpmath
```

**5.2 Deduplication**

```typescript
// lib/ats/deduplication.ts
import stringSimilarity from "string-similarity";

export async function checkDuplicateCandidate(
  email: string,
  fullName: string,
  phone: string,
  orgId: ObjectId,
): Promise<{ isDuplicate: boolean; matchedId?: ObjectId }> {
  // 1. Exact email match
  const exactMatch = await Candidate.findOne({ orgId, email });
  if (exactMatch) {
    return { isDuplicate: true, matchedId: exactMatch._id };
  }

  // 2. Fuzzy name + phone match
  const candidates = await Candidate.find({ orgId }).lean();

  for (const candidate of candidates) {
    const nameSimilarity = stringSimilarity.compareTwoStrings(
      fullName.toLowerCase(),
      candidate.fullName.toLowerCase(),
    );

    const phoneSimilarity =
      phone && candidate.phone
        ? stringSimilarity.compareTwoStrings(
            phone.replace(/\D/g, ""),
            candidate.phone.replace(/\D/g, ""),
          )
        : 0;

    // If name is very similar (>90%) and phone matches (>90%), it's a duplicate
    if (nameSimilarity > 0.9 && phoneSimilarity > 0.9) {
      return { isDuplicate: true, matchedId: candidate._id };
    }
  }

  return { isDuplicate: false };
}
```

**5.3 Stage Transition Guards**

```typescript
// lib/ats/stage-machine.ts
type Stage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

const allowedTransitions: Record<Stage, Stage[]> = {
  applied: ["screening", "rejected"],
  screening: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [], // Terminal state
  rejected: [], // Terminal state
};

export function canTransitionStage(
  currentStage: Stage,
  newStage: Stage,
  application: Application,
): { allowed: boolean; reason?: string } {
  // Check if transition is allowed by state machine
  if (!allowedTransitions[currentStage]?.includes(newStage)) {
    return {
      allowed: false,
      reason: `Cannot move from ${currentStage} to ${newStage} directly`,
    };
  }

  // Additional guards
  if (newStage === "hired") {
    // Must have an accepted offer
    if (!application.offerId || application.offerStatus !== "accepted") {
      return {
        allowed: false,
        reason: "Candidate must have an accepted offer to be hired",
      };
    }
  }

  if (newStage === "offer") {
    // Must have completed at least one interview
    if (!application.interviewIds?.length) {
      return {
        allowed: false,
        reason:
          "Candidate must complete at least one interview before receiving an offer",
      };
    }
  }

  return { allowed: true };
}

// Usage in API
export async function POST(req: NextRequest) {
  const { applicationId, newStage } = await req.json();
  const application = await Application.findById(applicationId);

  const validation = canTransitionStage(
    application.stage,
    newStage,
    application,
  );

  if (!validation.allowed) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  // Proceed with update...
}
```

**5.4 LinkedIn Apply (Phase 2)**

```typescript
// Feature flag
// env.local
LINKEDIN_INTEGRATION_ENABLED = false;

// app/api/ats/auth/linkedin/callback/route.ts
export async function GET(req: NextRequest) {
  if (process.env.LINKEDIN_INTEGRATION_ENABLED !== "true") {
    return NextResponse.json({ error: "Feature not enabled" }, { status: 403 });
  }

  // OAuth callback logic
  // Phase 2 implementation
}
```

---

## 6) Bugs, Errors & Security

### 🔧 Critical Fixes Required

**6.1 FormData vs JSON**

```typescript
// app/api/ats/applications/apply/route.ts
import { z } from "zod";

const applySchema = z.object({
  jobId: z.string(),
  candidateName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^\+?966[\d\s-]{9,}$/),
  coverLetter: z.string().optional(),
  // resume handled separately as file
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Parse form fields
    const data = {
      jobId: formData.get("jobId"),
      candidateName: formData.get("candidateName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      coverLetter: formData.get("coverLetter"),
    };

    // Validate with Zod
    const validated = applySchema.parse(data);

    // Handle file upload
    const resumeFile = formData.get("resume") as File;
    if (!resumeFile) {
      return NextResponse.json(
        { error: "Resume is required" },
        { status: 400 },
      );
    }

    // File validation
    if (resumeFile.size > 5 * 1024 * 1024) {
      // 5MB
      return NextResponse.json(
        { error: "Resume must be less than 5MB" },
        { status: 400 },
      );
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(resumeFile.type)) {
      return NextResponse.json(
        { error: "Resume must be PDF or DOC format" },
        { status: 400 },
      );
    }

    // Upload to S3 with pre-signed URL
    const resumeBuffer = await resumeFile.arrayBuffer();
    const resumeUrl = await uploadToS3(Buffer.from(resumeBuffer));

    // Parse resume
    const parsedData = await parseResume(Buffer.from(resumeBuffer));

    // Create application
    const application = await Application.create({
      ...validated,
      resumeUrl,
      parsedData,
      orgId: session.user.orgId,
    });

    return NextResponse.json({ success: true, applicationId: application._id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("[ATS Apply] Error", { error });
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 },
    );
  }
}
```

**6.2 Pagination**

```typescript
// app/api/ats/applications/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Max 100
  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    Application.find({ orgId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments({ orgId }),
  ]);

  return NextResponse.json({
    data: applications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: skip + applications.length < total,
    },
  });
}
```

**6.3 Slug Uniqueness**

```typescript
// server/models/ats/Job.ts
JobSchema.index({ orgId: 1, slug: 1 }, { unique: true });

// lib/ats/slug-generator.ts
export async function generateUniqueSlug(
  title: string,
  orgId: ObjectId,
): Promise<string> {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  let counter = 0;
  let uniqueSlug = slug;

  while (await Job.exists({ orgId, slug: uniqueSlug })) {
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }

  return uniqueSlug;
}
```

**6.4 File Upload Security**

```typescript
// lib/ats/s3-upload.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  // Generate unique key
  const hash = crypto.randomBytes(16).toString("hex");
  const ext = filename.split(".").pop();
  const key = `ats/resumes/${hash}.${ext}`;

  // Upload
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf", // or detect
      ServerSideEncryption: "AES256",
    }),
  );

  // Return URL (or pre-signed URL for private buckets)
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

// Virus scanning (stub for now)
export async function scanFile(buffer: Buffer): Promise<{ safe: boolean }> {
  // TODO: Integrate with ClamAV or AWS GuardDuty
  // For now, basic checks
  const isSafe = buffer.length > 0 && buffer.length < 10 * 1024 * 1024; // 10MB max
  return { safe: isSafe };
}
```

**6.5 XSS Prevention**

```typescript
// lib/ats/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target']
  });
}

// Usage in job description rendering
export function JobDescription({ html }: { html: string }) {
  const sanitized = sanitizeHTML(html);
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
```

**6.6 Audit Logging**

```typescript
// lib/ats/audit-log.ts
import { logger } from "@/lib/logger";

export async function logATSAction(
  action: string,
  userId: string,
  orgId: string,
  resourceType: "job" | "application" | "interview" | "offer",
  resourceId: string,
  details?: Record<string, unknown>,
) {
  await logger.info("[ATS Audit]", {
    action,
    userId,
    orgId,
    resourceType,
    resourceId,
    details,
    timestamp: new Date(),
    ip: req.ip,
  });

  // Also store in audit_logs collection for UI display
  await db.collection("audit_logs").insertOne({
    action,
    userId,
    orgId,
    resourceType,
    resourceId,
    details,
    timestamp: new Date(),
  });
}

// Usage
await logATSAction(
  "JOB_CREATED",
  session.user.id,
  session.user.orgId,
  "job",
  job._id.toString(),
  { title: job.title, department: job.department },
);
```

---

## 7) Performance & Scalability

### 🔧 Required Optimizations

**7.1 Database Indexes**

```typescript
// server/models/ats/Application.ts
ApplicationSchema.index({ orgId: 1, stage: 1, createdAt: -1 });
ApplicationSchema.index({ orgId: 1, jobId: 1 });
ApplicationSchema.index({ orgId: 1, candidateId: 1 });
ApplicationSchema.index({ email: 1 }); // For deduplication

// server/models/ats/Job.ts
JobSchema.index({ orgId: 1, status: 1, createdAt: -1 });
JobSchema.index({ orgId: 1, slug: 1 }, { unique: true });
JobSchema.index({ status: 1, publishedAt: -1 }); // For public careers page

// server/models/ats/Candidate.ts
CandidateSchema.index({ orgId: 1, email: 1 }, { unique: true });
CandidateSchema.index({ orgId: 1, createdAt: -1 });
```

**7.2 Aggregation Pipelines**

```typescript
// Efficient pipeline for analytics
export async function getATSAnalytics(orgId: ObjectId) {
  const pipeline = [
    { $match: { orgId } },
    {
      $facet: {
        stageDistribution: [
          { $group: { _id: "$stage", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        sourceDistribution: [
          { $group: { _id: "$source", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        timeToHire: [
          { $match: { stage: "hired", hiredAt: { $exists: true } } },
          {
            $project: {
              days: {
                $divide: [
                  { $subtract: ["$hiredAt", "$appliedAt"] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avg: { $avg: "$days" },
              min: { $min: "$days" },
              max: { $max: "$days" },
            },
          },
        ],
      },
    },
  ];

  const [result] = await Application.aggregate(pipeline);
  return result;
}
```

**7.3 Background Jobs**

```typescript
// jobs/ats/email-processor.ts
import { sendEmail } from "@/lib/email";

export async function processATSEmails() {
  // Get pending email jobs
  const pendingEmails = await db
    .collection("ats_email_queue")
    .find({
      status: "pending",
    })
    .limit(50)
    .toArray();

  for (const email of pendingEmails) {
    try {
      await sendEmail(email.to, email.subject, email.body, email.attachments);

      await db
        .collection("ats_email_queue")
        .updateOne(
          { _id: email._id },
          { $set: { status: "sent", sentAt: new Date() } },
        );
    } catch (error) {
      await db.collection("ats_email_queue").updateOne(
        { _id: email._id },
        {
          $set: { status: "failed", error: error.message },
          $inc: { attempts: 1 },
        },
      );
    }
  }
}

// Run via cron or setImmediate
if (process.env.NODE_ENV === "production") {
  setInterval(processATSEmails, 60000); // Every minute
}
```

---

## 8) Testing & STRICT Verification

### 🔧 Required Test Coverage

**8.1 Halt–Fix–Verify Checklist**

```typescript
// tests/ats/ats-verification.test.ts
import { test, expect } from "@playwright/test";

const roles = ["SUPER_ADMIN", "HR_MANAGER", "HIRING_MANAGER", "INTERVIEWER"];
const pages = [
  "/hr/ats/jobs",
  "/hr/ats/pipeline",
  "/hr/ats/candidates",
  "/hr/ats/interviews",
  "/hr/ats/offers",
  "/hr/ats/analytics",
];

for (const role of roles) {
  for (const page of pages) {
    test(`${page} - ${role} - STRICT v4`, async ({ page: p }) => {
      // Login as role
      await loginAs(p, role);
      await p.goto(page);

      // 1. No console errors
      const consoleErrors: string[] = [];
      p.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await p.waitForLoadState("networkidle");
      expect(consoleErrors).toHaveLength(0);

      // 2. No network errors
      const failedRequests: string[] = [];
      p.on("response", (response) => {
        if (response.status() >= 400) {
          failedRequests.push(`${response.status()} ${response.url()}`);
        }
      });
      expect(failedRequests).toHaveLength(0);

      // 3. Header present
      await expect(p.locator("header")).toBeVisible();

      // 4. Sidebar present
      await expect(p.locator('nav[role="navigation"]')).toBeVisible();

      // 5. Language selector present
      await expect(
        p.locator('[data-testid="language-selector"]'),
      ).toBeVisible();

      // 6. RTL works
      await p.locator('[data-testid="language-selector"]').click();
      await p.locator('[data-lang="ar"]').click();
      await expect(p.locator("html")).toHaveAttribute("dir", "rtl");

      // 7. Dark mode toggle works
      await p.locator('[data-testid="theme-toggle"]').click();
      await expect(p.locator("html")).toHaveClass(/dark/);

      // 8. Mock data present (no empty states on first load)
      const cards = p.locator('[data-testid="ats-card"]');
      expect(await cards.count()).toBeGreaterThan(0);
    });
  }
}
```

**8.2 E2E Tests**

```typescript
// tests/ats/apply-flow.test.ts
test("Candidate can apply to job", async ({ page }) => {
  // Go to public careers page
  await page.goto("/careers");

  // Find and click on a job
  await page.locator('[data-testid="job-card"]').first().click();

  // Fill application form
  await page.fill('[name="candidateName"]', "Test Candidate");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="phone"]', "+966501234567");
  await page.fill('[name="coverLetter"]', "I am interested in this position");

  // Upload resume
  await page.setInputFiles('[name="resume"]', "./fixtures/sample-resume.pdf");

  // Submit
  await page.click('[type="submit"]');

  // Verify success
  await expect(
    page.locator("text=Application submitted successfully"),
  ).toBeVisible();
});

// tests/ats/pipeline.test.ts
test("HR can move candidate through pipeline", async ({ page }) => {
  await loginAs(page, "HR_MANAGER");
  await page.goto("/hr/ats/pipeline");

  // Find application in "Applied" column
  const applied = page.locator('[data-stage="applied"]');
  const firstCard = applied.locator('[data-testid="application-card"]').first();

  // Drag to "Screening"
  await firstCard.dragTo(page.locator('[data-stage="screening"]'));

  // Verify moved
  await expect(page.locator('[data-stage="screening"]')).toContainText(
    "Test Candidate",
  );
});
```

---

## Implementation Timeline

### Phase 1: Critical Fixes (Week 1-2)

- [ ] Fix multi-tenancy (orgId consistency)
- [ ] Implement RBAC middleware
- [ ] Fix sidebar integration
- [ ] Fix layout compliance
- [ ] Add error handling & validation

### Phase 2: Core Features (Week 3-4)

- [ ] Resume parsing (Node.js)
- [ ] ICS generation
- [ ] Offer PDF generation
- [ ] Stage transition guards
- [ ] Deduplication logic

### Phase 3: Performance & Security (Week 5-6)

- [ ] Add database indexes
- [ ] Implement pagination
- [ ] Add audit logging
- [ ] File upload security
- [ ] XSS prevention

### Phase 4: Testing & Polish (Week 7-8)

- [ ] STRICT v4 verification
- [ ] E2E test coverage
- [ ] Analytics dashboard
- [ ] Job board feeds
- [ ] Documentation

### Phase 5: Advanced Features (Future)

- [ ] LinkedIn/Indeed integration
- [ ] Advanced analytics
- [ ] WhatsApp notifications
- [ ] Video interview scheduling
- [ ] AI-powered screening

---

## Acceptance Criteria

### Must Have (Phase 1-3)

- [x] Multi-tenant with orgId on all records
- [x] RBAC with 5 roles (Super Admin, Corporate Admin, HR, Hiring Manager, Interviewer)
- [x] Integrated into HR → Recruitment (ATS) sidebar
- [x] Layout freeze compliance (single global layout)
- [x] RTL/Dark mode support
- [x] Resume parsing (Node.js, no Python)
- [x] Stage transition guards
- [x] Error handling & validation
- [x] Pagination on all lists
- [x] Audit logging
- [x] STRICT v4 verification

### Should Have (Phase 4)

- [ ] ICS calendar invites
- [ ] Offer PDF generation
- [ ] Basic analytics dashboard
- [ ] E2E test coverage >80%
- [ ] Job board XML feeds

### Nice to Have (Phase 5)

- [ ] LinkedIn Apply integration
- [ ] Advanced analytics with Recharts
- [ ] AI-powered resume screening
- [ ] Video interview scheduling
- [ ] Candidate self-service portal

---

## Conclusion

This review identifies the gaps between the current ATS implementation and enterprise-grade requirements. The module has a solid foundation but needs:

1. **Critical architectural fixes** (multi-tenancy, RBAC, layout compliance)
2. **Security hardening** (validation, sanitization, audit logs)
3. **Performance optimization** (indexes, pagination, background jobs)
4. **Testing rigor** (STRICT v4, E2E coverage)

Following this plan will align the ATS module with Fixzit's SDD, Blueprint Bible vFinal, Master Governance V5, and STRICT v4 standards.

**Estimated Total Time:** 8-12 weeks for full enterprise readiness  
**Priority:** High (HR is a core module, ATS is critical for recruitment)  
**Risk:** Medium (requires coordination with Notifications, Approvals, Finance modules)

---

**Status:** Ready for Implementation  
**Next Steps:** Review with team → Create Jira tickets → Begin Phase 1
