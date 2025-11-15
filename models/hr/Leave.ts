import mongoose, { Schema, model, models, Model } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

// Leave type configuration (Annual, Sick, Hajj, etc.)
export interface ILeaveType extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  code: string; // ANNUAL, SICK, MATERNITY, HAJJ, UNPAID
  name: string;
  nameAr?: string;
  annualDays: number; // Standard entitlement per year
  carryoverDays: number; // Max days that can roll over
  requiresApproval: boolean;
  requiresDocuments: boolean; // e.g., sick leave needs medical certificate
  isPaid: boolean;
  color?: string; // For calendar display
  createdAt: Date;
  updatedAt: Date;
}

// Employee's leave entitlement for a period
export interface ILeaveEntitlement extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeCode: string;
  periodStart: Date; // Typically Jan 1
  periodEnd: Date; // Typically Dec 31
  openingBalance: number; // Carried over from previous period
  accrued: number; // Earned this period
  taken: number; // Used this period
  balance: number; // Available: opening + accrued - taken
  createdAt: Date;
  updatedAt: Date;
}

// Leave request submitted by employee
export interface ILeaveRequest extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeCode: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
  reasonAr?: string;
  attachments: { name: string; url: string }[];
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submittedAt?: Date;
  approvalChain: {
    approverId: mongoose.Types.ObjectId;
    level: number; // 1st level (manager), 2nd level (HR), etc.
    decidedAt?: Date;
    decision?: 'APPROVED' | 'REJECTED';
    comments?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const LeaveTypeSchema = new Schema<ILeaveType>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    code: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    nameAr: String,
    annualDays: { type: Number, required: true, min: 0 },
    carryoverDays: { type: Number, default: 0 },
    requiresApproval: { type: Boolean, default: true },
    requiresDocuments: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: true },
    color: String,
  },
  {
    timestamps: true,
    collection: 'hr_leave_types',
  }
);

LeaveTypeSchema.index({ orgId: 1, code: 1 }, { unique: true });

const LeaveEntitlementSchema = new Schema<ILeaveEntitlement>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeCode: { type: String, required: true, uppercase: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    openingBalance: { type: Number, default: 0 },
    accrued: { type: Number, default: 0 },
    taken: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'hr_leave_entitlements',
  }
);

LeaveEntitlementSchema.index({ orgId: 1, employeeId: 1, leaveTypeCode: 1, periodStart: 1 }, { unique: true });

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeCode: { type: String, required: true, uppercase: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true, min: 0 },
    reason: String,
    reasonAr: String,
    attachments: [{ name: String, url: String }],
    status: { 
      type: String, 
      enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], 
      default: 'DRAFT',
      index: true 
    },
    submittedAt: Date,
    approvalChain: [{
      approverId: { type: Schema.Types.ObjectId, ref: 'User' },
      level: Number,
      decidedAt: Date,
      decision: { type: String, enum: ['APPROVED', 'REJECTED'] },
      comments: String,
    }],
  },
  {
    timestamps: true,
    collection: 'hr_leave_requests',
  }
);

LeaveRequestSchema.index({ orgId: 1, employeeId: 1, status: 1 });
LeaveRequestSchema.index({ orgId: 1, startDate: 1, endDate: 1 });

export const LeaveType = getModel<ILeaveType>('LeaveType', LeaveTypeSchema);
export const LeaveEntitlement = getModel<ILeaveEntitlement>('LeaveEntitlement', LeaveEntitlementSchema);
export const LeaveRequest = getModel<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
