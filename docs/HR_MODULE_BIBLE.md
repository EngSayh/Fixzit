# Fixzit HR Module - Comprehensive Technical & Business Documentation

## Enterprise-Grade Workforce Management for Saudi Facility Management Sector

**Document Version:** 1.0  
**Date:** October 31, 2025  
**Author:** Fixzit Development Team  
**Status:** Production-Ready Foundation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Module Scope & Objectives](#module-scope--objectives)
3. [Subscription Tiers & Pricing](#subscription-tiers--pricing)
4. [System Architecture](#system-architecture)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [KSA Compliance](#ksa-compliance)
8. [System Behavior](#system-behavior)
9. [Integration Points](#integration-points)
10. [Security & Multi-Tenancy](#security--multi-tenancy)
11. [Deployment Guide](#deployment-guide)
12. [Appendices](#appendices)

---

## Executive Summary

The Fixzit HR Module is an enterprise-grade, Saudi Arabia-compliant workforce management solution specifically designed for the facility management and construction sectors. It is not a generic HRIS; it is a compliance-first, operations-driven system that manages the complete employee lifecycle from onboarding through termination, with deep integration into payroll processing, WPS/Mudad file generation, and GOSI compliance.

### Key Differentiators

- **KSA-First Design**: Built around HRSD labor law, GOSI/SANED contributions, WPS/Mudad requirements
- **Facility Management Focus**: Technician dispatch integration, shift rostering, skills tracking
- **Subscription-Based**: Tiered feature access (Small/Mid/Enterprise) with per-employee pricing
- **Multi-Tenant SaaS**: Complete organizational isolation, single codebase
- **Audit-Ready**: Immutable payslips, document expiry tracking, state machine workflows

### Business Value

For **Corporate Clients** (e.g., large FM companies managing 500+ field technicians):

- Automated payroll processing with GOSI/SANED calculations
- One-click WPS file generation for bank uploads (Mudad compliance)
- Document expiry alerts (Iqama, Passport) to prevent visa violations
- Shift rostering with skill-based technician dispatch
- ESB (End of Service Benefits) calculator for terminations

For **Fixzit Platform**:

- Recurring revenue stream (SAR 10-40 per employee/month)
- Upsell opportunity (Basic → Payroll → Full Suite)
- Reduced support burden (automated compliance calculations)
- Market differentiation (only FM-specific HR solution in Saudi market)

---

## Module Scope & Objectives

### Included Features

#### 1. Employee Directory (All Tiers)

- Complete employee master data with KSA-specific fields
- Document tracking: Iqama, Passport, Visas, Contracts (with expiry dates)
- Employment details: Job title, department, manager, site assignment
- Compensation structure: Basic, housing, transport, other allowances
- Bank details: Masked IBAN storage for WPS compliance
- Skills & certifications: For FM technician dispatch
- Asset tracking: Laptops, phones, uniforms assigned to employees
- Status lifecycle: ONBOARDING → ACTIVE → ON_LEAVE → SUSPENDED → TERMINATED

#### 2. Attendance & Timesheets (Small+)

- Clock-in/out logs with GPS geo-fencing
- Multi-source capture: Mobile app, kiosk, manual entry
- Shift templates & rostering
- Weekly timesheet approval workflow
- Overtime tracking (for payroll integration)
- Exception management: Missing punch, late arrival, early departure

#### 3. Leave Management (Small+)

- Configurable leave types: Annual, Sick, Hajj, Maternity, Paternity, Unpaid
- Accrual rules: 21 days (standard) → 30 days (after 5 years)
- Balance tracking: Opening + Accrued - Taken = Balance
- Multi-level approval: Manager → HR (DoA support)
- Calendar integration: Block-out dates, public holidays
- Leave liability reporting

#### 4. Payroll Processing (Mid+)

- **DRAFT**: Admin creates run for period (e.g., "October 2025")
- **CALCULATE**: System fetches active employees, approved timesheets
  - Calculates overtime (150% of hourly basic per HRSD)
  - Applies GOSI contributions:
    - Saudi nationals: 9% + 9% (annuities), 0.75% + 0.75% (SANED), 2% (OH employer)
    - New entrants (2024+): 9.5% + 9.5% (gradual increase to 11% by 2028)
    - Non-Saudis: 2% (OH employer only)
  - Generates earnings/deductions breakdown
  - Creates immutable payslip records
- **APPROVE**: DoA approval workflow (configurable levels)
- **LOCK**: Immutable state, payslips frozen
- **EXPORT**: WPS CSV file generation for Mudad upload

#### 5. WPS/Mudad Compliance (Mid+)

- Bank-format CSV generation (Employee ID, Name, IBAN, Basic, Allowances, Deductions, Net)
- IBAN validation (SA + 22 digits format)
- Bank code extraction from IBAN
- Checksum generation (SHA-256 for file integrity)
- Pre-upload validation:
  - Positive net salaries
  - Valid IBAN formats
  - Salary month format (YYYY-MM)
- Downloadable file with metadata headers (checksum, record count, total net)

#### 6. Recruitment/ATS (Enterprise)

- Job posting management
- Candidate pipeline (Kanban: Applied → Screening → Interview → Offer → Hired)
- Interview scheduling
- Offer letter generation
- Hire → Employee conversion (seamless onboarding)

#### 7. Performance Management (Enterprise)

- Goal setting & KPI tracking
- Review cycles (annual, semi-annual, quarterly)
- Multi-rater feedback (360° reviews)
- Rating scales & competency frameworks
- Performance Improvement Plans (PIPs)

#### 8. Training & Certifications (Enterprise)

- Course catalog (internal/external)
- Enrollment tracking
- Completion certificates
- Expiry tracking for required certifications (e.g., safety, technical)
- Integration with compliance alerts

---

## Subscription Tiers & Pricing

### Pricing Model

**Per-Employee/Month Pricing** (SAR, excluding 15% VAT):

| Tier           | Monthly Rate | Minimum       | Target Market                | Key Features                             |
| -------------- | ------------ | ------------- | ---------------------------- | ---------------------------------------- |
| **Small**      | SAR 10       | 5 employees   | Startups, small FM companies | Directory, Attendance, Leave             |
| **Mid**        | SAR 25       | 20 employees  | Growing FM companies         | + Payroll, WPS Export, Timesheets        |
| **Enterprise** | SAR 40       | 100 employees | Large corporates, multi-site | + ATS, Performance, Training, API access |

**Annual Commitment Discounts:**

- 10% discount for annual pre-payment
- 15% discount for 3-year commitment

**Example Pricing:**

- 50 employees (Mid tier): SAR 25 × 50 = **SAR 1,250/month** (SAR 15,000/year)
- 500 employees (Enterprise): SAR 40 × 500 = **SAR 20,000/month** (SAR 240,000/year with volume discount)

### Competitive Positioning

**Benchmarked Against:**

- **Zoho People (KSA)**: ~SAR 5-20/user/month (generic HRIS, no WPS/FM features)
- **Jisr/Bayzat (Local)**: Quote-based, ~SAR 15-30/user/month (strong WPS, weak FM integration)
- **BambooHR (Global)**: ~SAR 40-50/user/month (USD pricing, no KSA localization)

**Fixzit Advantage:**

- **Only solution** with FM-specific features (technician dispatch, shift rostering, site assignment)
- **Competitive pricing** at mid-tier (SAR 25 vs. SAR 30-40 for local players)
- **Bundled platform** (HR + Work Orders + Finance + Marketplace in one subscription)

---

## System Architecture

### Technology Stack

- **Backend**: Next.js 14+ (App Router), TypeScript
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: NextAuth.js (JWT + session)
- **Deployment**: Vercel / Docker containers
- **Storage**: AWS S3 (for documents/files)

### Multi-Tenancy Architecture

```
┌─────────────────────────────────────────┐
│         Request Layer                    │
│  (NextAuth Session + Org ID)            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      API Route Handlers                  │
│  - Session validation                    │
│  - Org-scoping filter (orgId)           │
│  - Subscription feature gating           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Service Layer                       │
│  - ksaPayrollService.ts (GOSI, OT, ESB) │
│  - wpsService.ts (Mudad file gen)       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      MongoDB (Mongoose Models)           │
│  - All queries filtered by orgId        │
│  - Compound indexes: (orgId, key)       │
└──────────────────────────────────────────┘
```

### Database Isolation

Every MongoDB document includes `orgId` field:

- Prevents cross-tenant data leakage
- Queries automatically scoped: `{ orgId: session.user.orgId, ... }`
- Compound indexes for performance: `{ orgId: 1, employeeCode: 1 }` (unique)

---

## Data Models

### 1. Employee

**Collection**: `hr_employees`

```typescript
interface IEmployee {
  orgId: ObjectId; // Multi-tenant isolation
  employeeCode: string; // Unique within org (e.g., "EMP-001")
  firstName: string;
  lastName: string;
  firstNameAr: string; // Arabic name
  lastNameAr: string;
  email: string;
  phone: string;
  nationality: string;
  status: "ONBOARDING" | "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";

  employment: {
    jobTitle: string;
    department: string;
    managerId: ObjectId;
    site: string; // For FM: property assignment
    joinDate: Date;
    contractType: "PERMANENT" | "FIXED_TERM" | "CONTRACT";
    contractEndDate: Date;
    qiwaContractId: string; // Qiwa digital contract reference
  };

  compensation: {
    baseSalary: number; // Monthly SAR
    housingAllowance: number;
    transportAllowance: number;
    otherAllowances: [{ name: string; amount: number }];
    currency: string; // "SAR"
    gosiApplicable: boolean; // True for Saudi nationals
    sanedApplicable: boolean;
  };

  bank: {
    bankName: string;
    iban: string; // SA + 22 digits
    accountNumber: string;
  };

  documents: [
    {
      type: "IQAMA" | "PASSPORT" | "CONTRACT" | "VISA";
      number: string;
      issueDate: Date;
      expiryDate: Date; // Indexed for compliance alerts
      fileUrl: string; // S3 URL
    },
  ];

  assets: [
    {
      assetTag: string;
      name: string; // "Laptop", "Phone"
      assignedAt: Date;
      returnedAt: Date;
    },
  ];

  skills: string[]; // For FM dispatch: ["HVAC", "Plumbing", "Electrical"]
  certifications: [{ name: string; issueDate: Date; expiryDate: Date }];

  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**

- `{ orgId: 1, employeeCode: 1 }` - Unique within org
- `{ orgId: 1, email: 1 }`
- `{ orgId: 1, status: 1 }`
- `{ 'documents.expiryDate': 1 }` - For compliance alerts

### 2. PayrollRun & Payslip

**Collection**: `hr_payroll_runs`, `hr_payslips`

```typescript
interface IPayrollRun {
  orgId: ObjectId;
  periodStart: Date; // e.g., 2025-10-01
  periodEnd: Date; // e.g., 2025-10-31
  cutOffDate: Date; // Last date to include attendance (e.g., 2025-10-25)
  status: "DRAFT" | "CALCULATED" | "APPROVED" | "LOCKED";
  totalGross: number;
  totalNet: number;
  totalGOSI: number; // Employee + Employer
  totalSANED: number;
  employeeCount: number;
  wpsBatchId: string; // Mudad batch ID after export
  wpsFileUrl: string; // S3 URL of CSV
  approvedBy: ObjectId;
  approvedAt: Date;
  lockedBy: ObjectId; // Immutable after lock
  lockedAt: Date;
}

interface IPayslip {
  orgId: ObjectId;
  payrollRunId: ObjectId;
  employeeId: ObjectId;
  employeeCode: string; // Denormalized for WPS
  employeeName: string;
  iban: string; // Denormalized for WPS
  periodStart: Date;
  periodEnd: Date;

  earnings: [{ code: string; name: string; amount: number }];
  // Example: [
  //   { code: 'BASIC', name: 'Basic Salary', amount: 10000 },
  //   { code: 'HOUSING', name: 'Housing Allowance', amount: 2500 },
  //   { code: 'OVERTIME', name: 'Overtime (150%)', amount: 937.5 }
  // ]

  deductions: [{ code: string; name: string; amount: number }];
  // Example: [
  //   { code: 'GOSI_ANNUITIES', name: 'GOSI (Annuities)', amount: 1125 },
  //   { code: 'SANED', name: 'SANED (Unemployment)', amount: 93.75 }
  // ]

  grossPay: number; // Sum of earnings
  netPay: number; // Gross - deductions
  gosiEmployee: number; // Deducted from employee
  gosiEmployer: number; // Paid by employer (for reporting)
  sanedEmployee: number;
  sanedEmployer: number;
  currency: string; // "SAR"
  notes: string;
}
```

**Indexes:**

- `{ orgId: 1, periodStart: 1, periodEnd: 1 }` - For period queries
- `{ orgId: 1, status: 1 }`
- `{ orgId: 1, employeeId: 1, periodStart: 1 }` - For payslip queries

### 3. Leave Models

**Collections**: `hr_leave_types`, `hr_leave_entitlements`, `hr_leave_requests`

```typescript
interface ILeaveType {
  orgId: ObjectId;
  code: string; // "ANNUAL", "SICK", "HAJJ"
  name: string;
  nameAr: string;
  annualDays: number; // 21 (standard), 30 (after 5 years)
  carryoverDays: number; // Max to roll over
  requiresApproval: boolean;
  requiresDocuments: boolean; // Sick leave → medical cert
  isPaid: boolean;
}

interface ILeaveEntitlement {
  orgId: ObjectId;
  employeeId: ObjectId;
  leaveTypeCode: string; // "ANNUAL"
  periodStart: Date; // 2025-01-01
  periodEnd: Date; // 2025-12-31
  openingBalance: number; // Carried over from 2024
  accrued: number; // Earned in 2025
  taken: number; // Used in 2025
  balance: number; // opening + accrued - taken
}

interface ILeaveRequest {
  orgId: ObjectId;
  employeeId: ObjectId;
  leaveTypeCode: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  attachments: [{ name: string; url: string }];
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  submittedAt: Date;
  approvalChain: [
    {
      approverId: ObjectId;
      level: number; // 1 = Manager, 2 = HR
      decidedAt: Date;
      decision: "APPROVED" | "REJECTED";
      comments: string;
    },
  ];
}
```

### 4. Attendance Models

**Collections**: `hr_attendance_logs`, `hr_timesheets`, `hr_shifts`, `hr_roster`

```typescript
interface IAttendanceLog {
  orgId: ObjectId;
  employeeId: ObjectId;
  timestamp: Date;
  type: "IN" | "OUT";
  source: "MOBILE_APP" | "KIOSK" | "MANUAL" | "GPS";
  location: { lat: number; lng: number; address: string };
  deviceId: string;
  notes: string;
  createdBy: ObjectId; // For manual entries
}

interface ITimesheet {
  orgId: ObjectId;
  employeeId: ObjectId;
  weekStart: Date;
  weekEnd: Date;
  regularHours: number;
  overtimeHours: number; // Feeds into payroll
  nightDiffHours: number;
  holidayHours: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  approvedBy: ObjectId;
  approvedAt: Date;
}

interface IShift {
  orgId: ObjectId;
  name: string; // "Morning Shift"
  startTime: string; // "08:00"
  endTime: string; // "17:00"
  breakMinutes: number; // 60
  daysOfWeek: number[]; // [0,1,2,3,4] = Sunday-Thursday
  site: string; // For FM
  color: string; // For calendar display
}

interface IRoster {
  orgId: ObjectId;
  employeeId: ObjectId;
  shiftId: ObjectId;
  date: Date; // 2025-10-31
  site: string;
}
```

---

## API Endpoints

### Base URL: `/api/hr`

### Authentication

All endpoints require NextAuth session:

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.orgId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Employee Management

#### `GET /api/hr/employees`

**Description**: List all employees for the organization

**Query Parameters:**

- `page` (number, default: 1): Page number
- `limit` (number, default: 50): Records per page
- `status` (string): Filter by status (ACTIVE, ON_LEAVE, etc.)
- `department` (string): Filter by department
- `search` (string): Search firstName, lastName, email, employeeCode

**Response:**

```json
{
  "employees": [
    {
      "_id": "67234abc...",
      "employeeCode": "EMP-001",
      "firstName": "Ahmed",
      "lastName": "Al-Saud",
      "email": "ahmed@company.sa",
      "status": "ACTIVE",
      "employment": {
        "jobTitle": "HVAC Technician",
        "department": "Maintenance",
        "joinDate": "2024-01-15T00:00:00.000Z"
      },
      "compensation": {
        "baseSalary": 8000,
        "housingAllowance": 2000,
        "currency": "SAR"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "pages": 3
  }
}
```

#### `POST /api/hr/employees`

**Description**: Create a new employee

**Request Body:**

```json
{
  "employeeCode": "EMP-128",
  "firstName": "Mohammed",
  "lastName": "Al-Qahtani",
  "email": "mohammed@company.sa",
  "phone": "+966501234567",
  "nationality": "Saudi",
  "employment": {
    "jobTitle": "Plumber",
    "department": "Maintenance",
    "site": "PROP-042",
    "joinDate": "2025-11-01",
    "contractType": "PERMANENT"
  },
  "compensation": {
    "baseSalary": 7000,
    "housingAllowance": 1800,
    "transportAllowance": 500,
    "gosiApplicable": true,
    "sanedApplicable": true
  },
  "bank": {
    "bankName": "Al Rajhi Bank",
    "iban": "SA4420000000123456789012"
  }
}
```

**Response:** `201 Created`

```json
{
  "_id": "67234def...",
  "employeeCode": "EMP-128",
  "firstName": "Mohammed",
  "status": "ONBOARDING",
  "createdAt": "2025-10-31T12:00:00.000Z"
}
```

### Payroll Processing

#### `GET /api/hr/payroll/runs`

**Description**: List all payroll runs

**Query Parameters:**

- `status` (string): Filter by status (DRAFT, CALCULATED, APPROVED, LOCKED)

**Response:**

```json
{
  "runs": [
    {
      "_id": "67235abc...",
      "periodStart": "2025-10-01T00:00:00.000Z",
      "periodEnd": "2025-10-31T00:00:00.000Z",
      "status": "CALCULATED",
      "totalGross": 1250000,
      "totalNet": 1125000,
      "totalGOSI": 112500,
      "employeeCount": 127,
      "createdAt": "2025-10-28T10:00:00.000Z"
    }
  ]
}
```

#### `POST /api/hr/payroll/runs`

**Description**: Create a new DRAFT payroll run

**Request Body:**

```json
{
  "periodStart": "2025-11-01",
  "periodEnd": "2025-11-30",
  "cutOffDate": "2025-11-25"
}
```

**Response:** `201 Created`

```json
{
  "_id": "67236abc...",
  "periodStart": "2025-11-01T00:00:00.000Z",
  "periodEnd": "2025-11-30T00:00:00.000Z",
  "status": "DRAFT",
  "totalGross": 0,
  "totalNet": 0,
  "employeeCount": 0
}
```

#### `POST /api/hr/payroll/runs/[id]/calculate`

**Description**: Calculate payroll for all active employees

**Request Body:** None (idempotent operation)

**Process:**

1. Fetches all ACTIVE employees
2. For each employee:
   - Fetches approved timesheets for the period
   - Calculates overtime hours
   - Determines GOSI applicability (Saudi national + new entrant check)
   - Calls `calculateNetPay()` service
   - Creates immutable `Payslip` record
3. Updates `PayrollRun` totals and status → CALCULATED

**Response:**

```json
{
  "run": {
    "_id": "67236abc...",
    "status": "CALCULATED",
    "totalGross": 1275000,
    "totalNet": 1147500,
    "totalGOSI": 114750,
    "totalSANED": 9562.5,
    "employeeCount": 127
  },
  "summary": {
    "employeesProcessed": 127,
    "totalGross": 1275000,
    "totalNet": 1147500,
    "totalGOSI": 114750,
    "totalSANED": 9562.5
  }
}
```

#### `GET /api/hr/payroll/runs/[id]/export/wps`

**Description**: Generate WPS/Mudad compliant CSV file

**Response Headers:**

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="WPS_ORG123_202511.csv"`
- `X-File-Checksum: a3f2b9c...` (SHA-256)
- `X-Record-Count: 127`
- `X-Total-Net-Salary: 1147500.00`

**CSV Content:**

```csv
Employee ID,Employee Name,Bank Code,IBAN,Basic Salary,Housing Allowance,Other Allowances,Total Deductions,Net Salary,Salary Month,Work Days
EMP-001,Ahmed Al-Saud,80,SA4480000000123456789012,8000.00,2000.00,500.00,902.50,9597.50,2025-11,30
EMP-002,Mohammed Al-Qahtani,20,SA4420000000987654321098,7000.00,1800.00,500.00,788.63,8511.37,2025-11,30
...
```

**Validation Errors:**

```json
{
  "error": "WPS file validation failed",
  "errors": [
    "Row 5: Invalid IBAN format: SA4480 (expected 24 characters)",
    "Row 12: Net salary is zero or negative"
  ],
  "warnings": ["Row 8: Salary month format should be YYYY-MM"]
}
```

---

## KSA Compliance

### GOSI (General Organization for Social Insurance)

**Applicable to:** Saudi nationals (and some GCC nationals)

**Contribution Rates (2025):**

| Component                    | Employee Rate | Employer Rate | Base            |
| ---------------------------- | ------------- | ------------- | --------------- |
| **Annuities (Pension)**      | 9.0%          | 9.0%          | Basic + Housing |
| **Annuities (New Entrants)** | 9.5%          | 9.5%          | Basic + Housing |
| **SANED (Unemployment)**     | 0.75%         | 0.75%         | Basic + Housing |
| **Occupational Hazards**     | 0%            | 2.0%          | Basic + Housing |

**New Entrant Rates:**

- Employees who joined **after January 1, 2024** are subject to gradual increases
- 2025: 9.5% each side
- 2026: 10.0% each side
- 2027: 10.5% each side
- 2028: 11.0% each side (final rate)

**Non-Saudi Nationals:**

- Only Occupational Hazards apply: 2% (employer pays)
- No Annuities or SANED

**Implementation:**

```typescript
// In ksaPayrollService.ts
export function calculateGOSI(
  baseSalary: number,
  housingAllowance: number,
  isSaudiNational: boolean,
  isNewEntrant: boolean = false // Joined 2024+
): GOSICalculation {
  const gosiBase = baseSalary + housingAllowance;

  if (!isSaudiNational) {
    // Non-Saudi: Only OH (employer pays)
    return {
      employeeDeduction: 0,
      employerContribution: gosiBase * 0.02,
      breakdown: { occupationalHazards: gosiBase * 0.02, ... }
    };
  }

  // Saudi National
  const annuitiesRate = isNewEntrant
    ? { employee: 0.095, employer: 0.095 }
    : { employee: 0.09, employer: 0.09 };

  const annuitiesEmployee = gosiBase * annuitiesRate.employee;
  const annuitiesEmployer = gosiBase * annuitiesRate.employer;
  const sanedEmployee = gosiBase * 0.0075;
  const sanedEmployer = gosiBase * 0.0075;
  const occHazards = gosiBase * 0.02;

  return {
    employeeDeduction: annuitiesEmployee + sanedEmployee,
    employerContribution: annuitiesEmployer + sanedEmployer + occHazards,
    breakdown: { annuitiesEmployee, annuitiesEmployer, sanedEmployee, sanedEmployer, occupationalHazards: occHazards }
  };
}
```

### Overtime Calculation

**HRSD Regulation:** Overtime pay = Hourly wage + 50% of basic salary (= 150% of hourly)

**Hourly Rate Formula:**

```
Hourly Rate = Monthly Basic Salary / 30 days / 8 hours
```

**Example:**

- Monthly Basic: SAR 10,000
- Hourly Rate: 10,000 / 30 / 8 = SAR 41.67
- Overtime Rate: 41.67 × 1.5 = **SAR 62.50 per hour**
- 10 hours OT: 62.50 × 10 = **SAR 625**

**Implementation:**

```typescript
// In ksaPayrollService.ts
export const OVERTIME_MULTIPLIER = 1.5;

export function calculateOvertimePay(
  monthlyBasic: number,
  overtimeHours: number,
): number {
  const hourlyRate = monthlyBasic / 30 / 8;
  return (
    Math.round(hourlyRate * OVERTIME_MULTIPLIER * overtimeHours * 100) / 100
  );
}
```

### End of Service Benefits (ESB)

**Formula:**

- **First 5 years**: 0.5 months of salary per year
- **After 5 years**: 1 month of salary per year

**Adjustments for Resignation:**

- **< 2 years**: No ESB
- **2-5 years**: 1/3 of calculated ESB
- **5-10 years**: 2/3 of calculated ESB
- **10+ years**: Full ESB

**Termination (by employer):** Full ESB regardless of tenure

**Example:**

- Employee with 7 years service, last monthly salary SAR 12,000
- Calculation:
  - First 5 years: 5 × 0.5 = 2.5 months
  - Next 2 years: 2 × 1.0 = 2.0 months
  - **Total: 4.5 months = SAR 54,000**
- If resignation (7 years): 2/3 × 54,000 = **SAR 36,000**

**Implementation:**

```typescript
// In ksaPayrollService.ts
export function calculateESB(
  lastMonthlySalary: number,
  serviceYears: number,
  serviceMonths: number = 0,
  serviceDays: number = 0,
  reason: 'RESIGNATION' | 'TERMINATION' | 'END_OF_CONTRACT' = 'TERMINATION'
): ESBCalculation {
  const totalYears = serviceYears + serviceMonths / 12 + serviceDays / 365;
  const first5Years = Math.min(5, totalYears);
  const after5Years = Math.max(0, totalYears - 5);
  const baseMonths = (first5Years * 0.5) + (after5Years * 1.0);

  let adjustmentFactor = 1.0; // Termination = full

  if (reason === 'RESIGNATION') {
    if (totalYears < 2) adjustmentFactor = 0;
    else if (totalYears < 5) adjustmentFactor = 1/3;
    else if (totalYears < 10) adjustmentFactor = 2/3;
    else adjustmentFactor = 1.0;
  }

  const finalMonths = baseMonths * adjustmentFactor;
  const amount = lastMonthlySalary * finalMonths;

  return { totalMonths: finalMonths, amount, breakdown: { ... } };
}
```

### WPS (Wage Protection System) / Mudad

**Requirement:** All Saudi employers must upload payroll data to Mudad platform within **30 days** of payment date

**File Format:** CSV with specific columns (bank-dependent)

**Standard Format:**

```
Employee ID, Employee Name, Bank Code, IBAN, Basic Salary, Housing Allowance, Other Allowances, Total Deductions, Net Salary, Salary Month, Work Days
```

**IBAN Validation:**

- Format: `SA` + 2 check digits + 2 bank code + 18 account number = **24 characters**
- Example: `SA4480000000123456789012`

**Bank Codes (Major Banks):**

- Al Rajhi: `80`
- NCB/SNB: `10`
- Riyad Bank: `20`
- Samba: `40`
- SABB: `55`

**Implementation:**

```typescript
// In wpsService.ts
export function generateWPSFile(
  payslips: IPayslip[],
  organizationId: string,
  periodMonth: string, // "2025-11"
): WPSFile {
  const records = payslips.map((slip) => ({
    employeeId: slip.employeeCode,
    employeeName: slip.employeeName,
    bankCode: extractBankCode(slip.iban), // From IBAN
    iban: slip.iban,
    basicSalary: slip.earnings.find((e) => e.code === "BASIC")?.amount || 0,
    housingAllowance:
      slip.earnings.find((e) => e.code === "HOUSING")?.amount || 0,
    otherAllowances: slip.earnings
      .filter((e) => !["BASIC", "HOUSING"].includes(e.code))
      .reduce((sum, e) => sum + e.amount, 0),
    totalDeductions: slip.deductions.reduce((sum, d) => sum + d.amount, 0),
    netSalary: slip.netPay,
    salaryMonth: periodMonth,
    workDays: 30, // Or calculate from attendance
  }));

  const csvContent = generateCsvFromRecords(records);
  const checksum = generateChecksum(csvContent);

  return {
    filename: `WPS_${organizationId}_${periodMonth.replace("-", "")}.csv`,
    content: csvContent,
    checksum,
    recordCount: records.length,
    totalNetSalary: records.reduce((sum, r) => sum + r.netSalary, 0),
    generatedAt: new Date(),
  };
}
```

### Document Expiry Compliance

**Critical Documents:**

- **Iqama (Residence Permit):** Expiry triggers visa violation fines (SAR 10,000+)
- **Passport:** Required for Iqama renewal
- **Work Visa:** Required for legal employment
- **Contracts:** Qiwa digital contracts (attestation required)

**Alert System:**

- **90 days before expiry**: Yellow warning
- **30 days before expiry**: Orange alert + email to HR
- **7 days before expiry**: Red alert + email to Admin
- **Expired**: Block employee from scheduling/payroll

**Implementation:**

```typescript
// In Employee model
documents: [
  {
    type: "IQAMA" | "PASSPORT" | "CONTRACT" | "VISA",
    number: string,
    issueDate: Date,
    expiryDate: Date, // INDEXED for fast queries
    fileUrl: string,
  },
];

// Cron job (daily at 2 AM)
async function checkDocumentExpiry() {
  const now = new Date();
  const warn90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const warn30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const warn7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find employees with expiring documents
  const expiring = await Employee.find({
    "documents.expiryDate": { $lte: warn90, $gte: now },
  });

  for (const employee of expiring) {
    for (const doc of employee.documents) {
      const daysUntilExpiry = Math.ceil(
        (doc.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysUntilExpiry <= 7) {
        // Create urgent ticket in Support module
        await createComplianceTicket(employee, doc, "URGENT");
      } else if (daysUntilExpiry <= 30) {
        await createComplianceTicket(employee, doc, "HIGH");
      } else if (daysUntilExpiry <= 90) {
        await createComplianceTicket(employee, doc, "NORMAL");
      }
    }
  }
}
```

---

## System Behavior

### Payroll Workflow (State Machine)

```
DRAFT ──(Calculate)──> CALCULATED ──(Approve)──> APPROVED ──(Lock)──> LOCKED
  │                                                                       │
  └──────────────────────(Delete)───────────────────────────────────────┘
                        (Only in DRAFT)
```

**State Transitions:**

1. **DRAFT → CALCULATED**
   - Trigger: Admin clicks "Calculate Payroll"
   - Action: POST `/api/hr/payroll/runs/[id]/calculate`
   - Process:
     - Fetch all ACTIVE employees
     - For each: fetch timesheets, calculate pay, create payslip
     - Update run totals
     - Move to CALCULATED
   - Validation: None (idempotent)

2. **CALCULATED → APPROVED**
   - Trigger: Admin/HR Manager clicks "Approve"
   - Action: POST `/api/hr/payroll/runs/[id]/approve` (future endpoint)
   - Process:
     - Check DoA (Delegation of Authority) levels
     - Record approver ID and timestamp
     - Move to APPROVED
   - Validation: User must have approval permission

3. **APPROVED → LOCKED**
   - Trigger: Admin clicks "Lock & Finalize"
   - Action: POST `/api/hr/payroll/runs/[id]/lock` (future endpoint)
   - Process:
     - Mark all payslips as immutable
     - Generate audit log
     - Trigger GL posting (Finance integration)
     - Move to LOCKED
   - **IMMUTABLE**: No changes allowed after this point

4. **LOCKED → WPS Export**
   - Trigger: Admin clicks "Export WPS"
   - Action: GET `/api/hr/payroll/runs/[id]/export/wps`
   - Process:
     - Fetch all payslips
     - Generate CSV
     - Validate format
     - Return downloadable file
   - Note: Can export multiple times (for re-uploads)

### Employee Lifecycle

```
                        ┌──────────────┐
                        │  ONBOARDING  │ (New hire, documents pending)
                        └──────┬───────┘
                               │ (All docs uploaded + approval)
                               ▼
                        ┌──────────────┐
                  ┌────▶│    ACTIVE    │◀────┐
                  │     └──────┬───────┘     │
                  │            │             │
    (Leave ends)  │            │ (Leave      │ (Suspension lifted)
                  │            │  approved)  │
                  │            ▼             │
                  │     ┌──────────────┐     │
                  └─────│   ON_LEAVE   │     │
                        └──────────────┘     │
                                             │
                        ┌──────────────┐     │
                        │  SUSPENDED   │─────┘
                        └──────┬───────┘
                               │ (Termination)
                               ▼
                        ┌──────────────┐
                        │  TERMINATED  │ (Final, ESB calculated)
                        └──────────────┘
```

**Status Effects:**

- **ONBOARDING**:
  - Excluded from payroll
  - Cannot clock in/out
  - Can upload documents
  - Transition: Manual (HR clicks "Activate")

- **ACTIVE**:
  - Included in payroll
  - Can clock in/out
  - Can submit leave requests
  - Can be scheduled for shifts

- **ON_LEAVE**:
  - Excluded from payroll (unless paid leave)
  - Cannot clock in/out
  - Cannot be scheduled
  - Automatic transition when leave ends

- **SUSPENDED**:
  - Excluded from payroll
  - Cannot access system
  - Used for disciplinary cases
  - Transition: Manual (Admin)

- **TERMINATED**:
  - **Final state** (no transitions out)
  - Triggers ESB calculation
  - All assets marked for return
  - Last payslip includes ESB + final dues
  - Document retention per labor law (5 years)

### Leave Approval Workflow

```
Employee submits ──> Manager reviews ──> HR reviews ──> Approved
  (PENDING)           (Level 1)          (Level 2)      (APPROVED)
                         │                   │
                         │                   │
                         ▼                   ▼
                     REJECTED            REJECTED
```

**Approval Chain Configuration (per org):**

```typescript
interface ApprovalChain {
  levels: [
    {
      level: number;
      approverRole: "MANAGER" | "HR" | "ADMIN";
      autoApproveIfBelow: number; // Days (e.g., 1-day leave auto-approved by manager)
    },
  ];
}

// Example: Small org (simple)
{
  levels: [
    { level: 1, approverRole: "MANAGER", autoApproveIfBelow: 2 },
    { level: 2, approverRole: "HR", autoApproveIfBelow: 0 },
  ];
}

// Example: Enterprise (complex DoA)
{
  levels: [
    { level: 1, approverRole: "MANAGER", autoApproveIfBelow: 3 },
    { level: 2, approverRole: "DEPARTMENT_HEAD", autoApproveIfBelow: 7 },
    { level: 3, approverRole: "HR", autoApproveIfBelow: 0 },
    { level: 4, approverRole: "CFO", autoApproveIfBelow: 0 }, // For >14 days
  ];
}
```

---

## Integration Points

### 1. Work Orders Module

**Use Case**: Technician dispatch based on skills and availability

**Integration:**

- HR provides: `Employee.skills[]`, `Employee.status`, `Roster` (scheduled shifts)
- Work Orders queries: Available technicians with required skills for a site
- Example: "Find HVAC technicians available on 2025-11-05 at Site PROP-042"

**API:**

```typescript
GET /api/hr/employees/available
Query: ?skills=HVAC,Plumbing&date=2025-11-05&site=PROP-042
Response: [{ employeeId, name, skills, currentLocation }]
```

### 2. Finance Module

**Use Case**: Payroll GL posting

**Integration:**

- After payroll LOCK, HR posts journal entries to Finance
- Debit: Salaries Expense
- Credit: GOSI Payable (Employer), Bank/Cash

**Example Journal Entry:**

```
Debit:  Salaries Expense                 SAR 1,275,000
Credit: GOSI Payable (Employee)                        SAR 90,562
Credit: GOSI Payable (Employer)                        SAR 114,750
Credit: Bank - Payroll Account                       SAR 1,069,688
```

**API:**

```typescript
POST /api/finance/journal-entries
Body: {
  source: 'PAYROLL',
  sourceId: 'payrollRunId',
  entries: [
    { account: '5100', debit: 1275000, description: 'October Payroll' },
    { account: '2100', credit: 90562, description: 'GOSI Employee Payable' },
    { account: '2101', credit: 114750, description: 'GOSI Employer Payable' },
    { account: '1010', credit: 1069688, description: 'Bank - Payroll Disbursement' }
  ]
}
```

### 4. Automation Hooks (Phase 3)

**Leave & Attendance Notifications**

- Every leave status transition (`APPROVED`, `REJECTED`, `CANCELLED`) queues a job on the shared notifications worker (`souq:notifications`) via `HrNotificationService`.
- Attendance entries flagged as `ABSENT` or `LATE` automatically emit alerts so FM/HR supervisors see exceptions without polling the grid.
- Consumers (push/email/SMS) enrich the payload (employee, approver, dates, shift info) using the same translation keys referenced in `contexts/TranslationContext.tsx`.

**Payroll → Finance Posting**

- When a payroll run moves to `LOCKED`, `PayrollFinanceIntegration` builds a balanced journal entry and posts it through `postingService`.
- Default Chart of Accounts mapping (configurable per org):
  - Debit `5200` Salaries Expense (base + allowances + employer GOSI)
  - Credit `2100` GOSI Employee Payable, `2101` GOSI Employer Payable
  - Credit `2105` Other Deductions (loans, advances, etc.)
  - Credit `1010` Payroll Bank for net pay
- Once the journal is posted, the run is stamped with `financePosted`, `financeJournalId`, and `financeReference` to prevent duplicates and aid audits.

### 3. Compliance Module

**Use Case**: Document expiry alerts

**Integration:**

- HR creates "Compliance Ticket" when document expires in < 30 days
- Ticket assigned to HR group
- SLA: 7 days to resolve (renew document)

**Example Ticket:**

```
Title: "Iqama Expiry Alert - Ahmed Al-Saud (EMP-001)"
Description: "Iqama #2345678901 expires on 2025-11-15 (14 days)"
Priority: HIGH
Assigned To: HR Group
Due Date: 2025-11-08 (7 days SLA)
```

### 5. Marketplace Module

**Use Case**: Third-party payroll services (e.g., payroll outsourcing)

**Integration:**

- Marketplace lists "Payroll Service Providers"
- Corporate can subscribe to provider
- HR exports payroll data to provider via API
- Provider returns WPS file + payslips

**Future Enhancement:** Direct API integration with Jisr, Bayzat, etc.

---

## Security & Multi-Tenancy

### Authentication & Authorization

**Session Validation:**

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.orgId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Role-Based Access Control (RBAC):**

| Role            | Permissions                              |
| --------------- | ---------------------------------------- |
| **SUPER_ADMIN** | Full system access (all orgs)            |
| **ADMIN**       | Full org access (own org only)           |
| **HR_MANAGER**  | Employee CRUD, Payroll, Leave approval   |
| **MANAGER**     | View team, Approve leave (Level 1)       |
| **EMPLOYEE**    | Self-service: View payslip, Submit leave |

**Subscription-Based Feature Gating:**

```typescript
// Example: Payroll endpoint (Mid+ tier only)
if (!session.user.subscription.includes("PAYROLL")) {
  return NextResponse.json(
    {
      error: "Payroll feature not available in your subscription tier",
      upgradeUrl: "/settings/subscription",
    },
    { status: 402 },
  ); // Payment Required
}
```

### Data Isolation

**Org-Scoping (All Queries):**

```typescript
// Always filter by orgId
const employees = await Employee.find({
  orgId: session.user.orgId,
  status: "ACTIVE",
});
const runs = await PayrollRun.find({
  orgId: session.user.orgId,
  status: "DRAFT",
});
```

**Compound Indexes:**

```typescript
// Enforce uniqueness within org (not globally)
{ orgId: 1, employeeCode: 1 } // unique
{ orgId: 1, email: 1 }
{ orgId: 1, periodStart: 1, periodEnd: 1 } // for payroll runs
```

### Sensitive Data Protection

**IBAN Masking:**

```typescript
// Store full IBAN in DB
bank: { iban: 'SA4480000000123456789012' }

// Return masked to API (except WPS export)
bank: { iban: 'SA44****5012', bankName: 'Al Rajhi' }
```

**Document Access Control:**

```typescript
// Documents (Iqama, Passport) stored in S3 with signed URLs
// Only accessible by:
// - Employee (self)
// - HR_MANAGER
// - ADMIN
```

### Audit Trail

**Immutable Records:**

- Payslips: Cannot be edited after creation
- PayrollRun (LOCKED): No changes allowed
- LeaveRequest: Status changes logged in `approvalChain`

**Change Log (Future):**

```typescript
interface AuditLog {
  orgId: ObjectId;
  userId: ObjectId;
  action: "CREATE" | "UPDATE" | "DELETE";
  resource: "Employee" | "PayrollRun" | "LeaveRequest";
  resourceId: ObjectId;
  changes: { field: string; oldValue: any; newValue: any }[];
  timestamp: Date;
  ipAddress: string;
}
```

---

## Deployment Guide

### Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fixzit?retryWrites=true&w=majority

# Authentication
NEXTAUTH_URL=https://fixzit.sa
NEXTAUTH_SECRET=<random-256-bit-key>

# AWS S3 (for document storage)
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_S3_BUCKET=fixzit-hr-documents
AWS_REGION=me-south-1 # Bahrain region (closest to Saudi)

# Email (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
SMTP_FROM=noreply@fixzit.sa

# Feature Flags
ENABLE_HR_MODULE=true
ENABLE_WPS_EXPORT=true
```

### Database Indexes (Production)

Run these commands in MongoDB shell after deployment:

```javascript
// Employee indexes
db.hr_employees.createIndex({ orgId: 1, employeeCode: 1 }, { unique: true });
db.hr_employees.createIndex({ orgId: 1, email: 1 });
db.hr_employees.createIndex({ orgId: 1, status: 1 });
db.hr_employees.createIndex({ "documents.expiryDate": 1 });

// Payroll indexes
db.hr_payroll_runs.createIndex({ orgId: 1, periodStart: 1, periodEnd: 1 });
db.hr_payroll_runs.createIndex({ orgId: 1, status: 1 });
db.hr_payslips.createIndex({ orgId: 1, payrollRunId: 1 });
db.hr_payslips.createIndex({ orgId: 1, employeeId: 1, periodStart: 1 });

// Leave indexes
db.hr_leave_requests.createIndex({ orgId: 1, employeeId: 1, status: 1 });
db.hr_leave_requests.createIndex({ orgId: 1, startDate: 1, endDate: 1 });
db.hr_leave_entitlements.createIndex(
  { orgId: 1, employeeId: 1, leaveTypeCode: 1, periodStart: 1 },
  { unique: true },
);

// Attendance indexes
db.hr_attendance_logs.createIndex({ orgId: 1, employeeId: 1, timestamp: 1 });
db.hr_timesheets.createIndex(
  { orgId: 1, employeeId: 1, weekStart: 1 },
  { unique: true },
);
db.hr_roster.createIndex(
  { orgId: 1, date: 1, employeeId: 1 },
  { unique: true },
);
```

### Cron Jobs

**Document Expiry Check (Daily at 2 AM Asia/Riyadh):**

```bash
0 2 * * * /app/scripts/check-document-expiry.sh
```

**Leave Accrual (Monthly on 1st at 1 AM):**

```bash
0 1 1 * * /app/scripts/accrue-leave.sh
```

**WPS Reminder (Monthly on 25th at 9 AM):**

```bash
0 9 25 * * /app/scripts/wps-reminder.sh
```

### Performance Optimization

**Database Sharding (for 10,000+ employees):**

```javascript
// Shard key: orgId (distribute by organization)
sh.shardCollection("fixzit.hr_employees", { orgId: 1 });
sh.shardCollection("fixzit.hr_payslips", { orgId: 1, periodStart: 1 });
```

**MongoDB Caching (for frequent queries):**

```typescript
// Cache employee list for 5 minutes
const cacheKey = `hr:employees:${orgId}:${status}`;
const cached = await mongodb.get(cacheKey);
if (cached) return JSON.parse(cached);

const employees = await Employee.find({ orgId, status }).lean();
await mongodb.setex(cacheKey, 300, JSON.stringify(employees));
return employees;
```

---

## Appendices

### A. Saudi Labor Law Quick Reference

- **Overtime**: 150% of hourly basic (Article 107)
- **Annual Leave**: 21 days (min), 30 days after 5 years (Article 109)
- **Sick Leave**: 30 days full, 60 days @ 75%, 30 days unpaid (Article 117)
- **Hajj Leave**: Employee can take unpaid leave once during employment (Article 112)
- **Maternity Leave**: 10 weeks (6 weeks post-birth) (Article 151)
- **ESB**: 0.5 month/year (first 5 years), 1 month/year (after) (Article 84)

### B. GOSI Contact Information

- **Website**: https://www.gosi.gov.sa/en
- **Toll-Free**: 8001243344
- **Contribution Calculator**: https://www.gosi.gov.sa/GOSIOnline/Calculators

### C. WPS/Mudad Resources

- **Mudad Platform**: https://mudad.hrsd.gov.sa
- **WPS Guide**: https://hrsd.gov.sa/en/wps
- **File Specifications**: Contact your bank for exact format

### D. Fixzit Support

- **Technical Support**: support@fixzit.sa
- **Sales Inquiries**: sales@fixzit.sa
- **Documentation**: https://docs.fixzit.sa/hr-module
- **API Reference**: https://api.fixzit.sa/docs

---

## Document Control

| Version | Date       | Author          | Changes         |
| ------- | ---------- | --------------- | --------------- |
| 1.0     | 2025-10-31 | Fixzit Dev Team | Initial release |

**Confidentiality Notice:** This document contains proprietary information of Fixzit and is intended solely for the use of authorized personnel. Unauthorized distribution or reproduction is prohibited.

---

**End of Document**
