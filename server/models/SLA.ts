/**
 * @module server/models/SLA
 * @description Service Level Agreement (SLA) definitions for work order response and resolution targets.
 *              Enforces tiered service commitments with escalation rules and performance tracking.
 *
 * @features
 * - SLA types: RESPONSE_TIME, RESOLUTION_TIME, UPTIME, AVAILABILITY, MAINTENANCE
 * - Priority tiers: LOW, MEDIUM, HIGH, CRITICAL
 * - Target metrics (response time, resolution time, uptime percentage)
 * - Penalty rules for SLA breaches (credits, discounts, escalation)
 * - Business hours configuration (24/7 vs 9-5 vs custom)
 * - Holiday and exclusion day handling
 * - Category-based SLA assignments (Work Orders, Maintenance, Support Tickets)
 * - Escalation paths for overdue tickets
 * - Performance tracking (met/breached/near-breach counts)
 *
 * @indexes
 * - { orgId: 1, code: 1 } (unique) — Unique SLA code per tenant
 * - { orgId: 1, category: 1, priority: 1 } — SLA lookup by category and priority
 * - { orgId: 1, type: 1 } — Query by SLA type
 * - { orgId: 1, status: 1 } — Filter active/inactive SLAs
 *
 * @relationships
 * - Referenced by WorkOrder model (workOrder.sla field)
 * - Referenced by SupportTicket model (ticket.sla field)
 * - Integrates with notification system for SLA breach alerts
 * - Links to AuditLog for SLA modification tracking
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - timestamps: createdAt, updatedAt from Mongoose
 * - SLA changes logged in AuditLog for compliance
 */
import { Schema, InferSchemaType, Types } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from "@/types/mongoose-compat";

const SLAType = [
  "RESPONSE_TIME",
  "RESOLUTION_TIME",
  "UPTIME",
  "AVAILABILITY",
  "MAINTENANCE",
] as const;
const SLAPriority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const SLASchema = new Schema(
  {
    // Basic Information
    code: { type: String, required: true }, // FIXED: removed unique: true (will be tenant-scoped)
    name: { type: String, required: true },
    description: { type: String },

    // Classification
    type: { type: String, enum: SLAType, required: true },
    category: { type: String, required: true }, // Work Orders, Maintenance, etc.
    priority: { type: String, enum: SLAPriority, required: true },

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
        days: [String], // ["monday", "tuesday", etc.]
      },
    },

    // Escalation Rules
    escalation: {
      levels: [
        {
          level: Number,
          trigger: Number, // hours after start
          action: String, // EMAIL, SMS, PHONE, ASSIGN, ESCALATE
          recipients: [{ type: Schema.Types.ObjectId, ref: "User" }], // FIXED: Use ObjectId
          message: String,
        },
      ],
      autoAssignment: {
        enabled: Boolean,
        rules: [
          {
            condition: String, // "workload < 5" or "skill matches"
            assignTo: { type: Schema.Types.ObjectId, ref: "User" }, // FIXED: Use ObjectId
            priority: Number,
          },
        ],
      },
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
        perIncident: Number, // fixed cost per incident
      },
    },

    // Coverage
    coverage: {
      properties: [String], // property IDs
      assets: [String], // asset IDs
      services: [String], // service types
      locations: [
        {
          city: String,
          region: String,
          radius: Number, // km
        },
      ],
      timeframes: [
        {
          start: String, // HH:MM
          end: String, // HH:MM
          days: [String], // ["monday", "tuesday", etc.]
        },
      ],
    },

    // Service Levels
    serviceLevels: [
      {
        name: String,
        description: String,
        priority: SLAPriority,
        targets: {
          responseTime: Number,
          resolutionTime: Number,
          availability: Number,
        },
        cost: Number, // monthly cost
        features: [String], // Additional features
      },
    ],

    // Monitoring
    monitoring: {
      enabled: Boolean,
      intervals: {
        response: Number, // minutes
        resolution: Number, // minutes
        uptime: Number, // minutes
      },
      alerts: {
        response: Boolean,
        resolution: Boolean,
        uptime: Boolean,
        performance: Boolean,
      },
    },

    // Reporting
    reporting: {
      frequency: String, // DAILY, WEEKLY, MONTHLY
      recipients: [String], // user IDs or emails
      include: {
        performance: Boolean,
        incidents: Boolean,
        trends: Boolean,
        recommendations: Boolean,
      },
    },

    // Compliance
    compliance: {
      standards: [String], // ISO 9001, ISO 27001, etc.
      regulations: [String], // KSA specific regulations
      audits: [
        {
          type: String,
          scheduled: Date,
          completed: Date,
          result: String, // PASS, FAIL, CONDITIONAL
          findings: [String],
          actions: [String],
        },
      ],
    },

    // Status & Approval
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "EXPIRED"],
      default: "DRAFT",
    },
    approval: {
      required: Boolean,
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" }, // FIXED: Use ObjectId
      approvedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" }, // FIXED: Use ObjectId
      reviewedAt: Date,
      notes: String,
    },

    // Metadata
    tags: [String],
    customFields: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    // Indexes are managed centrally in lib/db/collections.ts
    autoIndex: false,
  },
);

// Apply plugins BEFORE indexes
SLASchema.plugin(tenantIsolationPlugin);
SLASchema.plugin(auditPlugin); // Adds orgId, createdBy, updatedBy (as ObjectId)

export type SLADoc = InferSchemaType<typeof SLASchema>;

export const SLA = getModel<SLADoc>("SLA", SLASchema);
