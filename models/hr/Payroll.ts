import mongoose, { Schema, model, models, Model } from 'mongoose';

// A single line item on a payslip (earning or deduction)
interface IPayslipItem {
  code: string; // e.g., 'BASIC', 'HOUSING', 'GOSI_DEDUCT', 'OT_150'
  name: string; // Display name
  nameAr?: string; // Arabic name
  amount: number; // Amount in SAR
}

// Immutable record of an employee's pay for one payroll run
export interface IPayslip extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  payrollRunId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  employeeCode: string; // Denormalized for WPS export
  employeeName: string; // Denormalized for WPS export
  iban: string; // Denormalized from Employee.bank
  periodStart: Date;
  periodEnd: Date;
  earnings: IPayslipItem[];
  deductions: IPayslipItem[];
  grossPay: number;
  netPay: number;
  gosiEmployee: number; // Employee GOSI contribution
  gosiEmployer: number; // Employer GOSI contribution (for reporting)
  sanedEmployee: number; // Employee SANED
  sanedEmployer: number; // Employer SANED
  currency: string; // SAR
  notes?: string;
  createdAt: Date;
}

// The master record for a pay period
export interface IPayrollRun extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  cutOffDate: Date; // Last date to include attendance/leave
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'LOCKED'; // State machine
  totalGross: number;
  totalNet: number;
  totalGOSI: number; // Total GOSI (employee + employer)
  totalSANED: number;
  employeeCount: number;
  wpsBatchId?: string; // Mudad batch ID after WPS export
  wpsFileUrl?: string; // S3 URL of generated WPS file
  approvedBy?: mongoose.Types.ObjectId; // User who approved
  approvedAt?: Date;
  lockedBy?: mongoose.Types.ObjectId; // User who locked (immutable after this)
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayslipItemSchema = new Schema<IPayslipItem>({
  code: { type: String, required: true },
  name: { type: String, required: true },
  nameAr: String,
  amount: { type: Number, required: true },
}, { _id: false });

const PayslipSchema = new Schema<IPayslip>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    payrollRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeCode: { type: String, required: true },
    employeeName: { type: String, required: true },
    iban: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    earnings: [PayslipItemSchema],
    deductions: [PayslipItemSchema],
    grossPay: { type: Number, required: true },
    netPay: { type: Number, required: true },
    gosiEmployee: { type: Number, default: 0 },
    gosiEmployer: { type: Number, default: 0 },
    sanedEmployee: { type: Number, default: 0 },
    sanedEmployer: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    notes: String,
  },
  {
    timestamps: true,
    collection: 'hr_payslips',
  }
);

// Indexes for querying
PayslipSchema.index({ orgId: 1, employeeId: 1, periodStart: 1 });

const PayrollRunSchema = new Schema<IPayrollRun>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    cutOffDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['DRAFT', 'CALCULATED', 'APPROVED', 'LOCKED'], 
      default: 'DRAFT',
      index: true 
    },
    totalGross: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    totalGOSI: { type: Number, default: 0 },
    totalSANED: { type: Number, default: 0 },
    employeeCount: { type: Number, default: 0 },
    wpsBatchId: String,
    wpsFileUrl: String,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedAt: Date,
  },
  {
    timestamps: true,
    collection: 'hr_payroll_runs',
  }
);

// Compound index for period queries
PayrollRunSchema.index({ orgId: 1, periodStart: 1, periodEnd: 1 });
PayrollRunSchema.index({ orgId: 1, status: 1 });

export const Payslip = models.Payslip || model<IPayslip>('Payslip', PayslipSchema);
export const PayrollRun = models.PayrollRun || model<IPayrollRun>('PayrollRun', PayrollRunSchema);
