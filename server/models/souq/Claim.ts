import { Schema, type Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

/**
 * A-to-Z Claim Model
 * Buyer protection claims for order disputes (not delivered, significantly different, damaged)
 */

export interface IClaimEvidence {
  uploadedBy: "buyer" | "seller";
  type: "photo" | "document" | "video" | "screenshot";
  url: string;
  description: string;
  uploadedAt: Date;
}

export interface IClaimTimeline {
  status: string;
  timestamp: Date;
  note?: string;
  performedBy?: string;
}

export interface IClaimDecision {
  decidedAt: Date;
  decidedBy: string;
  outcome: "approved" | "denied" | "partial_refund";
  refundAmount: number;
  reasoning: string;
  evidence?: string[]; // Reference to evidence used
}

export interface IClaimFundsHold {
  amount: number;
  heldAt: Date;
  releasedAt?: Date;
  status: "held" | "released" | "transferred_to_buyer";
}

export interface IClaim extends Document {
  claimId: string;
  orderId: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;

  // Claim Type
  claimType:
    | "not_received"
    | "significantly_different"
    | "damaged"
    | "defective"
    | "counterfeit"
    | "unauthorized_charge";

  // Claim Details
  buyerDescription: string;
  desiredResolution:
    | "full_refund"
    | "partial_refund"
    | "replacement"
    | "return";
  requestedAmount: number;

  // Evidence
  buyerEvidence: IClaimEvidence[];
  sellerEvidence: IClaimEvidence[];

  // Status
  status:
    | "submitted"
    | "under_review"
    | "pending_seller_response"
    | "pending_investigation"
    | "resolved"
    | "closed"
    | "escalated";

  // Response Deadlines
  sellerResponseDeadline: Date;
  sellerRespondedAt?: Date;
  sellerResponse?: string;

  // Investigation
  investigationStartedAt?: Date;
  investigationNotes?: string;
  assignedTo?: string; // Admin user ID

  // Decision
  decision?: IClaimDecision;

  // Funds Hold (seller payout frozen during claim)
  fundsHold?: IClaimFundsHold;

  // Timeline
  timeline: IClaimTimeline[];

  // Communication
  buyerNotes?: string;
  sellerNotes?: string;
  adminNotes?: string;

  // Policy Violation
  isAbuse: boolean;
  abuseReason?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

const ClaimEvidenceSchema = new Schema<IClaimEvidence>(
  {
    uploadedBy: { type: String, enum: ["buyer", "seller"], required: true },
    type: {
      type: String,
      enum: ["photo", "document", "video", "screenshot"],
      required: true,
    },
    url: { type: String, required: true },
    description: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const ClaimTimelineSchema = new Schema<IClaimTimeline>(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    note: String,
    performedBy: String,
  },
  { _id: false },
);

const ClaimDecisionSchema = new Schema<IClaimDecision>(
  {
    decidedAt: { type: Date, required: true },
    decidedBy: { type: String, required: true },
    outcome: {
      type: String,
      enum: ["approved", "denied", "partial_refund"],
      required: true,
    },
    refundAmount: { type: Number, required: true },
    reasoning: { type: String, required: true },
    evidence: [String],
  },
  { _id: false },
);

const ClaimFundsHoldSchema = new Schema<IClaimFundsHold>(
  {
    amount: { type: Number, required: true },
    heldAt: { type: Date, required: true, default: Date.now },
    releasedAt: Date,
    status: {
      type: String,
      enum: ["held", "released", "transferred_to_buyer"],
      default: "held",
    },
  },
  { _id: false },
);

const ClaimSchema = new Schema<IClaim>(
  {
    claimId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true },
    buyerId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },

    claimType: {
      type: String,
      enum: [
        "not_received",
        "significantly_different",
        "damaged",
        "defective",
        "counterfeit",
        "unauthorized_charge",
      ],
      required: true,
      index: true,
    },

    buyerDescription: { type: String, required: true },
    desiredResolution: {
      type: String,
      enum: ["full_refund", "partial_refund", "replacement", "return"],
      required: true,
    },
    requestedAmount: { type: Number, required: true },

    buyerEvidence: { type: [ClaimEvidenceSchema], default: [] },
    sellerEvidence: { type: [ClaimEvidenceSchema], default: [] },

    status: {
      type: String,
      enum: [
        "submitted",
        "under_review",
        "pending_seller_response",
        "pending_investigation",
        "resolved",
        "closed",
        "escalated",
      ],
      default: "submitted",
      index: true,
    },

    sellerResponseDeadline: { type: Date, required: true },
    sellerRespondedAt: Date,
    sellerResponse: String,

    investigationStartedAt: Date,
    investigationNotes: String,
    assignedTo: { type: String, index: true },

    decision: ClaimDecisionSchema,
    fundsHold: ClaimFundsHoldSchema,

    timeline: { type: [ClaimTimelineSchema], default: [] },

    buyerNotes: String,
    sellerNotes: String,
    adminNotes: String,

    isAbuse: { type: Boolean, default: false },
    abuseReason: String,

    resolvedAt: Date,
    closedAt: Date,
  },
  {
    timestamps: true,
    collection: "claims",
  },
);

// Indexes
ClaimSchema.index({ status: 1, createdAt: -1 });
ClaimSchema.index({ buyerId: 1, status: 1 });
ClaimSchema.index({ sellerId: 1, status: 1 });
ClaimSchema.index({ sellerId: 1, createdAt: -1 });
ClaimSchema.index({ sellerResponseDeadline: 1, status: 1 });
ClaimSchema.index({ assignedTo: 1, status: 1 });

// Methods

/**
 * Add timeline event
 */
ClaimSchema.methods.addTimelineEvent = function (
  status: string,
  note?: string,
  performedBy?: string,
): void {
  this.timeline.push({
    status,
    timestamp: new Date(),
    note,
    performedBy,
  });
};

/**
 * Submit claim (initial creation)
 */
ClaimSchema.methods.submit = function (): void {
  this.status = "submitted";
  this.addTimelineEvent("submitted", "Claim submitted by buyer", this.buyerId);

  // Move to review immediately
  this.startReview();
};

/**
 * Start review process
 */
ClaimSchema.methods.startReview = function (): void {
  this.status = "under_review";
  this.addTimelineEvent("under_review", "Initial review started", "system");

  // Set seller response deadline (typically 3 days)
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 3);
  this.sellerResponseDeadline = deadline;

  // Hold seller funds
  this.holdFunds();
};

