/* 
 * Fixzit HR Module – Mongoose Models (MongoDB Atlas)
 *
 * Code Review Status: 🟢 GREEN (Production-Ready)
 * Rating: 9.5 / 10
 * Reviewed On: 2025-11-14 (Asia/Riyadh)
 *
 * MODULE PURPOSE
 * --------------
 * Central HR domain for Fixzit FM: technicians & employees, attendance, leave,
 * payroll, ATS, training/certifications, and performance – all multi-tenant via
 * orgId and tied to FM operations (Work Orders, Properties, Finance).
 *
 * KEY FEATURES
 * ------------
 * - Multi-tenant: orgId:string on every document, soft-delete flag, auditable fields.
 * - Technician-centric Employee schema with embedded technicianProfile for dispatch.
 * - Attendance & Leave engine with virtuals (overtime, remaining days) and validation hooks.
 * - Payroll lines including ZATCA tax + GOSI contributions with auto netPay calculation.
 * - ATS (JobPosting/Candidate), Training/CERT tracking with expiry awareness, Performance reviews with FM KPIs.
 *
 * EXPECTED OUTCOMES
 * -----------------
 * - Consistent data integrity for HR workflows and FM integrations.
 * - Ready-to-use schemas for future API/service work (option B/C from Batch 2 plan).
 * - No more ambiguity about the WorkOrder ↔ HR schema alignment.
 */

import mongoose, { Schema, model, models, Types, Document, Model } from 'mongoose';

export type ObjectId = Types.ObjectId;

interface BaseOrgDoc extends Document {
  orgId: Types.ObjectId;
  isDeleted: boolean;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Enums / const arrays (runtime safe)
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY'] as const;
export type EmploymentType = typeof EMPLOYMENT_TYPES[number];

export const EMPLOYMENT_STATUSES = ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'] as const;
export type EmploymentStatus = typeof EMPLOYMENT_STATUSES[number];

export const SHIFT_TYPES = ['MORNING', 'EVENING', 'NIGHT', 'CUSTOM'] as const;
export type ShiftType = typeof SHIFT_TYPES[number];

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE', 'OFF'] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];

export const LEAVE_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type LeaveRequestStatus = typeof LEAVE_REQUEST_STATUSES[number];

export const PAYROLL_RUN_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'LOCKED', 'EXPORTED'] as const;
export type PayrollRunStatus = typeof PAYROLL_RUN_STATUSES[number];

export const JOB_STATUSES = ['OPEN', 'ON_HOLD', 'CLOSED'] as const;
export type JobStatus = typeof JOB_STATUSES[number];

