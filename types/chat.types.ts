/**
 * AI Chat & Support Types
 * @module types/chat
 * @description AI chatbot and support functionality for Fixzit Souq Phase 2
 */

import type { ObjectId } from "mongodb";

// ============================================================================
// Chat Core Types
// ============================================================================

export type ChatSessionType = "ai" | "human" | "hybrid";
export type ChatSessionStatus = "active" | "waiting_human" | "resolved" | "closed" | "expired";
export type ChatCategory = "ad_inquiry" | "account_issue" | "reservations" | "property_search" | "billing" | "technical" | "general";
export type MessageSenderType = "user" | "ai" | "agent";
export type MessageContentType = "text" | "image" | "file" | "quick_action" | "system";

export interface IQuickAction {
  id: string;
  label: string;
  label_ar: string;
  category: ChatCategory;
  icon?: string;
}

export interface IChatAttachment {
  type: "image" | "file" | "document";
  url: string;
  filename: string;
  size: number;
  mime_type?: string;
  thumbnail_url?: string;
}

export interface IAIContext {
  company_name?: string;
  user_type?: string;
  previous_interactions: number;
  subscription_status?: string;
  preferred_language: "ar" | "en";
  last_topics?: string[];
}

export interface IChatSession {
  _id?: ObjectId | string;
  org_id: ObjectId | string;
  user_id: ObjectId | string;
  
  // Session Info
  type: ChatSessionType;
  category?: ChatCategory;
  status: ChatSessionStatus;
  
  // AI Context
  ai_context: IAIContext;
  
  // Assignment (for human support)
  assigned_agent_id?: ObjectId | string;
  escalated_at?: Date;
  escalation_reason?: string;
  queue_position?: number;
  
  // Metrics
  message_count: number;
  ai_message_count: number;
  human_message_count: number;
  avg_response_time_ms?: number;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  last_message_at?: Date;
  satisfaction_rating?: number; // 1-5
  satisfaction_feedback?: string;
  
  // Expiration
  expires_at?: Date;
}

export interface IChatMessage {
  _id?: ObjectId | string;
  org_id: ObjectId | string;
  session_id: ObjectId | string;
  
  // Message Content
  sender_type: MessageSenderType;
  sender_id?: ObjectId | string;
  sender_name?: string;
  content: string;
  content_type: MessageContentType;
  
  // Attachments
  attachments?: IChatAttachment[];
  
  // Quick Action (if triggered)
  quick_action?: {
    id: string;
    label: string;
    label_ar: string;
  };
  