/**
 * Hold seller payout funds
 */
ClaimSchema.methods.holdFunds = function (): void {
  if (!this.fundsHold) {
    this.fundsHold = {
      amount: this.requestedAmount,
      heldAt: new Date(),
      status: "held",
    };
    this.addTimelineEvent(
      "funds_held",
      `${this.requestedAmount} SAR held from seller payout`,
      "system",
    );
  }
};

/**
 * Release held funds to seller
 */
ClaimSchema.methods.releaseFunds = function (): void {
  if (this.fundsHold && this.fundsHold.status === "held") {
    this.fundsHold.status = "released";
    this.fundsHold.releasedAt = new Date();
    this.addTimelineEvent(
      "funds_released",
      "Funds released to seller",
      "system",
    );
  }
};

/**
 * Transfer held funds to buyer
 */
ClaimSchema.methods.transferFundsToBuyer = function (): void {
  if (this.fundsHold && this.fundsHold.status === "held") {
    this.fundsHold.status = "transferred_to_buyer";
    this.fundsHold.releasedAt = new Date();
    this.addTimelineEvent(
      "funds_transferred",
      "Funds transferred to buyer",
      "system",
    );
  }
};

/**
 * Seller submits response
 */
ClaimSchema.methods.sellerRespond = function (
  response: string,
  evidence: IClaimEvidence[],
): void {
  this.sellerResponse = response;
  this.sellerRespondedAt = new Date();
  this.sellerEvidence.push(...evidence);

  this.status = "pending_investigation";
  this.addTimelineEvent(
    "seller_responded",
    "Seller submitted response",
    this.sellerId,
  );
};