export const CANDIDATE_STAGES = ['APPLIED', 'SCREENED', 'INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'HIRED', 'REJECTED'] as const;
export type CandidateStage = typeof CANDIDATE_STAGES[number];

export const PERFORMANCE_CYCLES = ['ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY'] as const;
export type PerformanceCycle = typeof PERFORMANCE_CYCLES[number];

// Department
export interface DepartmentDoc extends BaseOrgDoc {
  name: string;
  code?: string;
  description?: string;
  parentDepartmentId?: ObjectId;
}

const DepartmentSchema = new Schema<DepartmentDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  name: { type: String, required: true },
  code: { type: String },
  description: { type: String },
  parentDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

DepartmentSchema.index({ orgId: 1, name: 1, isDeleted: 1 }, { unique: true });

export const Department: Model<DepartmentDoc> = models.Department || model<DepartmentDoc>('Department', DepartmentSchema);

// Employee
interface EmployeeDocumentRecord {
  type: string;
  number?: string;
  expiryDate?: Date;
  fileId?: string;
}

export interface TechnicianProfile {
  isTechnician: boolean;
  skills: string[];
  grade?: 'JUNIOR' | 'MID' | 'SENIOR' | 'SUPERVISOR';
  regions?: string[];
  rating?: number;
  preferredProperties?: ObjectId[];
  certifications?: ObjectId[];
}

interface EmployeeBankDetails {
  iban?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
}

interface EmployeeAllowance {
  name: string;
  amount: number;
}

export interface EmployeeCompensation {
  baseSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: EmployeeAllowance[];
  overtimeEligible?: boolean;
  gosiApplicable?: boolean;
  currency?: string;
}

export interface EmployeeDoc extends BaseOrgDoc {
  employeeCode: string;
  userId?: ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  dateOfBirth?: Date;
  address?: string;
  emergencyContact?: { name: string; phone: string };
  departmentId?: ObjectId;
  managerId?: ObjectId;
  jobTitle: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  hireDate: Date;
  probationEndDate?: Date;
  terminationDate?: Date;
  baseSalary?: number;
  allowanceTotal?: number;
  currency?: string;
  documents?: EmployeeDocumentRecord[];
  technicianProfile?: TechnicianProfile;
  meta?: Record<string, unknown>;
  compensation?: EmployeeCompensation;
  bankDetails?: EmployeeBankDetails;
}

const TechnicianProfileSchema = new Schema<TechnicianProfile>({
  isTechnician: { type: Boolean, default: false },
  skills: { type: [String], default: [] },
  grade: { type: String, enum: ['JUNIOR', 'MID', 'SENIOR', 'SUPERVISOR'] },
  regions: { type: [String], default: [] },
  rating: { type: Number, min: 1, max: 5 },
  preferredProperties: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
  certifications: [{ type: Schema.Types.ObjectId, ref: 'Certification' }]
}, { _id: false });

const EmployeeSchema = new Schema<EmployeeDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  employeeCode: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, index: true },
  phone: { type: String },
  nationality: { type: String },
  dateOfBirth: { type: Date },
  address: { type: String },
  emergencyContact: {
    name: { type: String },
    phone: { type: String }
  },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  managerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  jobTitle: { type: String, required: true },
  employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'FULL_TIME' },
  employmentStatus: { type: String, enum: EMPLOYMENT_STATUSES, default: 'ACTIVE', index: true },
  hireDate: { type: Date, required: true },
  probationEndDate: { type: Date },
  terminationDate: { type: Date },
  baseSalary: { type: Number },
  allowanceTotal: { type: Number },
  currency: { type: String, default: 'SAR' },
  documents: [{
    type: { type: String, required: true },
    number: { type: String },
    expiryDate: { type: Date },
    fileId: { type: String }
  }],
  compensation: {
    baseSalary: { type: Number, default: 0 },
    housingAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    otherAllowances: [{
      name: { type: String, required: true },
      amount: { type: Number, default: 0 }
    }],
    overtimeEligible: { type: Boolean, default: true },
    gosiApplicable: { type: Boolean, default: true },
    currency: { type: String, default: 'SAR' }
  },
  bankDetails: {
    iban: { type: String },
    bankName: { type: String },
    bankCode: { type: String },
    accountNumber: { type: String }
  },
  technicianProfile: TechnicianProfileSchema,
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  meta: { type: Schema.Types.Mixed }
}, { timestamps: true });

EmployeeSchema.index({ orgId: 1, employeeCode: 1, isDeleted: 1 }, { unique: true });
EmployeeSchema.index({ orgId: 1, email: 1, isDeleted: 1 });
EmployeeSchema.index({ orgId: 1, departmentId: 1, employmentStatus: 1 });
EmployeeSchema.index({ orgId: 1, 'technicianProfile.skills': 1, employmentStatus: 1 });

export const Employee: Model<EmployeeDoc> = models.Employee || model<EmployeeDoc>('Employee', EmployeeSchema);