  // AI Metadata
  ai_confidence?: number; // 0-1
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
// API Request/Response DTOs
// ============================================================================

export interface CreateSessionRequest {
  category?: ChatCategory;
  initial_message?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionResponse {
  session_id: string;
  type: ChatSessionType;
  welcome_message: string;
  welcome_message_ar: string;
  quick_actions: IQuickAction[];
  ai_context: Partial<IAIContext>;
}

export interface SendMessageRequest {
  content: string;
  content_type?: MessageContentType;
  attachments?: Array<{
    type: IChatAttachment["type"];
    file: File;
  }>;
  quick_action_id?: string;
}

export interface SendMessageResponse {
  message_id: string;
  ai_response?: {
    message_id: string;
    content: string;
    quick_actions?: IQuickAction[];
    suggested_articles?: Array<{
      id: string;
      title: string;
      title_ar: string;
      url: string;
    }>;
  };
}

export interface GetMessagesRequest {
  before?: string; // Message ID for pagination
  limit?: number;
}

export interface GetMessagesResponse {
  messages: IChatMessage[];
  has_more: boolean;
  oldest_message_id?: string;
}

export interface EscalateSessionRequest {
  reason?: string;
}

export interface EscalateSessionResponse {
  session_id: string;
  status: ChatSessionStatus;
  queue_position: number;
  estimated_wait_minutes: number;
}

export interface ResolveSessionRequest {
  satisfaction_rating?: number;
  satisfaction_feedback?: string;
}

export interface ResolveSessionResponse {
  session_id: string;
  status: ChatSessionStatus;
  resolved_at: Date;
}

export interface SessionListResponse {
  sessions: IChatSession[];
  total: number;
  has_more: boolean;
}

// ============================================================================
// UI Component Props
// ============================================================================

export interface AIChatWidgetProps {
  sessionId?: string;
  onClose: () => void;
  position?: "bottom-right" | "bottom-left" | "fullscreen";
  defaultCategory?: ChatCategory;
  className?: string;
}

export interface ChatBubbleProps {
  onClick: () => void;
  unreadCount?: number;
  isOpen?: boolean;
  position?: "bottom-right" | "bottom-left";
  className?: string;
}

export interface ChatMessageProps {
  message: IChatMessage;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export interface QuickActionsProps {
  actions: IQuickAction[];
  onActionClick: (action: IQuickAction) => void;
  disabled?: boolean;
  className?: string;
}

export interface ChatInputProps {
  onSend: (content: string, attachments?: File[]) => Promise<void>;
  onAttach?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  showGifPicker?: boolean;
  showAttachments?: boolean;
  className?: string;
}

export interface TypingIndicatorProps {
  senderName?: string;
  senderType: MessageSenderType;
  className?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export const DEFAULT_QUICK_ACTIONS: IQuickAction[] = [
  {
    id: "ad_inquiry",
    label: "Ad inquiry or problem",
    label_ar: "استفسار أو مشكلة في إعلاني",
    category: "ad_inquiry",
    icon: "document-text",
  },
  {
    id: "account_issue",
    label: "Account inquiry or problem",
    label_ar: "استفسار أو مشكلة بخصوص حسابي",
    category: "account_issue",
    icon: "user-circle",
  },
  {
    id: "reservations",
    label: "Reservations inquiry",
    label_ar: "استفسار أو مشكلة بخصوص الحجوزات",
    category: "reservations",
    icon: "calendar",
  },
  {
    id: "property_search",
    label: "I'm looking for a property",
    label_ar: "أنا باحث عن عقار",
    category: "property_search",
    icon: "home",
  },
];

export const CHAT_CATEGORY_CONFIG: Record<ChatCategory, {
  label: string;
  label_ar: string;
  icon: string;
  priority: number;
}> = {
  ad_inquiry: {
    label: "Ad Inquiry",
    label_ar: "استفسار إعلان",
    icon: "document-text",
    priority: 2,
  },
  account_issue: {
    label: "Account Issue",
    label_ar: "مشكلة في الحساب",
    icon: "user-circle",
    priority: 1,
  },
  reservations: {
    label: "Reservations",
    label_ar: "الحجوزات",
    icon: "calendar",
    priority: 2,
  },
  property_search: {
    label: "Property Search",
    label_ar: "البحث عن عقار",
    icon: "home",
    priority: 3,
  },
  billing: {
    label: "Billing",
    label_ar: "الفوترة",
    icon: "credit-card",
    priority: 1,
  },
  technical: {
    label: "Technical Support",
    label_ar: "الدعم التقني",
    icon: "cog",
    priority: 2,
  },
  general: {
    label: "General Inquiry",
    label_ar: "استفسار عام",
    icon: "chat-bubble-left-right",
    priority: 3,
  },
};

export const CHAT_SESSION_STATUS_CONFIG: Record<ChatSessionStatus, {
  label: string;
  label_ar: string;
  color: string;
}> = {
  active: {
    label: "Active",
    label_ar: "نشط",
    color: "text-green-600",
  },
  waiting_human: {
    label: "Waiting for Agent",
    label_ar: "بانتظار الموظف",
    color: "text-yellow-600",
  },
  resolved: {
    label: "Resolved",
    label_ar: "تم الحل",
    color: "text-blue-600",
  },
  closed: {
    label: "Closed",
    label_ar: "مغلق",
    color: "text-gray-600",
  },
  expired: {
    label: "Expired",
    label_ar: "منتهي",
    color: "text-gray-400",
  },
};

// AI System Prompt Templates
export const AI_SYSTEM_PROMPTS = {
  default: `You are a helpful AI assistant for Fixzit, a Saudi real estate platform. 
You help users with property listings, account issues, reservations, and general inquiries.
Always be polite, professional, and provide accurate information.
If you cannot help with a request, offer to connect the user with a human agent.
Respond in the same language the user is using (Arabic or English).`,
  
  property_search: `You are a real estate search assistant for Fixzit.
Help users find properties based on their requirements.
Ask about: location, property type, budget, rooms, and preferred features.
Provide relevant listings and suggest alternatives if exact matches aren't available.`,
  
  billing: `You are a billing support assistant for Fixzit.
Help users with subscription questions, payment issues, and invoice inquiries.
Always verify account ownership before sharing sensitive information.
For refunds or disputes, escalate to a human agent.`,
};
