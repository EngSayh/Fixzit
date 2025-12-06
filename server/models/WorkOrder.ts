import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

// Work Order Status - State Machine as per specification
const WorkOrderStatus = [
  "DRAFT",
  "SUBMITTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "PENDING_APPROVAL",
  "COMPLETED",
  "VERIFIED",
  "CLOSED",
  "CANCELLED",
  "REJECTED",
] as const;

const Priority = ["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"] as const;
const WorkOrderType = [
  "MAINTENANCE",
  "REPAIR",
  "INSPECTION",
  "INSTALLATION",
  "EMERGENCY",
  "PREVENTIVE",
  "CORRECTIVE",
] as const;
const SLAStatus = ["ON_TIME", "AT_RISK", "OVERDUE", "BREACHED"] as const;

// Work Order Mongoose Schema - Direct MongoDB Implementation

const WorkOrderSchema = new Schema(
  {
    // Multi-tenancy - will be added by plugin
    // orgId: { type: String, required: true, index: true },

    // Basic Information
    workOrderNumber: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: {
      type: String,
      required: function (this: { status?: string }) {
        return this.status !== "DRAFT";
      },
    },
    type: { type: String, enum: WorkOrderType, required: true },
    category: { type: String, required: true },
    subcategory: String,

    // Priority and SLA
    priority: {
      type: String,
      enum: Priority,
      required: true,
      default: "MEDIUM",
    },
    urgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    impact: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },

    // SLA Management
    sla: {
      responseTimeMinutes: { type: Number, required: true },
      resolutionTimeMinutes: { type: Number, required: true },
      responseDeadline: Date,
      resolutionDeadline: Date,
      status: { type: String, enum: SLAStatus, default: "ON_TIME" },
      breachReasons: [String],
      escalationLevel: { type: Number, default: 0 },
    },

    // Location Information
    location: {
      propertyId: {
        type: Schema.Types.ObjectId,
        ref: "Property",
        required: function (this: { status?: string }) {
          return this.status !== "DRAFT";
        },
      },
      unitNumber: String,
      floor: String,
      building: String,
      area: String,
      room: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      accessInstructions: String,
    },

    // Requester Information
    requester: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      type: {
        type: String,
        enum: ["TENANT", "OWNER", "STAFF", "EXTERNAL"],
        required: true,
      },
      name: { type: String, required: true },
      contactInfo: {
        phone: String,
        mobile: String,
        email: String,
        preferredContact: {
          type: String,
          enum: ["PHONE", "MOBILE", "EMAIL", "APP"],
        },
      },
      isAnonymous: { type: Boolean, default: false },
      availabilityWindow: {
        from: Date,
        to: Date,
        notes: String,
      },
    },

    // Assignment and Team
    assignment: {
      assignedTo: {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        teamId: { type: Schema.Types.ObjectId, ref: "Team" },
        vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
        name: String,
        contactInfo: {
          phone: String,
          email: String,
        },
      },
      assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
      assignedAt: Date,
      reassignmentHistory: [
        {
          fromUserId: { type: Schema.Types.ObjectId, ref: "User" },
          toUserId: { type: Schema.Types.ObjectId, ref: "User" },
          reason: String,
          assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
          assignedAt: Date,
        },
      ],
      estimatedStartTime: Date,
      estimatedCompletionTime: Date,
      scheduledDate: Date,
      scheduledTimeSlot: {
        start: String, // HH:MM
        end: String, // HH:MM
      },
    },

    // Status and Workflow
    status: {
      type: String,
      enum: WorkOrderStatus,
      required: true,
      default: "DRAFT",
    },
    workflow: {
      requiresApproval: { type: Boolean, default: false },
      approver: { type: Schema.Types.ObjectId, ref: "User" },
      approvedAt: Date,
      approvalNotes: String,
      rejectionReason: String,
      currentStep: String,
      nextStep: String,
      completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    },

    // Status History with State Machine
    statusHistory: [
      {
        fromStatus: String,
        toStatus: String,
        changedBy: String,
        changedAt: { type: Date, default: Date.now },
        reason: String,
        notes: String,
        automaticTransition: { type: Boolean, default: false },
      },
    ],

    // Work Details
    work: {
      actualStartTime: Date,
      actualEndTime: Date,
      totalTimeSpent: Number, // in minutes
      breakdowns: [
        {
          taskDescription: String,
          startTime: Date,
          endTime: Date,
          timeSpent: Number, // in minutes
          performedBy: String,
        },
      ],
      rootCause: String,
      solutionDescription: String,
      preventiveMeasures: String,
      followUpRequired: { type: Boolean, default: false },
      followUpDate: Date,
      workPerformed: String,
      testsPerformed: [String],
      qualityChecks: [
        {
          checkName: String,
          passed: Boolean,
          notes: String,
          checkedBy: String,
          checkedAt: Date,
        },
      ],
    },

    // Materials and Resources
    resources: {
      materials: [
        {
          itemId: String,
          name: String,
          quantity: Number,
          unit: String,
          unitCost: Number,
          totalCost: Number,
          supplierName: String,
          requestedBy: String,
          approvedBy: String,
          deliveredAt: Date,
          notes: String,
        },
      ],
      tools: [
        {
          toolId: String,
          name: String,
          checkedOutAt: Date,
          checkedInAt: Date,
          condition: String,
          notes: String,
        },
      ],
      labor: [
        {
          userId: String,
          name: String,
          role: String,
          hours: Number,
          hourlyRate: Number,
          totalCost: Number,
          overtime: Boolean,
        },
      ],
    },

    // Financial Information
    financial: {
      isBillable: { type: Boolean, default: false },
      estimatedCost: Number,
      actualCost: Number,
      currency: { type: String, default: "SAR" },
      costBreakdown: {
        labor: Number,
        materials: Number,
        equipment: Number,
        overhead: Number,
        markup: Number,
        tax: Number,
        total: Number,
      },
      budgetCode: String,
      costCenter: String,
      purchaseOrderNumber: String,
      invoiceNumber: String,
      paymentStatus: {
        type: String,
        enum: ["PENDING", "PAID", "OVERDUE", "CANCELLED"],
      },
      paymentDate: Date,
    },

    // Finance integration tracking
    financePosted: { type: Boolean, default: false },
    journalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
    journalNumber: String,
    financePostedDate: Date,
    financePostedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Communication and Updates
    communication: {
      comments: [
        {
          commentId: {
            type: String,
            default: () => new Date().getTime().toString(),
          },
          userId: String,
          userName: String,
          comment: String,
          timestamp: { type: Date, default: Date.now },
          isInternal: { type: Boolean, default: false },
          attachments: [
            {
              name: String,
              url: String,
              type: String,
              size: Number,
            },
          ],
          mentions: [String], // userIds mentioned in comment
        },
      ],
      notifications: [
        {
          type: String, // STATUS_CHANGE, ASSIGNMENT, COMMENT, etc.
          sentTo: [String], // userIds
          sentAt: Date,
          channel: String, // EMAIL, SMS, PUSH, IN_APP
          status: String, // SENT, DELIVERED, READ
        },
      ],
      updates: [
        {
          updateType: String,
          description: String,
          updatedBy: String,
          updatedAt: Date,
          isAutomated: { type: Boolean, default: false },
        },
      ],
    },

    // Attachments and Documentation
    attachments: [
      {
        key: String,
        fileName: String,
        originalName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        uploadedBy: String,
        uploadedAt: { type: Date, default: Date.now },
        category: String, // BEFORE, AFTER, INVOICE, RECEIPT, etc.
        description: String,
        isPublic: { type: Boolean, default: false },
        scanStatus: {
          type: String,
          enum: ["pending", "clean", "infected", "error"],
          default: "pending",
        },
      },
    ],

    // Quality and Rating
    quality: {
      customerRating: {
        score: { type: Number, min: 1, max: 5 },
        feedback: String,
        ratedBy: String,
        ratedAt: Date,
        categories: {
          timeliness: Number,
          quality: Number,
          communication: Number,
          professionalism: Number,
        },
      },
      internalRating: {
        score: { type: Number, min: 1, max: 5 },
        notes: String,
        ratedBy: String,
        ratedAt: Date,
      },
      qualityMetrics: {
        firstTimeFixRate: Boolean,
        customerSatisfactionScore: Number,
        completionTime: Number,
        reopenCount: { type: Number, default: 0 },
      },
    },

    // Compliance and Safety
    compliance: {
      safetyChecklist: [
        {
          item: String,
          checked: Boolean,
          checkedBy: String,
          checkedAt: Date,
          notes: String,
        },
      ],
      permits: [
        {
          permitType: String,
          permitNumber: String,
          issuedBy: String,
          validFrom: Date,
          validTo: Date,
          status: String,
        },
      ],
      regulations: [String], // Applicable regulations/standards
      riskAssessment: {
        riskLevel: {
          type: String,
          enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        },
        identifiedRisks: [String],
        mitigationMeasures: [String],
        assessedBy: String,
        assessedAt: Date,
      },
    },

    // Recurring Work Orders
    recurrence: {
      isRecurring: { type: Boolean, default: false },
      frequency: String, // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
      interval: Number, // Every N periods
      endDate: Date,
      maxOccurrences: Number,
      parentWorkOrderId: String, // Reference to original recurring WO
      nextScheduledDate: Date,
      lastGeneratedDate: Date,
    },

    // Integration and External References
    integrations: {
      externalSystemId: String,
      externalWorkOrderNumber: String,
      syncStatus: String,
      lastSyncAt: Date,
      syncErrors: [String],
      connectedSystems: [
        {
          systemName: String,
          systemId: String,
          lastSync: Date,
        },
      ],
    },

    // Analytics and KPIs
    metrics: {
      responseTime: Number, // minutes from creation to first response
      resolutionTime: Number, // minutes from creation to completion
      firstTimeFixRate: Boolean,
      escalationCount: { type: Number, default: 0 },
      reopenCount: { type: Number, default: 0 },
      customerTouchpoints: Number,
      technicianChangeCount: { type: Number, default: 0 },
    },

    // Custom Fields and Metadata
    customFields: Schema.Types.Mixed,
    tags: [String],
    references: [
      {
        type: String, // RELATED_WO, PARENT_WO, CHILD_WO, etc.
        workOrderId: String,
        description: String,
      },
    ],

    // Soft Delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: String,
    deletionReason: String,
  },
  {
    timestamps: true,
    // Add version key for optimistic locking
    versionKey: "version",
    // ⚡ CRITICAL: Disable automatic index creation to prevent IndexOptionsConflict
    // All indexes are managed manually in lib/db/collections.ts for explicit control
    autoIndex: false,
  },
);