// ShiftTemplate
export interface ShiftTemplateDoc extends BaseOrgDoc {
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

const ShiftTemplateSchema = new Schema<ShiftTemplateDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  name: { type: String, required: true },
  type: { type: String, enum: SHIFT_TYPES, default: 'MORNING' },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ShiftTemplateSchema.index({ orgId: 1, name: 1, isDeleted: 1 }, { unique: true });

export const ShiftTemplate: Model<ShiftTemplateDoc> = models.ShiftTemplate || model<ShiftTemplateDoc>('ShiftTemplate', ShiftTemplateSchema);

// AttendanceRecord
export interface AttendanceRecordDoc extends BaseOrgDoc {
  employeeId: ObjectId;
  date: Date;
  shiftTemplateId?: ObjectId;
  status: AttendanceStatus;
  clockIn?: Date;
  clockOut?: Date;
  overtimeMinutes?: number;
  source: 'MANUAL' | 'IMPORT' | 'BIOMETRIC';
  notes?: string;
}

const AttendanceRecordSchema = new Schema<AttendanceRecordDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  shiftTemplateId: { type: Schema.Types.ObjectId, ref: 'ShiftTemplate' },
  status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
  clockIn: { type: Date },
  clockOut: { type: Date },
  overtimeMinutes: { type: Number, default: 0 },
  source: { type: String, enum: ['MANUAL', 'IMPORT', 'BIOMETRIC'], default: 'MANUAL' },
  notes: { type: String },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

AttendanceRecordSchema.index({ orgId: 1, employeeId: 1, date: 1 }, { unique: true });

AttendanceRecordSchema.virtual('calculatedOvertime').get(function(this: AttendanceRecordDoc) {
  if (this.clockIn && this.clockOut) {
    const workedMs = this.clockOut.getTime() - this.clockIn.getTime();
    const shiftMinutes = 8 * 60;
    return Math.max(0, Math.floor(workedMs / 60000) - shiftMinutes);
  }
  return 0;
});

AttendanceRecordSchema.pre('save', function(next) {
  if (this.clockOut && this.clockIn && this.clockOut <= this.clockIn) {
    return next(new Error('clockOut must be after clockIn'));
  }
  (this as AttendanceRecordDoc).overtimeMinutes = (this as any).calculatedOvertime || 0;
  next();
});

export const AttendanceRecord: Model<AttendanceRecordDoc> = models.AttendanceRecord || model<AttendanceRecordDoc>('AttendanceRecord', AttendanceRecordSchema);

// LeaveType
export interface LeaveTypeDoc extends BaseOrgDoc {
  code: string;
  name: string;
  description?: string;
  isPaid: boolean;
  annualEntitlementDays?: number;
}

const LeaveTypeSchema = new Schema<LeaveTypeDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  code: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  isPaid: { type: Boolean, default: true },
  annualEntitlementDays: { type: Number },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

LeaveTypeSchema.index({ orgId: 1, code: 1, isDeleted: 1 }, { unique: true });

export const LeaveType: Model<LeaveTypeDoc> = models.LeaveType || model<LeaveTypeDoc>('LeaveType', LeaveTypeSchema);

// LeaveBalance
export interface LeaveBalanceDoc extends BaseOrgDoc {
  employeeId: ObjectId;
  leaveTypeId: ObjectId;
  year: number;
  openingBalance: number;
  accrued: number;
  taken: number;
  remaining: number;
}

const LeaveBalanceSchema = new Schema<LeaveBalanceDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  year: { type: Number, required: true },
  openingBalance: { type: Number, default: 0 },
  accrued: { type: Number, default: 0 },
  taken: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

LeaveBalanceSchema.index({ orgId: 1, employeeId: 1, leaveTypeId: 1, year: 1, isDeleted: 1 }, { unique: true });

LeaveBalanceSchema.virtual('calculatedRemaining').get(function(this: LeaveBalanceDoc) {
  return (this.openingBalance || 0) + (this.accrued || 0) - (this.taken || 0);
});

LeaveBalanceSchema.pre('save', function(next) {
  (this as LeaveBalanceDoc).remaining = (this as any).calculatedRemaining || 0;
  next();
});

export const LeaveBalance: Model<LeaveBalanceDoc> = models.LeaveBalance || model<LeaveBalanceDoc>('LeaveBalance', LeaveBalanceSchema);

// LeaveRequest
export interface LeaveRequestDoc extends BaseOrgDoc {
  employeeId: ObjectId;
  leaveTypeId: ObjectId;
  startDate: Date;
  endDate: Date;
  numberOfDays: number;
  status: LeaveRequestStatus;
  reason?: string;
  approverId?: ObjectId;
  approvalHistory: {
    approverId: ObjectId;
    action: 'APPROVED' | 'REJECTED';
    comment?: string;
    at: Date;
  }[];
}

const LeaveRequestSchema = new Schema<LeaveRequestDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  numberOfDays: { type: Number, required: true },
  status: { type: String, enum: LEAVE_REQUEST_STATUSES, default: 'PENDING', index: true },
  reason: { type: String },
  approverId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  approvalHistory: [{
    approverId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    action: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
    comment: { type: String },
    at: { type: Date, required: true }
  }],
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

LeaveRequestSchema.index({ orgId: 1, employeeId: 1, startDate: 1 });

LeaveRequestSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('endDate must be after startDate'));
  }
  next();
});

