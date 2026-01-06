/**
 * ChatSession Model - AI chatbot sessions
 * 
 * @module server/models/support/ChatSession
 * @description Chat session management for AI-powered customer support.
 * Tracks conversations, escalations, and satisfaction.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - AI context preservation
 * - Human escalation tracking
 * - Session metrics
 * - Satisfaction ratings
 * 
 * @indexes
 * - { org_id, user_id, status } - User session queries
 * - { status, assigned_agent_id } - Agent assignment queries
 */

import { Schema, model, models, Types, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const ChatSessionType = {
  AI: "ai",
  HUMAN: "human",
  HYBRID: "hybrid",
} as const;

export const ChatSessionStatus = {
  ACTIVE: "active",
  WAITING_HUMAN: "waiting_human",
  RESOLVED: "resolved",
  CLOSED: "closed",
  EXPIRED: "expired",
} as const;

export const ChatCategory = {
  AD_INQUIRY: "ad_inquiry",
  ACCOUNT_ISSUE: "account_issue",
  RESERVATIONS: "reservations",
  PROPERTY_SEARCH: "property_search",
  BILLING: "billing",
  TECHNICAL: "technical",
  GENERAL: "general",
} as const;

export type ChatSessionTypeValue = (typeof ChatSessionType)[keyof typeof ChatSessionType];
export type ChatSessionStatusValue = (typeof ChatSessionStatus)[keyof typeof ChatSessionStatus];
export type ChatCategoryValue = (typeof ChatCategory)[keyof typeof ChatCategory];

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

const AIContextSchema = new Schema(
  {
    company_name: String,
    user_type: String,
    previous_interactions: { type: Number, default: 0 },
    subscription_status: String,
    preferred_language: { type: String, enum: ["ar", "en"], default: "ar" },
    last_topics: [String],
  },
  { _id: false }
);

// ============================================================================
// INTERFACES
// ============================================================================

export interface IChatSession extends Document {
  org_id: Types.ObjectId;
  user_id: Types.ObjectId;
  
  // Session Info
  type: ChatSessionTypeValue;
  category?: ChatCategoryValue;
  status: ChatSessionStatusValue;
  
  // AI Context
  ai_context: {
    company_name?: string;
    user_type?: string;
    previous_interactions: number;
    subscription_status?: string;
    preferred_language: "ar" | "en";
    last_topics?: string[];
  };
  
  // Assignment (for human support)
  assigned_agent_id?: Types.ObjectId;
  escalated_at?: Date;
  escalation_reason?: string;
  queue_position?: number;
  
  // Metrics
  message_count: number;
  ai_message_count: number;
  human_message_count: number;
  avg_response_time_ms?: number;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  last_message_at?: Date;
  
  // Satisfaction
  satisfaction_rating?: number;
  satisfaction_feedback?: string;
  
  // Expiration
  expires_at?: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const ChatSessionSchema = new Schema<IChatSession>(
  {
    org_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Session Info
    type: {
      type: String,
      required: true,
      enum: Object.values(ChatSessionType),
      default: ChatSessionType.AI,
    },
    category: {
      type: String,
      enum: Object.values(ChatCategory),
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ChatSessionStatus),
      default: ChatSessionStatus.ACTIVE,
    },
    
    // AI Context
    ai_context: {
      type: AIContextSchema,
      default: () => ({
        previous_interactions: 0,
        preferred_language: "ar",
      }),
    },
    
    // Assignment
    assigned_agent_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    escalated_at: Date,
    escalation_reason: String,
    queue_position: Number,
    
    // Metrics
    message_count: { type: Number, default: 0 },
    ai_message_count: { type: Number, default: 0 },
    human_message_count: { type: Number, default: 0 },
    avg_response_time_ms: Number,
    
    // Timestamps
    resolved_at: Date,
    last_message_at: Date,
    
    // Satisfaction
    satisfaction_rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    satisfaction_feedback: String,
    
    // Expiration (inactive sessions)
    expires_at: Date,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "chat_sessions",
  }
);

// ============================================================================
// INDEXES
// ============================================================================

ChatSessionSchema.index({ org_id: 1, user_id: 1, status: 1 });
ChatSessionSchema.index({ status: 1, assigned_agent_id: 1 });
ChatSessionSchema.index({ org_id: 1, created_at: -1 });
ChatSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index

// ============================================================================
// PLUGINS
// ============================================================================

ChatSessionSchema.plugin(tenantIsolationPlugin);

// ============================================================================
// METHODS
// ============================================================================

/**
 * Escalate to human agent
 */
ChatSessionSchema.methods.escalate = async function (
  reason?: string
): Promise<IChatSession> {
  this.status = ChatSessionStatus.WAITING_HUMAN;
  this.type = ChatSessionType.HYBRID;
  this.escalated_at = new Date();
  this.escalation_reason = reason;
  return this.save();
};

/**
 * Assign to agent
 */
ChatSessionSchema.methods.assign = async function (
  agent_id: Types.ObjectId | string
): Promise<IChatSession> {
  this.assigned_agent_id = agent_id;
  this.status = ChatSessionStatus.ACTIVE;
  this.type = ChatSessionType.HYBRID;
  return this.save();
};

/**
 * Resolve session
 */
ChatSessionSchema.methods.resolve = async function (
  rating?: number,
  feedback?: string
): Promise<IChatSession> {
  this.status = ChatSessionStatus.RESOLVED;
  this.resolved_at = new Date();
  if (rating) this.satisfaction_rating = rating;
  if (feedback) this.satisfaction_feedback = feedback;
  return this.save();
};

// ============================================================================
// STATICS
// ============================================================================

/**
 * Get active session for user (or create new)
 */
ChatSessionSchema.statics.getOrCreateForUser = async function (
  org_id: Types.ObjectId | string,
  user_id: Types.ObjectId | string,
  category?: ChatCategoryValue
): Promise<IChatSession> {
  // Check for existing active session
  let session = await this.findOne({
    org_id,
    user_id,
    status: { $in: [ChatSessionStatus.ACTIVE, ChatSessionStatus.WAITING_HUMAN] },
  }).sort({ created_at: -1 });
  
  if (!session) {
    // Create new session
    session = await this.create({
      org_id,
      user_id,
      type: ChatSessionType.AI,
      category,
      status: ChatSessionStatus.ACTIVE,
      ai_context: {
        previous_interactions: 0,
        preferred_language: "ar",
      },
    });
  }
  
  return session;
};

/**
 * Get queue position for waiting sessions
 */
ChatSessionSchema.statics.getQueuePosition = async function (
  session_id: Types.ObjectId | string
): Promise<number> {
  const session = await this.findById(session_id);
  if (!session || session.status !== ChatSessionStatus.WAITING_HUMAN) {
    return 0;
  }
  
  const count = await this.countDocuments({
    status: ChatSessionStatus.WAITING_HUMAN,
    escalated_at: { $lt: session.escalated_at },
  });
  
  return count + 1;
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const ChatSession = getModel<IChatSession>("ChatSession", ChatSessionSchema);
export default ChatSession;