// Apply plugins
WorkOrderSchema.plugin(tenantIsolationPlugin, {
  uniqueTenantFields: ["workOrderNumber"],
});
WorkOrderSchema.plugin(auditPlugin);

// ═══════════════════════════════════════════════════════════════════════════
// INDEX MANAGEMENT NOTE
// ═══════════════════════════════════════════════════════════════════════════
// All indexes for this model are managed manually in lib/db/collections.ts
// using the native MongoDB driver with explicit names and options.
//
// See: createIndexes() in lib/db/collections.ts (lines 138-167)
// Indexes: workorders_orgId_workOrderNumber_unique, workorders_orgId_status,
//          workorders_orgId_priority, workorders_orgId_propertyId, etc.
//
// WHY: This prevents IndexOptionsConflict errors during deployment and ensures
// consistent org-scoped multi-tenancy (STRICT v4.1 compliance).
//
// Schema indexes have been removed to maintain single source of truth.
// ═══════════════════════════════════════════════════════════════════════════

// State machine validation
WorkOrderSchema.pre("save", function (next) {
  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    DRAFT: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["ASSIGNED", "REJECTED", "CANCELLED"],
    ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
    IN_PROGRESS: ["ON_HOLD", "PENDING_APPROVAL", "COMPLETED", "CANCELLED"],
    ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
    PENDING_APPROVAL: ["COMPLETED", "REJECTED", "IN_PROGRESS"],
    COMPLETED: ["VERIFIED", "REJECTED"],
    VERIFIED: ["CLOSED"],
    CLOSED: [], // Terminal state
    CANCELLED: [], // Terminal state
    REJECTED: ["DRAFT", "SUBMITTED"],
  };

  if (this.isModified("status") && !this.isNew) {
    const currentStatus = this.status;
    const previousStatus = (
      this as unknown as { $__?: { originalDoc?: { status?: string } } }
    ).$__?.originalDoc?.status;

    if (
      previousStatus &&
      !validTransitions[previousStatus]?.includes(currentStatus)
    ) {
      return next(
        new Error(
          `Invalid status transition from ${previousStatus} to ${currentStatus}`,
        ),
      );
    }
  }

  // Auto-generate work order number if not provided
  if (this.isNew && !this.workOrderNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const timestamp = now.getTime().toString().slice(-6);
    this.workOrderNumber = `WO-${year}${month}-${timestamp}`;
  }

  next();
});