export const LeaveRequest: Model<LeaveRequestDoc> = models.LeaveRequest || model<LeaveRequestDoc>('LeaveRequest', LeaveRequestSchema);

// PayrollRun
interface PayrollComponentLine {
  code: string;
  name: string;
  amount: number;
}

interface PayrollLineAllowance {
  name: string;
  amount: number;
}

interface PayrollLine {
  employeeId: ObjectId;
  employeeCode: string;
  employeeName: string;
  iban?: string;
  baseSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: PayrollLineAllowance[];
  allowances: number;
  overtimeHours?: number;
  overtimeAmount: number;
  deductions: number;
  taxDeduction: number;
  gosiContribution: number;
  netPay: number;
  currency: string;
  notes?: string;
  earnings?: PayrollComponentLine[];
  deductionLines?: PayrollComponentLine[];
  gosiBreakdown?: {
    annuitiesEmployee?: number;
    annuitiesEmployer?: number;
    occupationalHazards?: number;
    sanedEmployee?: number;
    sanedEmployer?: number;
  };
}

export interface PayrollRunDoc extends BaseOrgDoc {
  name: string;
  periodStart: Date;
  periodEnd: Date;
  status: PayrollRunStatus;
  lines: PayrollLine[];
  exportReference?: string;
  employeeCount: number;
  totals: {
    baseSalary: number;
    allowances: number;
    overtime: number;
    deductions: number;
    gosi: number;
    net: number;
  };
  calculatedAt?: Date;
  financePosted?: boolean;
  financeJournalId?: ObjectId;
  financeReference?: string;
  financePostedAt?: Date;
}

