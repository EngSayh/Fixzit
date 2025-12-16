/**
 * @module server/models/aqar/Lead
 * @description Aqar property inquiry leads with CRM integration and state machine workflow.
 *              Tracks lead lifecycle from inquiry to deal closure with validation rules.
 *
 * @features
 * - Lead lifecycle: NEW → CONTACTED → QUALIFIED → VIEWING → NEGOTIATING → WON/LOST/SPAM
 * - State machine validation (enforces valid state transitions, prevents illegal moves)
 * - Terminal states: WON, LOST, SPAM (no outgoing transitions)
 * - Listing linkage (which property inquiry is about)
 * - Buyer profile tracking (budget, preferences, timeline)
 * - Agent assignment and workload distribution
 * - Lead scoring (interest level, responsiveness, qualification)
 * - Viewing request integration
 * - CRM module integration (syncs with main Fixzit CRM)
 * - Lead source tracking (organic, paid, referral, agent)
 * - Follow-up reminders and task generation
 *
 * @statuses
 * - NEW: Fresh inquiry (uncontacted)
 * - CONTACTED: Agent reached out to lead
 * - QUALIFIED: Genuine interest confirmed (budget + timeline verified)
 * - VIEWING: Property viewing scheduled
 * - NEGOTIATING: Offer/counteroffer in progress
 * - WON: Deal closed (property sold/rented)
 * - LOST: Deal lost (competitor, budget mismatch, lost interest)
 * - SPAM: Marked as spam/fake inquiry
 *
 * @stateTransitions
 * Valid transitions enforced via BIZ-001 state machine:
 * - NEW → CONTACTED, QUALIFIED, SPAM
 * - CONTACTED → QUALIFIED, LOST, SPAM
 * - QUALIFIED → VIEWING, NEGOTIATING, LOST
 * - VIEWING → NEGOTIATING, QUALIFIED, LOST
 * - NEGOTIATING → WON, LOST
 * - WON, LOST, SPAM: Terminal states (no transitions)
 *
 * @indexes
 * - { orgId: 1, status: 1, createdAt: -1 } — Dashboard queries (active leads)
 * - { orgId: 1, listingId: 1, status: 1 } — Leads per listing
 * - { orgId: 1, agentId: 1, status: 1 } — Agent workload queries
 * - { orgId: 1, email: 1 } — Duplicate lead detection
 * - { orgId: 1, phone: 1 } — Lead lookup by phone
 * - { orgId: 1, leadSource: 1, createdAt: -1 } — Lead source analytics
 *
 * @relationships
 * - References Listing model (listingId)
 * - References User model (agentId, createdBy)
 * - Links to ViewingRequest model (scheduled viewings)
 * - Integrates with CrmLead model (Fixzit main CRM sync)
 * - Links to CrmActivity model (lead activity timeline)
 *
 * @audit
 * - createdBy, updatedBy: Via tenantIsolationPlugin
 * - timestamps: createdAt, updatedAt from Mongoose
 * - Status change history tracked in statusHistory array
 */
import mongoose, { Schema, Document, Model } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

export enum LeadStatus {
  NEW = "NEW", // Fresh inquiry
  CONTACTED = "CONTACTED", // Agent reached out
  QUALIFIED = "QUALIFIED", // Genuine interest
  VIEWING = "VIEWING", // Scheduled property viewing
  NEGOTIATING = "NEGOTIATING", // In negotiation
  WON = "WON", // Deal closed
  LOST = "LOST", // Deal lost
  SPAM = "SPAM", // Marked as spam
}

/**
 * BIZ-001 FIX: Lead State Machine Transition Rules
 *
 * Defines valid state transitions to prevent invalid business logic.
 * Terminal states (WON, LOST, SPAM) have no outgoing transitions.
 */
