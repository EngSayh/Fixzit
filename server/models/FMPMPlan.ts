import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from '@/src/types/mongoose-compat';
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

/**
 * FMPMPlan Model - Preventive Maintenance Plans
 * 
 * Defines recurring maintenance schedules that auto-generate work orders:
 * - Equipment servicing (AC, elevators, generators)
 * - Building inspections (fire safety, electrical)
 * - Landscaping and cleaning
 * - Compliance checks
 * 
 * Features:
 * - Flexible recurrence patterns (daily, weekly, monthly, quarterly, yearly)
 * - Asset/equipment linkage
 * - Auto-WO generation with lead time
 * - Skip generation on holidays
 * - Cost budgeting and tracking
 */

const RecurrencePattern = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"] as const;
const PMStatus = ["ACTIVE", "INACTIVE", "SUSPENDED", "EXPIRED"] as const;
const AssetCategory = ["HVAC", "ELECTRICAL", "PLUMBING", "ELEVATOR", "GENERATOR", "FIRE_SAFETY", "LANDSCAPING", "CLEANING", "OTHER"] as const;

const FMPMPlanSchema = new Schema({
  // Multi-tenancy
  // orgId: added by plugin

  // PM Plan Identification
  planNumber: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: AssetCategory, required: true },
  
  // Location & Asset
  propertyId: { type: String, required: true },
  unitId: String,
  assetId: String, // Equipment/asset being maintained
  assetName: String,
  assetLocation: String, // "Roof", "Basement", "Unit 401", etc.
  
  // Recurrence Configuration
  recurrencePattern: { type: String, enum: RecurrencePattern, required: true },
  recurrenceInterval: { type: Number, default: 1 }, // Every N days/weeks/months
  recurrenceDaysOfWeek: [Number], // For weekly: [1,3,5] = Mon, Wed, Fri
  recurrenceDayOfMonth: Number, // For monthly: 15 = 15th of each month
  recurrenceMonths: [Number], // For yearly: [3,6,9,12] = quarterly
  
  // Schedule Dates
  startDate: { type: Date, required: true },
  endDate: Date, // If null, runs indefinitely
  nextScheduledDate: { type: Date, required: true },
  lastGeneratedDate: Date,
  
  // Work Order Generation Settings
  woLeadTimeDays: { type: Number, default: 3 }, // Generate WO 3 days before due
  woTitle: { type: String, required: true },
  woDescription: String,
  woCategory: { type: String, required: true },
  woPriority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM" },
  woEstimatedDuration: Number, // in minutes
  
  // Assignment
  autoAssign: { type: Boolean, default: false },
  assignedTeamId: String,
  assignedVendorId: String,
  assignedUserId: String,
  
  // Checklist Template
  checklist: [{
    itemId: { type: String, default: () => Date.now().toString() },
    description: String,
    required: { type: Boolean, default: true },
    order: Number
  }],
  
  // Cost Budgeting
  estimatedCost: Number,
  budgetCode: String,
  costCenter: String,
  
  // Status & Control
  status: { type: String, enum: PMStatus, required: true, default: 'ACTIVE' },
  skipHolidays: { type: Boolean, default: true },
  skipWeekends: { type: Boolean, default: false },
  
  // Generation History
  generationHistory: [{
    generatedAt: Date,
    workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    workOrderNumber: String,
    scheduledFor: Date,
    generatedBy: String,
    status: String // 'SUCCESS', 'FAILED', 'SKIPPED'
  }],
  
  // Statistics
  stats: {
    totalGenerated: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    totalCancelled: { type: Number, default: 0 },
    averageCost: Number,
    averageCompletionDays: Number,
    lastCompletionDate: Date
  },
  
  // Notifications
  notifyOnGeneration: { type: Boolean, default: true },
  notificationRecipients: [String], // userIds to notify
  
  // Audit
  createdBy: String,
  updatedBy: String,
  suspendedBy: String,
  suspendedAt: Date,
  suspensionReason: String
}, {
  timestamps: true,
  collection: 'fm_pm_plans'
});

// Plugins
FMPMPlanSchema.plugin(tenantIsolationPlugin);
FMPMPlanSchema.plugin(auditPlugin);

// Indexes
FMPMPlanSchema.index({ orgId: 1, planNumber: 1 });
FMPMPlanSchema.index({ orgId: 1, propertyId: 1, status: 1 });
FMPMPlanSchema.index({ orgId: 1, status: 1, nextScheduledDate: 1 }); // For cron job
FMPMPlanSchema.index({ orgId: 1, assetId: 1 });
FMPMPlanSchema.index({ orgId: 1, category: 1 });

// Pre-save: Generate plan number
FMPMPlanSchema.pre('save', function(next) {
  if (this.isNew && !this.planNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    this.planNumber = `PM-${year}${month}-${timestamp}`;
  }
  next();
});

// Method: Calculate next scheduled date
FMPMPlanSchema.methods.calculateNextSchedule = function(): Date {
  const current = this.nextScheduledDate || this.startDate;
  const next = new Date(current);
  
  switch (this.recurrencePattern) {
    case 'DAILY':
      next.setDate(next.getDate() + this.recurrenceInterval);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + (7 * this.recurrenceInterval));
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + this.recurrenceInterval);
      if (this.recurrenceDayOfMonth) {
        next.setDate(this.recurrenceDayOfMonth);
      }
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + (3 * this.recurrenceInterval));
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + this.recurrenceInterval);
      break;
  }
  
  // Skip weekends if configured
  if (this.skipWeekends) {
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  }
  
  return next;
};

// Method: Check if plan should generate WO now
FMPMPlanSchema.methods.shouldGenerateNow = function(): boolean {
  if (this.status !== 'ACTIVE') return false;
  if (this.endDate && new Date() > this.endDate) return false;
  
  const now = new Date();
  const leadTime = this.woLeadTimeDays * 24 * 60 * 60 * 1000;
  const generateByDate = new Date(this.nextScheduledDate.getTime() - leadTime);
  
  return now >= generateByDate && (!this.lastGeneratedDate || this.lastGeneratedDate < generateByDate);
};

// Method: Record WO generation
FMPMPlanSchema.methods.recordGeneration = function(
  workOrderId: Schema.Types.ObjectId,
  workOrderNumber: string,
  status: string = 'SUCCESS'
) {
  this.generationHistory.push({
    generatedAt: new Date(),
    workOrderId,
    workOrderNumber,
    scheduledFor: this.nextScheduledDate,
    generatedBy: 'System',
    status
  });
  
  this.lastGeneratedDate = new Date();
  this.stats.totalGenerated += 1;
  this.nextScheduledDate = this.calculateNextSchedule();
  
  return this.save();
};

export type FMPMPlanDoc = InferSchemaType<typeof FMPMPlanSchema>;

export const FMPMPlan: Model<FMPMPlanDoc> = getModel<FMPMPlanDoc>('FMPMPlan', FMPMPlanSchema);