/**
 * Assign to admin for investigation
 */
ClaimSchema.methods.assignInvestigator = function (adminId: string): void {
  this.assignedTo = adminId;
  this.investigationStartedAt = new Date();
  this.status = "pending_investigation";
  this.addTimelineEvent(
    "investigation_assigned",
    `Assigned to ${adminId}`,
    "system",
  );
};

/**
 * Escalate to higher authority
 */
ClaimSchema.methods.escalate = function (reason: string): void {
  this.status = "escalated";
  this.adminNotes = reason;
  this.addTimelineEvent("escalated", reason, this.assignedTo || "system");
};

/**
 * Resolve claim with decision
 */
ClaimSchema.methods.resolve = function (
  outcome: "approved" | "denied" | "partial_refund",
  refundAmount: number,
  reasoning: string,
  decidedBy: string,
): void {
  this.decision = {
    decidedAt: new Date(),
    decidedBy,
    outcome,
    refundAmount,
    reasoning,
    evidence: this.buyerEvidence
      .map((e: IClaimEvidence) => e.url)
      .concat(this.sellerEvidence.map((e: IClaimEvidence) => e.url)),
  };

  this.status = "resolved";
  this.resolvedAt = new Date();

  // Handle funds based on decision
  if (outcome === "approved" || outcome === "partial_refund") {
    this.transferFundsToBuyer();
  } else {
    this.releaseFunds();
  }

  this.addTimelineEvent("resolved", `${outcome}: ${reasoning}`, decidedBy);
};

/**
 * Close claim
 */
ClaimSchema.methods.close = function (reason?: string): void {
  this.status = "closed";
  this.closedAt = new Date();
  this.addTimelineEvent(
    "closed",
    reason || "Claim closed",
    this.assignedTo || "system",
  );
};

/**
 * Flag as abuse
 */
ClaimSchema.methods.flagAbuse = function (reason: string): void {
  this.isAbuse = true;
  this.abuseReason = reason;
  this.addTimelineEvent("abuse_flagged", reason, "system");
};

/**
 * Add buyer evidence
 */
ClaimSchema.methods.addBuyerEvidence = function (
  type: string,
  url: string,
  description: string,
): void {
  this.buyerEvidence.push({
    uploadedBy: "buyer",
    type: type as "photo" | "document" | "video" | "screenshot",
    url,
    description,
    uploadedAt: new Date(),
  });
  this.addTimelineEvent(
    "evidence_added",
    `Buyer uploaded ${type}`,
    this.buyerId,
  );
};

/**
 * Add seller evidence
 */
ClaimSchema.methods.addSellerEvidence = function (
  type: string,
  url: string,
  description: string,
): void {
  this.sellerEvidence.push({
    uploadedBy: "seller",
    type: type as "photo" | "document" | "video" | "screenshot",
    url,
    description,
    uploadedAt: new Date(),
  });
  this.addTimelineEvent(
    "evidence_added",
    `Seller uploaded ${type}`,
    this.sellerId,
  );
};

/**
 * Check if seller response is overdue
 */
ClaimSchema.methods.isSellerResponseOverdue = function (): boolean {
  return !this.sellerRespondedAt && new Date() > this.sellerResponseDeadline;
};

/**
 * Auto-decide if seller doesn't respond
 */
ClaimSchema.methods.autoDecideOnNoResponse = function (): void {
  if (this.isSellerResponseOverdue()) {
    this.resolve(
      "approved",
      this.requestedAmount,
      "Seller failed to respond within deadline",
      "system",
    );
  }
};

export const SouqClaim = getModel<IClaim>("SouqClaim", ClaimSchema);
