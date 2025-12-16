/**
 * @module server/models/marketplace/RFQ
 * @description Request for Quote (RFQ) workflow for B2B marketplace (Fixzit Souq).
 *              Allows corporate buyers to solicit bids from multiple vendors.
 *
 * @features
 * - RFQ lifecycle: OPEN → CLOSED → AWARDED
 * - Budget and quantity specification
 * - Deadline management for bid submissions
 * - Category linking for vendor matching
 * - Bid references (NOT embedded; links to ProjectBid model)
 * - Multi-currency support (SAR default)
 * - Tenant-scoped RFQs (orgId isolation)
 *
 * @statuses
 * - OPEN: Accepting vendor bids
 * - CLOSED: No longer accepting bids, evaluation in progress
 * - AWARDED: Contract awarded to winning vendor
 *
 * @indexes
 * - { orgId: 1, status: 1 } — Dashboard filters (open RFQs)
 * - { orgId: 1, requesterId: 1, createdAt: -1 } — User's RFQ history
 * - { orgId: 1, categoryId: 1 } — RFQs by category
 * - { orgId: 1, deadline: 1, status: 1 } — Upcoming deadline alerts
 *
 * @relationships
 * - References User model (requesterId)
 * - References MarketplaceCategory model (categoryId)
 * - References ProjectBid model (bids array)
 * - Integrates with vendor notification system for RFQ alerts
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - timestamps: createdAt, updatedAt from Mongoose
 */
import { Schema, model, models, Types, Model } from "mongoose";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

export interface MarketplaceRFQBid {
  vendorId: Types.ObjectId;
  amount: number;
  currency: string;
  leadDays?: number;
  submittedAt: Date;
}

export interface MarketplaceRFQ {
  _id: Types.ObjectId;
  orgId: Types.ObjectId; // This will be managed by tenantIsolationPlugin
  requesterId: Types.ObjectId;
  title: string;
  description?: string;
  categoryId?: Types.ObjectId;
  quantity?: number;
  budget?: number;
  currency: string;
  deadline?: Date;
  status: "OPEN" | "CLOSED" | "AWARDED";
  bids: Types.ObjectId[]; // References to ProjectBid documents (NOT embedded)
  createdAt: Date;
  updatedAt: Date;
}

const RFQSchema = new Schema<MarketplaceRFQ>(
  {
    // orgId will be added by tenantIsolationPlugin
    requesterId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "MarketplaceCategory" },
    quantity: { type: Number },
    budget: { type: Number },
    currency: { type: String, default: "SAR" },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "AWARDED"],
      default: "OPEN",
    },
    bids: [{ type: Schema.Types.ObjectId, ref: "ProjectBid" }], // Reference array, NOT embedded
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes for proper tenant isolation
RFQSchema.plugin(tenantIsolationPlugin);
RFQSchema.plugin(auditPlugin);

// All indexes MUST be tenant-scoped
RFQSchema.index({ orgId: 1, status: 1 });
RFQSchema.index({ orgId: 1, requesterId: 1, createdAt: -1 });
RFQSchema.index({ orgId: 1, categoryId: 1 });
RFQSchema.index({ orgId: 1, deadline: 1, status: 1 });

const RFQModel =
  (models.MarketplaceRFQ as Model<MarketplaceRFQ> | undefined) ||
  model<MarketplaceRFQ>("MarketplaceRFQ", RFQSchema);

export default RFQModel;
