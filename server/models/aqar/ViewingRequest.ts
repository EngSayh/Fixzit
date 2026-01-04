/**
 * @module server/models/aqar/ViewingRequest
 * @description Property viewing appointment scheduling with agent coordination and feedback tracking.
 *              Supports in-person, virtual, and video call viewings.
 *
 * @features
 * - Viewing types: IN_PERSON, VIRTUAL, VIDEO_CALL
 * - Status workflow: REQUESTED → CONFIRMED → COMPLETED/CANCELLED/NO_SHOW
 * - Agent assignment and coordination
 * - Preferred date/time + alternative dates
 * - Participant management (buyer, spouse, family, agent, investor)
 * - Feedback collection (rating, comments, interest level, follow-up requests)
 * - Reminder notifications (email/SMS before viewing)
 * - No-show tracking (agent time management)
 * - Virtual viewing link generation (Zoom, Google Meet)
 *
 * @statuses
 * - REQUESTED: Viewing requested by buyer, awaiting agent confirmation
 * - CONFIRMED: Agent confirmed viewing appointment
 * - COMPLETED: Viewing completed, feedback collected
 * - CANCELLED: Cancelled by buyer or agent
 * - NO_SHOW: Buyer did not show up for viewing
 *
 * @indexes
 * - { orgId: 1, propertyId: 1, status: 1, preferredDate: 1 } — Property viewing schedule
 * - { orgId: 1, agentId: 1, status: 1, preferredDate: 1 } — Agent calendar
 * - { orgId: 1, requesterId: 1, createdAt: -1 } — Buyer viewing history
 * - { orgId: 1, status: 1, preferredDate: 1 } — Upcoming viewings dashboard
 *
 * @relationships
 * - References Property model (propertyId)
 * - References User model (agentId, requesterId)
 * - Links to Lead model (converts viewing to lead if interested)
 * - Integrates with notification system (reminders, confirmations)
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - timestamps: createdAt, updatedAt from Mongoose
 * - Feedback submittedAt timestamp
 */
import { Schema, model, models, Types } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

export type ViewingStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";
export type ViewingType = "IN_PERSON" | "VIRTUAL" | "VIDEO_CALL";

export interface ViewingParticipant {
  userId?: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  relationship?: "SELF" | "SPOUSE" | "FAMILY" | "AGENT" | "INVESTOR";
}

export interface ViewingFeedback {
  rating?: number; // 1-5
  comments?: string;
  interested: boolean;
  followUpRequested: boolean;
  submittedAt?: Date;
}

export interface ViewingRequest {
  _id: Types.ObjectId;
  orgId: Types.ObjectId; // This will be added by tenantIsolationPlugin
  propertyId: Types.ObjectId;
  agentId: Types.ObjectId;
  requesterId: Types.ObjectId; // User who requested

  // Scheduling
  preferredDate: Date;
  preferredTime: string; // "10:00", "14:30"
  alternativeDates?: Array<{
    date: Date;
    time: string;
  }>;
  confirmedDate?: Date;
  confirmedTime?: string;
  duration: number; // minutes

  // Type
  viewingType: ViewingType;
  virtualMeetingLink?: string;

  // Participants
  participants: ViewingParticipant[];

  // Status
  status: ViewingStatus;
  statusHistory: Array<{
    status: ViewingStatus;
    timestamp: Date;
    changedBy: Types.ObjectId;
    reason?: string;
  }>;

  // Communication
  specialRequests?: string;
  agentNotes?: string;
  internalNotes?: string;

  // Feedback
  feedback?: ViewingFeedback;

  // Notifications
  reminderSent: boolean;
  confirmationSent: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const ViewingRequestSchema = new Schema<ViewingRequest>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "PropertyListing",
      index: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "RealEstateAgent",
      index: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },

    preferredDate: { type: Date, required: true, index: true },
    preferredTime: { type: String, required: true },
    alternativeDates: [
      {
        date: Date,
        time: String,
      },
    ],
    confirmedDate: Date,
    confirmedTime: String,
    duration: { type: Number, default: 30 }, // 30 minutes default

    viewingType: {
      type: String,
      enum: ["IN_PERSON", "VIRTUAL", "VIDEO_CALL"],
      default: "IN_PERSON",
    },
    virtualMeetingLink: String,

    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        relationship: {
          type: String,
          enum: ["SELF", "SPOUSE", "FAMILY", "AGENT", "INVESTOR"],
        },
      },
    ],

    status: {
      type: String,
      enum: ["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"],
      default: "REQUESTED",
      index: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"],
        },
        timestamp: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reason: String,
      },
    ],

    specialRequests: String,
    agentNotes: String,
    internalNotes: String,

    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comments: String,
      interested: { type: Boolean, default: false },
      followUpRequested: { type: Boolean, default: false },
      submittedAt: Date,
    },

    reminderSent: { type: Boolean, default: false },
    confirmationSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "aqar_viewing_requests",
  },
);

// Apply plugins BEFORE indexes for proper tenant isolation
ViewingRequestSchema.plugin(tenantIsolationPlugin);
ViewingRequestSchema.plugin(auditPlugin);

// All indexes MUST be tenant-scoped to prevent cross-org data access
ViewingRequestSchema.index({ orgId: 1, propertyId: 1, status: 1 });
ViewingRequestSchema.index({
  orgId: 1,
  agentId: 1,
  status: 1,
  preferredDate: 1,
});
ViewingRequestSchema.index({ orgId: 1, requesterId: 1, createdAt: -1 });
ViewingRequestSchema.index({ orgId: 1, confirmedDate: 1, status: 1 });
ViewingRequestSchema.index({ orgId: 1, status: 1 });
ViewingRequestSchema.index({ orgId: 1, preferredDate: 1 });

const ViewingRequestModel = getModel<ViewingRequest>(
  "ViewingRequest",
  ViewingRequestSchema,
);

export default ViewingRequestModel;
