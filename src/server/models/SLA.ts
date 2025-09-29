import { Schema, model, models, InferSchemaType } from "mongoose";

const SLAType = ["RESPONSE_TIME", "RESOLUTION_TIME", "UPTIME", "AVAILABILITY", "MAINTENANCE"] as const;
const SLAPriority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const SLASchema = new Schema({
  tenantId: { type: String, required: true, index: true },

  // Basic Information
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },

  // Classification
  type: { type: String, enum: SLAType, required: true, index: true },
  category: { type: String, required: true }, // Work Orders, Maintenance, etc.
  priority: { type: String, enum: SLAPriority, required: true, index: true },

  // Targets
  targets: {
    responseTime: Number, // hours
    resolutionTime: Number, // hours
    uptime: Number, // percentage
    availability: Number, // percentage
    maintenanceWindow: {
      enabled: Boolean,
      startTime: String, // HH:MM
      endTime: String, // HH:MM
      days: [String] // ["monday", "tuesday", etc.]
    }
  },

  // Escalation Rules
  escalation: {
    levels: [{
      level: Number,
      trigger: Number, // hours after start
      action: String, // EMAIL, SMS, PHONE, ASSIGN, ESCALATE
      recipients: [String], // user IDs or roles
      message: String
    }],
    autoAssignment: {
      enabled: Boolean,
      rules: [{
        condition: String, // "workload < 5" or "skill matches"
        assignTo: String, // user ID or role
        priority: Number
      }]
    }
  },

  // Metrics & KPIs
  metrics: {
    targetResponseTime: Number, // hours
    targetResolutionTime: Number, // hours
    targetUptime: Number, // percentage
    targetAvailability: Number, // percentage
    penalties: {
      responseTime: Number, // cost per hour over target
      resolutionTime: Number, // cost per hour over target
      downtime: Number, // cost per hour of downtime
      perIncident: Number // fixed cost per incident
    }
  },

  // Coverage
  coverage: {
    properties: [String], // property IDs
    assets: [String], // asset IDs
    services: [String], // service types
    locations: [{
      city: String,
      region: String,
      radius: Number // km
    }],
    timeframes: [{
      start: String, // HH:MM
      end: String, // HH:MM
      days: [String] // ["monday", "tuesday", etc.]
    }]
  },

  // Service Levels
  serviceLevels: [{
    name: String,
    description: String,
    priority: SLAPriority,
    targets: {
      responseTime: Number,
      resolutionTime: Number,
      availability: Number
    },
    cost: Number, // monthly cost
    features: [String] // Additional features
  }],

  // Monitoring
  monitoring: {
    enabled: Boolean,
    intervals: {
      response: Number, // minutes
      resolution: Number, // minutes
      uptime: Number // minutes
    },
    alerts: {
      response: Boolean,
      resolution: Boolean,
      uptime: Boolean,
      performance: Boolean
    }
  },

  // Reporting
  reporting: {
    frequency: String, // DAILY, WEEKLY, MONTHLY
    recipients: [String], // user IDs or emails
    include: {
      performance: Boolean,
      incidents: Boolean,
      trends: Boolean,
      recommendations: Boolean
    }
  },

  // Compliance
  compliance: {
    standards: [String], // ISO 9001, ISO 27001, etc.
    regulations: [String], // KSA specific regulations
    audits: [{
      type: String,
      scheduled: Date,
      completed: Date,
      result: String, // PASS, FAIL, CONDITIONAL
      findings: [String],
      actions: [String]
    }]
  },

  // Status & Approval
  status: {
    type: String,
    enum: ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "EXPIRED"],
    default: "DRAFT",
    index: true
  },
  approval: {
    required: Boolean,
    approvedBy: String,
    approvedAt: Date,
    reviewedBy: String,
    reviewedAt: Date,
    notes: String
  },

  // Metadata
  tags: [String],
  customFields: Schema.Types.Mixed,

  createdBy: { type: String, required: true },
  updatedBy: String
}, {
  timestamps: true
});

// Indexes for performance
SLASchema.index({ tenantId: 1, type: 1 });
SLASchema.index({ tenantId: 1, status: 1 });
SLASchema.index({ tenantId: 1, priority: 1 });

export type SLADoc = InferSchemaType<typeof SLASchema>;

// Check if we're using mock database
export const SLA = models.SLA || model("SLA", SLASchema);
