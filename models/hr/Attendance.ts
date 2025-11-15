import mongoose, { Schema, model, models, Model } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

// Clock-in/out log
export interface IAttendanceLog extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  timestamp: Date;
  type: 'IN' | 'OUT';
  source: 'MOBILE_APP' | 'KIOSK' | 'MANUAL' | 'GPS';
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  deviceId?: string;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId; // For manual entries
  createdAt: Date;
}

// Approved timesheet (feeds into payroll)
export interface ITimesheet extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  weekStart: Date;
  weekEnd: Date;
  regularHours: number;
  overtimeHours: number;
  nightDiffHours: number; // Night differential if applicable
  holidayHours: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Shift template for rostering (time-based template, not location-specific)
export interface IShift extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string;
  startTime: string; // HH:mm format (e.g., "08:00")
  endTime: string; // HH:mm format (e.g., "17:00")
  breakMinutes: number;
  daysOfWeek: number[]; // 0=Sunday, 6=Saturday
  // Removed 'site': Shifts are templates. Site assignment is on Roster.
  color?: string; // For calendar display
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Assigned shift (roster entry)
export interface IRoster extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  shiftId: mongoose.Types.ObjectId;
  date: Date; // Specific date of assignment
  site?: string;
  notes?: string;
  createdAt: Date;
}

const AttendanceLogSchema = new Schema<IAttendanceLog>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    source: { type: String, enum: ['MOBILE_APP', 'KIOSK', 'MANUAL', 'GPS'], required: true },
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
    deviceId: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'hr_attendance_logs',
  }
);

AttendanceLogSchema.index({ orgId: 1, employeeId: 1, timestamp: 1 });

const TimesheetSchema = new Schema<ITimesheet>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    regularHours: { type: Number, default: 0, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    nightDiffHours: { type: Number, default: 0, min: 0 },
    holidayHours: { type: Number, default: 0, min: 0 },
    status: { 
      type: String, 
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], 
      default: 'DRAFT',
      index: true 
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    notes: String,
  },
  {
    timestamps: true,
    collection: 'hr_timesheets',
  }
);

TimesheetSchema.index({ orgId: 1, employeeId: 1, weekStart: 1 }, { unique: true });

const ShiftSchema = new Schema<IShift>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    breakMinutes: { type: Number, default: 60 },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    // Removed 'site' field - belongs on Roster, not Shift template
    color: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'hr_shifts',
  }
);

const RosterSchema = new Schema<IRoster>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    date: { type: Date, required: true, index: true },
    site: String, // Site assignment happens here (Roster), not on Shift template
    notes: String,
  },
  {
    timestamps: true,
    collection: 'hr_roster',
  }
);

// Removed unique index on { orgId, date, employeeId } to allow split shifts
// (e.g., morning shift 08:00-12:00 + evening shift 18:00-22:00 on same day)
// Overlap validation should be handled at application/service layer
RosterSchema.index({ orgId: 1, date: 1, site: 1 }); // Optimize "who's working at this site today?"

export const AttendanceLog = getModel<IAttendanceLog>('AttendanceLog', AttendanceLogSchema);
export const Timesheet = getModel<ITimesheet>('Timesheet', TimesheetSchema);
export const Shift = getModel<IShift>('Shift', ShiftSchema);
export const Roster = getModel<IRoster>('Roster', RosterSchema);
