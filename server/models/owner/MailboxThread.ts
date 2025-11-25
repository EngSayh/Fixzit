import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

const ThreadStatus = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_RESPONSE",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
] as const;
const ThreadPriority = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const ThreadCategory = [
  "MAINTENANCE",
  "FINANCIAL",
  "TENANT_ISSUE",
  "CONTRACT",
  "GENERAL",
  "COMPLAINT",
  "INQUIRY",
] as const;

const MailboxThreadSchema = new Schema(
  {
    // Multi-tenancy - added by plugin
    // orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    // Thread Number (auto-generated with counter)
    threadNumber: { type: String, required: true, index: true },
    requestNumber: { type: String, required: true }, // User-friendly format: REQ-2024-0001

    // Thread Subject and Category
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ThreadCategory,
      required: true,
      index: true,
    },
    subCategory: String,

    // Parties
    owner: {
      ownerId: {
        type: Schema.Types.ObjectId,
        ref: "Owner",
        required: true,
        index: true,
      },
      ownerName: String,
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      email: String,
      phone: String,
    },

    recipient: {
      type: {
        type: String,
        enum: ["AGENT", "SERVICE_PROVIDER", "PROPERTY_MANAGER", "SUPPORT"],
        required: true,
      },
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
      name: String,
      email: String,
      phone: String,
    },

    // Related Records
    references: {
      propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
      propertyName: String,
      unitNumber: String,
      workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
      workOrderNumber: String,
      contractId: { type: Schema.Types.ObjectId, ref: "ServiceContract" },
      contractNumber: String,
      invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
      invoiceNumber: String,
      warrantyId: { type: Schema.Types.ObjectId, ref: "Warranty" },
      warrantyNumber: String,
      agentContractId: { type: Schema.Types.ObjectId, ref: "AgentContract" },
    },

    // Messages
    messages: [
      {
        messageId: { type: String, required: true },
        from: {
          userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          name: String,
          role: String, // OWNER, AGENT, SERVICE_PROVIDER, SUPPORT
          email: String,
        },
        to: [
          {
            userId: { type: Schema.Types.ObjectId, ref: "User" },
            name: String,
            email: String,
          },
        ],
        cc: [
          {
            userId: { type: Schema.Types.ObjectId, ref: "User" },
            name: String,
            email: String,
          },
        ],
        body: { type: String, required: true },
        htmlBody: String,
        sentAt: { type: Date, default: Date.now, index: true },

        // Attachments
        attachments: [
          {
            name: String,
            url: String,
            size: Number, // Bytes
            mimeType: String,
            uploadedAt: Date,
          },
        ],

        // Read Status
        readBy: [
          {
            userId: { type: Schema.Types.ObjectId, ref: "User" },
            readAt: Date,
            ipAddress: String,
          },
        ],

        // Metadata
        isInternal: { type: Boolean, default: false }, // Internal notes not visible to owner
        isAutoReply: { type: Boolean, default: false },
        emailSent: { type: Boolean, default: false },
        smsSent: { type: Boolean, default: false },
      },
    ],

    // Priority and Status
    priority: {
      type: String,
      enum: ThreadPriority,
      default: "MEDIUM",
      index: true,
    },
    status: { type: String, enum: ThreadStatus, default: "OPEN", index: true },
    statusHistory: [
      {
        status: { type: String, enum: ThreadStatus },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reason: String,
      },
    ],

    // Assignment
    assignedTo: {
      userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
      name: String,
      assignedAt: Date,
      assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },

    // Service Level Agreement (SLA)
    sla: {
      responseTime: Number, // Hours
      responseDeadline: Date,
      resolutionTime: Number, // Hours
      resolutionDeadline: Date,
      firstResponseAt: Date,
      resolvedAt: Date,
      responseBreached: { type: Boolean, default: false },
      resolutionBreached: { type: Boolean, default: false },
    },

    // Resolution
    resolution: {
      resolvedAt: Date,
      resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      resolutionNotes: String,
      resolutionType: String, // FIXED, WORKAROUND, NOT_AN_ISSUE, DUPLICATE, etc.
      satisfactionRating: Number, // 1-5
      satisfactionFeedback: String,
      feedbackDate: Date,
    },

    // Escalation
    escalation: {
      escalated: { type: Boolean, default: false },
      escalatedAt: Date,
      escalatedBy: { type: Schema.Types.ObjectId, ref: "User" },
      escalatedTo: { type: Schema.Types.ObjectId, ref: "User" },
      escalationReason: String,
      escalationLevel: Number, // 1, 2, 3, etc.
    },

    // Integration with other modules
    integrations: {
      // Auto-create work order from maintenance request
      workOrderCreated: { type: Boolean, default: false },
      workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
      workOrderCreatedAt: Date,

      // Link to support ticket
      supportTicketId: { type: Schema.Types.ObjectId, ref: "SupportTicket" },

      // Financial transaction if involves payment
      paymentRequired: Boolean,
      paymentAmount: Number,
      paymentStatus: String,
      paymentReference: String,
    },

    // Notifications
    notifications: {
      ownerNotified: { type: Boolean, default: false },
      lastOwnerNotification: Date,
      recipientNotified: { type: Boolean, default: false },
      lastRecipientNotification: Date,
      remindersSent: { type: Number, default: 0 },
      lastReminderDate: Date,
    },

    // Tags and Search
    tags: [String],
    searchKeywords: [String], // For full-text search

    // Metadata
    closedAt: Date,
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closureReason: String,
    reopenedCount: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    customFields: Schema.Types.Mixed,

    // createdBy, updatedBy, createdAt, updatedAt added by auditPlugin
  },
  {
    timestamps: true,
  },
);

