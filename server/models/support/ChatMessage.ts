/**
 * ChatMessage Model - Messages in chat sessions
 * 
 * @module server/models/support/ChatMessage
 * @description Individual messages within chat sessions.
 * Supports text, attachments, and quick actions.
 * 
 * @features
 * - Multi-tenant isolation
 * - Sender type tracking (user/ai/agent)
 * - Attachment support
 * - AI metadata (confidence, intent)
 * - Quick action tracking
 * - Read receipts
 */

import { Schema, model, models, Types, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const MessageSenderType = {
  USER: "user",
  AI: "ai",
  AGENT: "agent",
  SYSTEM: "system",
} as const;

export const MessageContentType = {
  TEXT: "text",
  IMAGE: "image",
  FILE: "file",
  QUICK_ACTION: "quick_action",
  SYSTEM: "system",
} as const;

export type MessageSenderTypeValue = (typeof MessageSenderType)[keyof typeof MessageSenderType];
export type MessageContentTypeValue = (typeof MessageContentType)[keyof typeof MessageContentType];

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

const AttachmentSchema = new Schema(
  {
    type: { type: String, enum: ["image", "file", "document"], required: true },
    url: { type: String, required: true },
    filename: { type: String, required: true },
    size: { type: Number, required: true },
    mime_type: String,
    thumbnail_url: String,
  },
  { _id: false }
);

const QuickActionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    label_ar: { type: String, required: true },
  },
  { _id: false }
);

// ============================================================================
// INTERFACES
// ============================================================================

export interface IChatMessage extends Document {
  org_id: Types.ObjectId;
  session_id: Types.ObjectId;
  
  // Message Content
  sender_type: MessageSenderTypeValue;
  sender_id?: Types.ObjectId;
  sender_name?: string;
  content: string;
  content_type: MessageContentTypeValue;
  
  // Attachments
  attachments?: Array<{
    type: "image" | "file" | "document";
    url: string;
    filename: string;
    size: number;
    mime_type?: string;
    thumbnail_url?: string;
  }>;
  
  // Quick Action
  quick_action?: {
    id: string;
    label: string;
    label_ar: string;
  };
  
  // AI Metadata
  ai_confidence?: number;
  ai_intent?: string;
  ai_entities?: Record<string, unknown>;
  ai_suggested_actions?: string[];
  
  // Status
  read_at?: Date;
  delivered_at?: Date;
  error?: string;
  
  // Timestamps
  created_at: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    org_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    session_id: {
      type: Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    
    // Message Content
    sender_type: {
      type: String,
      required: true,
      enum: Object.values(MessageSenderType),
    },
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    sender_name: String,
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    content_type: {
      type: String,
      required: true,
      enum: Object.values(MessageContentType),
      default: MessageContentType.TEXT,
    },
    
    // Attachments
    attachments: [AttachmentSchema],
    
    // Quick Action
    quick_action: QuickActionSchema,
    
    // AI Metadata
    ai_confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    ai_intent: String,
    ai_entities: Schema.Types.Mixed,
    ai_suggested_actions: [String],
    
    // Status
    read_at: Date,
    delivered_at: Date,
    error: String,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false, // Messages are immutable
    },
    collection: "chat_messages",
  }
);

// ============================================================================
// INDEXES
// ============================================================================

ChatMessageSchema.index({ org_id: 1, session_id: 1, created_at: 1 });
ChatMessageSchema.index({ session_id: 1, created_at: -1 }); // Pagination
ChatMessageSchema.index({ org_id: 1, sender_type: 1, created_at: -1 }); // Analytics

// ============================================================================
// PLUGINS
// ============================================================================

ChatMessageSchema.plugin(tenantIsolationPlugin);

// ============================================================================
// PRE-SAVE HOOKS
// ============================================================================

/**
 * Update session message counts on save
 */
ChatMessageSchema.post("save", async function (doc) {
  try {
    const ChatSession = model("ChatSession");
    const incUpdate: Record<string, number> = { message_count: 1 };
    
    if (doc.sender_type === MessageSenderType.AI) {
      incUpdate.ai_message_count = 1;
    } else if (doc.sender_type === MessageSenderType.AGENT) {
      incUpdate.human_message_count = 1;
    }

    const update: Record<string, unknown> = {
      $inc: incUpdate,
      $set: { last_message_at: doc.created_at },
    };
    
    await ChatSession.findByIdAndUpdate(doc.session_id, update);
  } catch {
    // Log error but don't fail the save
    console.error("Failed to update session message count");
  }
});

// ============================================================================
// STATICS
// ============================================================================

/**
 * Get paginated messages for session
 */
ChatMessageSchema.statics.getForSession = async function (
  session_id: Types.ObjectId | string,
  options: { before?: string; limit?: number } = {}
): Promise<{ messages: IChatMessage[]; has_more: boolean }> {
  const limit = options.limit || 50;
  const query: Record<string, unknown> = { session_id };
  
  if (options.before) {
    query.created_at = { $lt: new Date(options.before) };
  }
  
  const messages = await this.find(query)
    .sort({ created_at: -1 })
    .limit(limit + 1);
  
  const has_more = messages.length > limit;
  if (has_more) {
    messages.pop();
  }
  
  return {
    messages: messages.reverse(), // Oldest first
    has_more,
  };
};

/**
 * Create user message
 */
ChatMessageSchema.statics.createUserMessage = async function (
  org_id: Types.ObjectId | string,
  session_id: Types.ObjectId | string,
  user_id: Types.ObjectId | string,
  content: string,
  attachments?: IChatMessage["attachments"]
): Promise<IChatMessage> {
  return this.create({
    org_id,
    session_id,
    sender_type: MessageSenderType.USER,
    sender_id: user_id,
    content,
    content_type: attachments?.length ? MessageContentType.FILE : MessageContentType.TEXT,
    attachments,
    delivered_at: new Date(),
  });
};

/**
 * Create AI response message
 */
ChatMessageSchema.statics.createAIMessage = async function (
  org_id: Types.ObjectId | string,
  session_id: Types.ObjectId | string,
  content: string,
  metadata?: {
    confidence?: number;
    intent?: string;
    entities?: Record<string, unknown>;
    suggested_actions?: string[];
  }
): Promise<IChatMessage> {
  return this.create({
    org_id,
    session_id,
    sender_type: MessageSenderType.AI,
    sender_name: "AI Agent",
    content,
    content_type: MessageContentType.TEXT,
    ai_confidence: metadata?.confidence,
    ai_intent: metadata?.intent,
    ai_entities: metadata?.entities,
    ai_suggested_actions: metadata?.suggested_actions,
    delivered_at: new Date(),
  });
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const ChatMessage = getModel<IChatMessage>("ChatMessage", ChatMessageSchema);
export default ChatMessage;