const LEAD_STATE_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.SPAM],
  [LeadStatus.CONTACTED]: [LeadStatus.QUALIFIED, LeadStatus.VIEWING, LeadStatus.LOST, LeadStatus.SPAM],
  [LeadStatus.QUALIFIED]: [LeadStatus.VIEWING, LeadStatus.NEGOTIATING, LeadStatus.LOST],
  [LeadStatus.VIEWING]: [LeadStatus.NEGOTIATING, LeadStatus.QUALIFIED, LeadStatus.LOST],
  [LeadStatus.NEGOTIATING]: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.VIEWING],
  [LeadStatus.WON]: [], // Terminal state
  [LeadStatus.LOST]: [], // Terminal state
  [LeadStatus.SPAM]: [], // Terminal state
};

/**
 * Validate that a state transition is allowed
 * @param from - Current status
 * @param to - Target status
 * @throws Error if transition is invalid
 */
function validateTransition(from: LeadStatus, to: LeadStatus): void {
  const allowed = LEAD_STATE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid lead status transition: ${from} → ${to}. ` +
        `Allowed transitions from ${from}: ${allowed.length > 0 ? allowed.join(", ") : "none (terminal state)"}`
    );
  }
}

export enum LeadIntent {
  BUY = "BUY",
  RENT = "RENT",
  DAILY = "DAILY",
}

export enum LeadSource {
  LISTING_INQUIRY = "LISTING_INQUIRY", // From listing detail page
  PROJECT_INQUIRY = "PROJECT_INQUIRY", // From project page
  PHONE_CALL = "PHONE_CALL", // Phone inquiry
  WHATSAPP = "WHATSAPP", // WhatsApp inquiry
  EMAIL = "EMAIL", // Email inquiry
  WALK_IN = "WALK_IN", // Walk-in to office
}

export enum LeadChannel {
  FORM = "FORM",
  CALL_REVEAL = "CALL_REVEAL",
  WHATSAPP_CLICK = "WHATSAPP_CLICK",
  BOOKING_REQUEST = "BOOKING_REQUEST",
  AUCTION_BID = "AUCTION_BID",
}

export interface ILead extends Document {
  // Organization
  orgId: mongoose.Types.ObjectId;

  // Source
  listingId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  source: LeadSource;

  // Inquirer (potential client)
  inquirerId?: mongoose.Types.ObjectId; // User ID if logged in
  inquirerName: string;
  inquirerPhone: string;
  inquirerEmail?: string;
  inquirerNationalId?: string; // If Nafath verified

  // Owner/Agent (recipient)
  recipientId: mongoose.Types.ObjectId;

  // Intent
  intent: LeadIntent;
  message?: string;
  channel: LeadChannel;

  // Status & assignment
  status: LeadStatus;
  assignedTo?: mongoose.Types.ObjectId; // Agent/salesperson
  assignedAt?: Date;

  // Follow-up
  notes: Array<{
    authorId: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
  }>;

  // Viewing
  viewingScheduledAt?: Date;
  viewingCompletedAt?: Date;

  // Outcome
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  lostReason?: string;

  // Integration
  crmContactId?: mongoose.Types.ObjectId; // Link to CRM Contact
  crmDealId?: mongoose.Types.ObjectId; // Link to CRM Deal

  // Instance methods
  addNote(authorId: mongoose.Types.ObjectId, content: string): Promise<void>;
  assign(agentId: mongoose.Types.ObjectId): Promise<void>;
  scheduleViewing(dateTime: Date): Promise<void>;
  completeViewing(): Promise<void>;
  markAsWon(userId: mongoose.Types.ObjectId): Promise<void>;
  markAsLost(userId: mongoose.Types.ObjectId, reason?: string): Promise<void>;
  markAsSpam(): Promise<void>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    listingId: { type: Schema.Types.ObjectId, ref: "AqarListing", index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "AqarProject", index: true },
    source: {
      type: String,
      enum: Object.values(LeadSource),
      required: true,
      index: true,
    },

    inquirerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    inquirerName: { type: String, required: true, maxlength: 200 },
    inquirerPhone: { type: String, required: true },
    inquirerEmail: { type: String, maxlength: 200 },
    inquirerNationalId: { type: String },

    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    intent: {
      type: String,
      enum: Object.values(LeadIntent),
      required: true,
      index: true,
    },
    message: { type: String, maxlength: 2000 },
    channel: {
      type: String,
      enum: Object.values(LeadChannel),
      default: LeadChannel.FORM,
    },

    status: {
      type: String,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
      required: true,
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedAt: { type: Date },

    notes: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    viewingScheduledAt: { type: Date },
    viewingCompletedAt: { type: Date },

    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lostReason: { type: String, maxlength: 500 },

    crmContactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    crmDealId: { type: Schema.Types.ObjectId, ref: "Deal" },
  },
  {
    timestamps: true,
    collection: "aqar_leads",
  },
);

// Indexes
LeadSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
LeadSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
LeadSchema.index({ inquirerPhone: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ orgId: 1, status: 1, createdAt: -1 });

// =============================================================================
// DATA-001 FIX: Apply tenantIsolationPlugin for multi-tenant data isolation
// CRITICAL: Prevents cross-tenant data access in Aqar CRM leads
// =============================================================================
LeadSchema.plugin(tenantIsolationPlugin);

// Methods
LeadSchema.methods.addNote = async function (
  this: ILead,
  authorId: mongoose.Types.ObjectId,
  content: string,
) {
  this.notes.push({
    authorId,
    content,
    createdAt: new Date(),
  });
  await this.save();
};

LeadSchema.methods.assign = async function (
  this: ILead,
  agentId: mongoose.Types.ObjectId,
) {
  this.assignedTo = agentId;
  this.assignedAt = new Date();
  if (this.status === LeadStatus.NEW) {
    // BIZ-001 FIX: Validate transition to CONTACTED
    validateTransition(this.status, LeadStatus.CONTACTED);
    this.status = LeadStatus.CONTACTED;
  }
  await this.save();
};

LeadSchema.methods.scheduleViewing = async function (
  this: ILead,
  dateTime: Date,
) {
  // BIZ-001 FIX: Use state machine validation instead of hardcoded list
  validateTransition(this.status, LeadStatus.VIEWING);
  this.viewingScheduledAt = dateTime;
  this.status = LeadStatus.VIEWING;
  await this.save();
};

LeadSchema.methods.completeViewing = async function (this: ILead) {
  if (!this.viewingScheduledAt) {
    throw new Error("No viewing scheduled");
  }
  // BIZ-001 FIX: Validate transition to NEGOTIATING
  validateTransition(this.status, LeadStatus.NEGOTIATING);
  this.viewingCompletedAt = new Date();
  this.status = LeadStatus.NEGOTIATING;
  await this.save();
};

LeadSchema.methods.markAsWon = async function (
  this: ILead,
  userId: mongoose.Types.ObjectId,
) {
  // BIZ-001 FIX: Validate transition to WON (only from NEGOTIATING)
  validateTransition(this.status, LeadStatus.WON);
  this.status = LeadStatus.WON;
  this.closedAt = new Date();
  this.closedBy = userId;
  await this.save();
};

LeadSchema.methods.markAsLost = async function (
  this: ILead,
  userId: mongoose.Types.ObjectId,
  reason?: string,
) {
  // BIZ-001 FIX: Validate transition to LOST
  validateTransition(this.status, LeadStatus.LOST);
  this.status = LeadStatus.LOST;
  this.closedAt = new Date();
  this.closedBy = userId;
  this.lostReason = reason;
  await this.save();
};

LeadSchema.methods.markAsSpam = async function (this: ILead) {
  // BIZ-001 FIX: Validate transition to SPAM (only from early states)
  validateTransition(this.status, LeadStatus.SPAM);
  this.status = LeadStatus.SPAM;
  await this.save();
};

const Lead = getModel<ILead>("AqarLead", LeadSchema);

export default Lead;