// Apply plugins
MailboxThreadSchema.plugin(tenantIsolationPlugin);
MailboxThreadSchema.plugin(auditPlugin);

// Indexes
MailboxThreadSchema.index({ orgId: 1, threadNumber: 1 }, { unique: true });
MailboxThreadSchema.index({ orgId: 1, requestNumber: 1 }, { unique: true });
MailboxThreadSchema.index({ orgId: 1, "owner.ownerId": 1, status: 1 });
MailboxThreadSchema.index({ orgId: 1, category: 1, status: 1 });
MailboxThreadSchema.index({ orgId: 1, "assignedTo.userId": 1, status: 1 });
MailboxThreadSchema.index({ orgId: 1, priority: 1, status: 1 });
MailboxThreadSchema.index({ orgId: 1, lastActivityAt: -1 }); // For sorting
MailboxThreadSchema.index({ orgId: 1, "references.propertyId": 1 });
MailboxThreadSchema.index({ orgId: 1, "references.workOrderId": 1 });

// Pre-save hook
MailboxThreadSchema.pre("save", async function (next) {
  // Update lastActivityAt when new message is added
  if (this.isModified("messages")) {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage) {
      this.lastActivityAt = lastMessage.sentAt;
    }
  }

  // Check SLA breaches
  if (this.sla) {
    const now = new Date();
    if (
      !this.sla.firstResponseAt &&
      this.sla.responseDeadline &&
      now > this.sla.responseDeadline
    ) {
      this.sla.responseBreached = true;
    }
    if (
      !this.sla.resolvedAt &&
      this.sla.resolutionDeadline &&
      now > this.sla.resolutionDeadline
    ) {
      this.sla.resolutionBreached = true;
    }
  }

  next();
});

// Virtual for unread message count
MailboxThreadSchema.virtual("unreadCount").get(function () {
  const ownerUserId = this.owner?.userId?.toString();
  if (!ownerUserId) return 0;

  return this.messages.filter((m) => {
    const fromUser = m.from?.userId?.toString();
    if (fromUser === ownerUserId) return false; // Owner's own messages

    const readByOwner = m.readBy?.some(
      (r) => r.userId?.toString() === ownerUserId,
    );
    return !readByOwner;
  }).length;
});

// Virtual for message count
MailboxThreadSchema.virtual("messageCount").get(function () {
  return this.messages ? this.messages.length : 0;
});

// Method to add message
MailboxThreadSchema.methods.addMessage = function (messageData: {
  from: { userId: Types.ObjectId; name: string; role: string; email?: string };
  to?: Array<{ userId: Types.ObjectId; name: string; email?: string }>;
  cc?: Array<{ userId: Types.ObjectId; name: string; email?: string }>;
  body: string;
  htmlBody?: string;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
  isInternal?: boolean;
}) {
  if (!this.messages) this.messages = [];

  const messageId = `MSG-${this.threadNumber}-${(this.messages.length + 1).toString().padStart(4, "0")}`;

  this.messages.push({
    ...messageData,
    messageId,
    sentAt: new Date(),
    readBy: [],
  });

  // Update status if first response
  if (this.status === "OPEN" && messageData.from.role !== "OWNER") {
    this.status = "IN_PROGRESS";
    if (this.sla && !this.sla.firstResponseAt) {
      this.sla.firstResponseAt = new Date();
    }
  }

  return this.save();
};

// Method to mark message as read
MailboxThreadSchema.methods.markAsRead = function (
  messageId: string,
  userId: Types.ObjectId,
) {
  const message = this.messages.find(
    (m: { messageId: string }) => m.messageId === messageId,
  );
  if (!message) return this;

  const alreadyRead = message.readBy?.some(
    (r: { userId: Types.ObjectId }) =>
      r.userId?.toString() === userId.toString(),
  );

  if (!alreadyRead) {
    if (!message.readBy) message.readBy = [];
    message.readBy.push({
      userId,
      readAt: new Date(),
      ipAddress: undefined,
    });
  }

  return this.save();
};

// Export type and model
export type MailboxThread = InferSchemaType<typeof MailboxThreadSchema>;
export const MailboxThreadModel = getModel<MailboxThread>(
  "MailboxThread",
  MailboxThreadSchema,
);