// Virtual for due date calculation
WorkOrderSchema.virtual("isDue").get(function () {
  return (
    this.sla?.resolutionDeadline && new Date() > this.sla.resolutionDeadline
  );
});

// Virtual for overdue calculation
WorkOrderSchema.virtual("isOverdue").get(function () {
  return (
    this.sla?.resolutionDeadline && new Date() > this.sla.resolutionDeadline
  );
});

// Method to calculate SLA status
WorkOrderSchema.methods.updateSLAStatus = function () {
  const now = new Date();
  const resolutionDeadline = this.sla.resolutionDeadline;

  if (!resolutionDeadline) {
    this.sla.status = "ON_TIME";
    return;
  }

  const timeUntilDeadline = resolutionDeadline.getTime() - now.getTime();
  const totalSLATime = this.sla.resolutionTimeMinutes * 60 * 1000; // Convert to milliseconds
  const timeRemaining = timeUntilDeadline / totalSLATime;

  if (timeUntilDeadline < 0) {
    this.sla.status = "BREACHED";
  } else if (timeRemaining < 0.1) {
    // Less than 10% time remaining
    this.sla.status = "OVERDUE";
  } else if (timeRemaining < 0.25) {
    // Less than 25% time remaining
    this.sla.status = "AT_RISK";
  } else {
    this.sla.status = "ON_TIME";
  }
};

export type WorkOrderDoc = InferSchemaType<typeof WorkOrderSchema>;

// Virtual property for 'code' as alias to 'workOrderNumber'
WorkOrderSchema.virtual("code").get(function (this: WorkOrderDoc) {
  return this.workOrderNumber;
});

// ═══════════════════════════════════════════════════════════════════════════
// INDEXES REMOVED - Managed centrally in lib/db/collections.ts
// ═══════════════════════════════════════════════════════════════════════════
// All WorkOrder indexes are defined in createIndexes() to prevent
// IndexOptionsConflict errors during deployment. See:
//   - workorders_orgId_status_createdAt_desc
//   - workorders_orgId_assignedUser_status  
//   - workorders_orgId_propertyId_status
//   - workorders_orgId_unitNumber_status
//   - workorders_orgId_priority_slaStatus
//   - workorders_sla_resolutionDeadline
// ═══════════════════════════════════════════════════════════════════════════

// Ensure virtuals are included in JSON/Object output
WorkOrderSchema.set("toJSON", { virtuals: true });
WorkOrderSchema.set("toObject", { virtuals: true });

export const WorkOrder: Model<WorkOrderDoc> = getModel<WorkOrderDoc>(
  "WorkOrder",
  WorkOrderSchema,
);
