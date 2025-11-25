import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/src/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const Message = new Schema(
  {
    byUserId: { type: Schema.Types.ObjectId, ref: "User" },
    byRole: { type: String },
    at: { type: Date, default: Date.now },
    text: { type: String, required: true },
    attachments: {
      type: [{ url: String, name: String, size: Number, type: String }],
      default: [],
    },
  },
  { _id: false },
);

const SupportTicketSchema = new Schema(
  {
    // tenantId REMOVED - plugin will add orgId
    code: { type: String, required: true },
    subject: { type: String, required: true },
    module: {
      type: String,
      enum: ["FM", "Souq", "Aqar", "Account", "Billing", "Other"],
      default: "Other",
    },
    type: {
      type: String,
      enum: ["Bug", "Feature", "Complaint", "Billing", "Access", "Other"],
      default: "Other",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    category: {
      type: String,
      enum: [
        "Technical",
        "Feature Request",
        "Billing",
        "Account",
        "General",
        "Bug Report",
      ],
      default: "General",
    },
    subCategory: {
      type: String,
      enum: [
        "Bug Report",
        "Performance Issue",
        "UI Error",
        "API Error",
        "Database Error",
        "New Feature",
        "Enhancement",
        "Integration",
        "Customization",
        "Mobile App",
        "Invoice Issue",
        "Payment Error",
        "Subscription",
        "Refund",
        "Pricing",
        "Login Issue",
        "Password Reset",
        "Profile Update",
        "Permissions",
        "Access Denied",
        "Documentation",
        "Training",
        "Support",
        "Feedback",
        "Other",
        "Critical Bug",
        "Minor Bug",
        "Cosmetic Issue",
        "Data Error",
        "Security Issue",
      ],
      default: "Other",
    },
    status: {
      type: String,
      enum: ["New", "Open", "Waiting", "Resolved", "Closed"],
      default: "New",
    },

    // createdBy will be added by auditPlugin

    requester: { name: String, email: String, phone: String },
    messages: { type: [Message], default: [] },
    assignment: {
      assignedTo: {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        teamId: { type: Schema.Types.ObjectId, ref: "Team" },
      },
      assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
      assignedAt: Date,
    },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

// APPLY PLUGINS (BEFORE INDEXES)
SupportTicketSchema.plugin(tenantIsolationPlugin);
SupportTicketSchema.plugin(auditPlugin);

// INDEXES (AFTER PLUGINS)
SupportTicketSchema.index({ orgId: 1, code: 1 }, { unique: true }); // Tenant-scoped unique code
SupportTicketSchema.index({ orgId: 1, status: 1, module: 1, priority: 1 });
SupportTicketSchema.index({ orgId: 1, "requester.email": 1 });
SupportTicketSchema.index({ orgId: 1, "assignment.assignedTo.userId": 1 });

export type SupportTicketDoc = InferSchemaType<typeof SupportTicketSchema>;

export const SupportTicket: Model<SupportTicketDoc> =
  getModel<SupportTicketDoc>("SupportTicket", SupportTicketSchema);