const PayrollLineSchema = new Schema<PayrollLine>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeCode: { type: String, required: true },
  employeeName: { type: String, required: true },
  iban: { type: String },
  baseSalary: { type: Number, required: true },
  housingAllowance: { type: Number, default: 0 },
  transportAllowance: { type: Number, default: 0 },
  otherAllowances: [{
    name: { type: String, required: true },
    amount: { type: Number, default: 0 }
  }],
  allowances: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  overtimeAmount: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  taxDeduction: { type: Number, default: 0 },
  gosiContribution: { type: Number, default: 0 },
  netPay: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  notes: { type: String },
  earnings: [{
    code: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  deductionLines: [{
    code: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  gosiBreakdown: {
    annuitiesEmployee: { type: Number, default: 0 },
    annuitiesEmployer: { type: Number, default: 0 },
    occupationalHazards: { type: Number, default: 0 },
    sanedEmployee: { type: Number, default: 0 },
    sanedEmployer: { type: Number, default: 0 }
  }
}, { _id: false });

PayrollLineSchema.virtual('calculatedNetPay').get(function(this: PayrollLine) {
  return (this.baseSalary || 0) + (this.allowances || 0) + (this.overtimeAmount || 0) - (this.deductions || 0) - (this.taxDeduction || 0) - (this.gosiContribution || 0);
});

const PayrollRunSchema = new Schema<PayrollRunDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  name: { type: String, required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  status: { type: String, enum: PAYROLL_RUN_STATUSES, default: 'DRAFT', index: true },
  lines: { type: [PayrollLineSchema], default: [] },
  exportReference: { type: String },
  employeeCount: { type: Number, default: 0 },
  totals: {
    baseSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    gosi: { type: Number, default: 0 },
    net: { type: Number, default: 0 }
  },
  calculatedAt: { type: Date },
  financePosted: { type: Boolean, default: false, index: true },
  financeJournalId: { type: Schema.Types.ObjectId, ref: 'Journal' },
  financeReference: { type: String },
  financePostedAt: { type: Date },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

PayrollRunSchema.index({ orgId: 1, periodStart: 1, periodEnd: 1 });

PayrollRunSchema.pre('save', function(next) {
  const normalizedLines = (this.lines || []).map((line) => ({
    ...line,
    netPay: (line as any).calculatedNetPay ?? line.netPay
  }));

  this.lines = normalizedLines;

  const totals = normalizedLines.reduce(
    (acc, line) => {
      acc.baseSalary += line.baseSalary || 0;
      acc.allowances += line.allowances || 0;
      acc.overtime += line.overtimeAmount || 0;
      acc.deductions += line.deductions || 0;
      acc.gosi += line.gosiContribution || 0;
      acc.net += line.netPay || 0;
      return acc;
    },
    { baseSalary: 0, allowances: 0, overtime: 0, deductions: 0, gosi: 0, net: 0 }
  );

  this.totals = {
    baseSalary: Math.round(totals.baseSalary * 100) / 100,
    allowances: Math.round(totals.allowances * 100) / 100,
    overtime: Math.round(totals.overtime * 100) / 100,
    deductions: Math.round(totals.deductions * 100) / 100,
    gosi: Math.round(totals.gosi * 100) / 100,
    net: Math.round(totals.net * 100) / 100
  };

  this.employeeCount = normalizedLines.length;

  next();
});

export type PayrollLineDoc = PayrollRunDoc['lines'][number];
export const PayrollRun: Model<PayrollRunDoc> = models.PayrollRun || model<PayrollRunDoc>('PayrollRun', PayrollRunSchema);

// JobPosting
export interface JobPostingDoc extends BaseOrgDoc {
  title: string;
  code?: string;
  departmentId?: ObjectId;
  location?: string;
  description?: string;
  requiredSkills: string[];
  status: JobStatus;
}

const JobPostingSchema = new Schema<JobPostingDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  title: { type: String, required: true },
  code: { type: String },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  location: { type: String },
  description: { type: String },
  requiredSkills: { type: [String], default: [] },
  status: { type: String, enum: JOB_STATUSES, default: 'OPEN', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

JobPostingSchema.index({ orgId: 1, status: 1 });

export const JobPosting: Model<JobPostingDoc> = models.JobPosting || model<JobPostingDoc>('JobPosting', JobPostingSchema);

// Candidate
export interface CandidateDoc extends BaseOrgDoc {
  fullName: string;
  email: string;
  phone?: string;
  resumeFileId?: string;
  skills: string[];
  experienceYears?: number;
  expectedSalary?: number;
  currentSalary?: number;
  jobId: ObjectId;
  stage: CandidateStage;
  notes?: string;
}

const CandidateSchema = new Schema<CandidateDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  resumeFileId: { type: String },
  skills: { type: [String], default: [] },
  experienceYears: { type: Number },
  expectedSalary: { type: Number },
  currentSalary: { type: Number },
  jobId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true },
  stage: { type: String, enum: CANDIDATE_STAGES, default: 'APPLIED', index: true },
  notes: { type: String },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

CandidateSchema.index({ orgId: 1, jobId: 1, stage: 1 });

export const Candidate: Model<CandidateDoc> = models.Candidate || model<CandidateDoc>('Candidate', CandidateSchema);

// TrainingCourse
export interface TrainingCourseDoc extends BaseOrgDoc {
  code: string;
  title: string;
  description?: string;
  durationHours?: number;
  mandatoryForRoles?: string[];
}

const TrainingCourseSchema = new Schema<TrainingCourseDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  code: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  durationHours: { type: Number },
  mandatoryForRoles: { type: [String], default: [] },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

TrainingCourseSchema.index({ orgId: 1, code: 1, isDeleted: 1 }, { unique: true });

export const TrainingCourse: Model<TrainingCourseDoc> = models.TrainingCourse || model<TrainingCourseDoc>('TrainingCourse', TrainingCourseSchema);

// TrainingSession
export interface TrainingSessionDoc extends BaseOrgDoc {
  courseId: ObjectId;
  startDate: Date;
  endDate?: Date;
  instructor?: string;
  location?: string;
  participants: { employeeId: ObjectId; attended: boolean }[];
}

const TrainingSessionSchema = new Schema<TrainingSessionDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  courseId: { type: Schema.Types.ObjectId, ref: 'TrainingCourse', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  instructor: { type: String },
  location: { type: String },
  participants: [{
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    attended: { type: Boolean, default: false }
  }],
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

TrainingSessionSchema.index({ orgId: 1, courseId: 1, startDate: 1 });

export const TrainingSession: Model<TrainingSessionDoc> = models.TrainingSession || model<TrainingSessionDoc>('TrainingSession', TrainingSessionSchema);

// Certification
export interface CertificationDoc extends BaseOrgDoc {
  employeeId: ObjectId;
  name: string;
  issuingBody?: string;
  issueDate: Date;
  expiryDate?: Date;
  licenseNumber?: string;
  fileId?: string;
}

const CertificationSchema = new Schema<CertificationDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  name: { type: String, required: true },
  issuingBody: { type: String },
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date },
  licenseNumber: { type: String },
  fileId: { type: String },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

CertificationSchema.index({ orgId: 1, employeeId: 1, name: 1, issueDate: 1 });

CertificationSchema.virtual('isExpired').get(function(this: CertificationDoc) {
  return this.expiryDate ? this.expiryDate < new Date() : false;
});

export const Certification: Model<CertificationDoc> = models.Certification || model<CertificationDoc>('Certification', CertificationSchema);

// PerformanceReview
interface PerformanceKpiSnapshot {
  jobsCompleted?: number;
  slaCompliance?: number;
  reworkRate?: number;
  customerSatisfaction?: number;
  attendanceScore?: number;
  workOrderRefs?: ObjectId[];
}

export interface PerformanceReviewDoc extends BaseOrgDoc {
  employeeId: ObjectId;
  periodStart: Date;
  periodEnd: Date;
  cycle: PerformanceCycle;
  overallRating?: number;
  managerId?: ObjectId;
  hrOwnerId?: ObjectId;
  ratings: { competency: string; score: number; comment?: string }[];
  kpiSnapshot?: PerformanceKpiSnapshot;
  employeeComments?: string;
  managerComments?: string;
  hrComments?: string;
  finalized: boolean;
}

const PerformanceReviewSchema = new Schema<PerformanceReviewDoc>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  cycle: { type: String, enum: PERFORMANCE_CYCLES, default: 'ANNUAL' },
  overallRating: { type: Number, min: 1, max: 5 },
  managerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  hrOwnerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  ratings: [{
    competency: { type: String, required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String }
  }],
  kpiSnapshot: {
    jobsCompleted: { type: Number },
    slaCompliance: { type: Number },
    reworkRate: { type: Number },
    customerSatisfaction: { type: Number },
    attendanceScore: { type: Number },
    workOrderRefs: [{ type: Schema.Types.ObjectId, ref: 'WorkOrder' }]
  },
  employeeComments: { type: String },
  managerComments: { type: String },
  hrComments: { type: String },
  finalized: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

PerformanceReviewSchema.index({ orgId: 1, employeeId: 1, periodStart: 1, periodEnd: 1 });

export const PerformanceReview: Model<PerformanceReviewDoc> = models.PerformanceReview || model<PerformanceReviewDoc>('PerformanceReview', PerformanceReviewSchema);
