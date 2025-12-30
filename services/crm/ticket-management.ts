/**
 * @fileoverview AI-Powered Ticket Management Service
 * @module services/crm/ticket-management
 * 
 * Enterprise support ticket system with:
 * - AI-powered ticket routing and prioritization
 * - Sentiment analysis for urgency detection
 * - Auto-response suggestions
 * - SLA tracking and escalation
 * - Customer satisfaction tracking
 * - Multi-channel intake (email, chat, form, phone)
 * 
 * @status IMPLEMENTED [AGENT-001-A]
 * @created 2025-12-29
 */

import { ObjectId, type WithId, type Document } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Ticket priority levels
 */
export enum TicketPriority {
  CRITICAL = "critical", // 1 hour response SLA
  HIGH = "high",         // 4 hour response SLA
  MEDIUM = "medium",     // 24 hour response SLA
  LOW = "low",           // 48 hour response SLA
}

/**
 * Ticket status
 */
export enum TicketStatus {
  NEW = "new",
  OPEN = "open",
  PENDING_CUSTOMER = "pending_customer",
  PENDING_INTERNAL = "pending_internal",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
  REOPENED = "reopened",
}

/**
 * Ticket category
 */
export enum TicketCategory {
  BILLING = "billing",
  TECHNICAL = "technical",
  ACCOUNT = "account",
  PROPERTY = "property",
  MAINTENANCE = "maintenance",
  LEASE = "lease",
  PAYMENT = "payment",
  VENDOR = "vendor",
  COMPLIANCE = "compliance",
  FEEDBACK = "feedback",
  OTHER = "other",
}

/**
 * Ticket channel
 */
export enum TicketChannel {
  EMAIL = "email",
  FORM = "form",
  CHAT = "chat",
  PHONE = "phone",
  INTERNAL = "internal",
}

/**
 * Sentiment level
 */
export enum SentimentLevel {
  VERY_NEGATIVE = "very_negative",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
  POSITIVE = "positive",
  VERY_POSITIVE = "very_positive",
}

/**
 * Support ticket record
 */
export interface SupportTicket {
  _id?: ObjectId;
  orgId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  subCategory?: string;
  priority: TicketPriority;
  status: TicketStatus;
  channel: TicketChannel;
  
  // Customer info
  customer: CustomerInfo;
  
  // Assignment
  assignedTo?: string;
  assignedTeam?: string;
  escalationLevel: number;
  
  // AI Analysis
  aiAnalysis?: AIAnalysis;
  
  // SLA tracking
  sla: SLAInfo;
  
  // Conversation
  messages: TicketMessage[];
  
  // Related entities
  relatedEntities: RelatedEntity[];
  
  // Metadata
  tags: string[];
  customFields: Record<string, unknown>;
  internalNotes: InternalNote[];
  
  // Satisfaction
  satisfaction?: SatisfactionRating;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

/**
 * Customer information
 */
export interface CustomerInfo {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  preferredLanguage: "en" | "ar";
  customerSince?: Date;
  totalTickets?: number;
  satisfaction?: number;
}

/**
 * AI analysis results
 */
export interface AIAnalysis {
  suggestedCategory: TicketCategory;
  categoryConfidence: number;
  suggestedPriority: TicketPriority;
  priorityConfidence: number;
  sentiment: SentimentLevel;
  sentimentScore: number;
  keywords: string[];
  suggestedResponses: SuggestedResponse[];
  suggestedAssignee?: string;
  suggestedTeam?: string;
  urgencyIndicators: string[];
  analyzedAt: Date;
}

/**
 * Suggested response
 */
export interface SuggestedResponse {
  id: string;
  type: "template" | "ai_generated";
  content: string;
  contentAr?: string;
  confidence: number;
  source?: string;
}

/**
 * SLA information
 */
export interface SLAInfo {
  responseDeadline: Date;
  resolutionDeadline: Date;
  firstResponseMet?: boolean;
  resolutionMet?: boolean;
  breachedAt?: Date;
  pausedAt?: Date;
  pausedDuration: number; // minutes
  escalatedAt?: Date;
}

/**
 * Ticket message
 */
export interface TicketMessage {
  id: string;
  type: "customer" | "agent" | "system" | "ai_suggestion";
  content: string;
  contentHtml?: string;
  authorId: string;
  authorName: string;
  authorType: "customer" | "agent" | "system";
  attachments?: Attachment[];
  isPrivate: boolean;
  createdAt: Date;
}

/**
 * Attachment
 */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

/**
 * Related entity
 */
export interface RelatedEntity {
  type: "property" | "unit" | "lease" | "work_order" | "invoice" | "vendor";
  id: string;
  name: string;
}

/**
 * Internal note
 */
export interface InternalNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

/**
 * Satisfaction rating
 */
export interface SatisfactionRating {
  score: number; // 1-5
  feedback?: string;
  ratedAt: Date;
}

/**
 * Create ticket request
 */
export interface CreateTicketRequest {
  orgId: string;
  subject: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  channel: TicketChannel;
  customer: CustomerInfo;
  attachments?: Attachment[];
  relatedEntities?: RelatedEntity[];
  tags?: string[];
  customFields?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

const TICKETS_COLLECTION = "support_tickets";
const TEMPLATES_COLLECTION = "response_templates";

// SLA definitions in minutes
const SLA_RESPONSE_TIMES: Record<TicketPriority, number> = {
  [TicketPriority.CRITICAL]: 60,      // 1 hour
  [TicketPriority.HIGH]: 240,         // 4 hours
  [TicketPriority.MEDIUM]: 1440,      // 24 hours
  [TicketPriority.LOW]: 2880,         // 48 hours
};

const SLA_RESOLUTION_TIMES: Record<TicketPriority, number> = {
  [TicketPriority.CRITICAL]: 240,     // 4 hours
  [TicketPriority.HIGH]: 1440,        // 24 hours
  [TicketPriority.MEDIUM]: 4320,      // 3 days
  [TicketPriority.LOW]: 10080,        // 7 days
};

// Urgency keywords for AI analysis
const URGENCY_KEYWORDS = {
  critical: [
    "urgent", "emergency", "immediately", "asap", "critical", "crisis",
    "عاجل", "طوارئ", "فوري", "حرج", "أزمة"
  ],
  high: [
    "important", "soon", "priority", "serious", "major",
    "مهم", "قريبا", "أولوية", "خطير", "رئيسي"
  ],
  negative: [
    "angry", "frustrated", "disappointed", "terrible", "worst", "unacceptable",
    "غاضب", "محبط", "خيبة أمل", "سيء", "غير مقبول"
  ],
};

// Category keywords for AI classification
const CATEGORY_KEYWORDS: Record<TicketCategory, string[]> = {
  [TicketCategory.BILLING]: [
    "invoice", "payment", "charge", "bill", "refund", "credit", "subscription",
    "فاتورة", "دفع", "رسوم", "استرداد", "اشتراك"
  ],
  [TicketCategory.TECHNICAL]: [
    "error", "bug", "crash", "not working", "broken", "issue", "problem",
    "خطأ", "عطل", "لا يعمل", "مشكلة"
  ],
  [TicketCategory.ACCOUNT]: [
    "login", "password", "access", "account", "profile", "settings",
    "تسجيل دخول", "كلمة مرور", "حساب", "ملف شخصي"
  ],
  [TicketCategory.PROPERTY]: [
    "property", "building", "unit", "apartment", "villa", "compound",
    "عقار", "مبنى", "وحدة", "شقة", "فيلا", "مجمع"
  ],
  [TicketCategory.MAINTENANCE]: [
    "repair", "fix", "maintenance", "broken", "damage", "service request",
    "إصلاح", "صيانة", "عطل", "ضرر", "طلب خدمة"
  ],
  [TicketCategory.LEASE]: [
    "lease", "contract", "rent", "rental", "tenant", "move in", "move out",
    "إيجار", "عقد", "مستأجر", "انتقال"
  ],
  [TicketCategory.PAYMENT]: [
    "pay", "transaction", "card", "bank", "transfer",
    "دفع", "معاملة", "بطاقة", "بنك", "تحويل"
  ],
  [TicketCategory.VENDOR]: [
    "vendor", "contractor", "supplier", "service provider",
    "مورد", "مقاول", "مزود خدمة"
  ],
  [TicketCategory.COMPLIANCE]: [
    "zatca", "ejar", "legal", "regulation", "violation",
    "زاتكا", "إيجار", "قانوني", "نظام", "مخالفة"
  ],
  [TicketCategory.FEEDBACK]: [
    "feedback", "suggestion", "improve", "feature request",
    "ملاحظة", "اقتراح", "تحسين", "طلب ميزة"
  ],
  [TicketCategory.OTHER]: [],
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create a new support ticket
 * 
 * Note: Ensure a unique index exists on the tickets collection:
 *   db.tickets.createIndex({ orgId: 1, ticketNumber: 1 }, { unique: true })
 */
export async function createTicket(
  request: CreateTicketRequest
): Promise<{ success: boolean; ticketId?: string; ticketNumber?: string; error?: string }> {
  const MAX_RETRIES = 3;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const db = await getDatabase();
      
      // Generate ticket number atomically
      const ticketNumber = await generateTicketNumber(request.orgId);
      
      // Run AI analysis
      const aiAnalysis = await analyzeTicket(request.subject, request.description);
      
      // Determine category and priority
      const category = request.category || aiAnalysis.suggestedCategory;
      const priority = request.priority || aiAnalysis.suggestedPriority;
      
      // Calculate SLA deadlines
      const now = new Date();
      const sla: SLAInfo = {
        responseDeadline: new Date(now.getTime() + SLA_RESPONSE_TIMES[priority] * 60 * 1000),
        resolutionDeadline: new Date(now.getTime() + SLA_RESOLUTION_TIMES[priority] * 60 * 1000),
        pausedDuration: 0,
      };
      
      // Create initial message
      const initialMessage: TicketMessage = {
        id: new ObjectId().toString(),
        type: "customer",
        content: request.description,
        authorId: request.customer.userId,
        authorName: request.customer.name,
        authorType: "customer",
        attachments: request.attachments,
        isPrivate: false,
        createdAt: now,
      };
      
      const ticket: Omit<SupportTicket, "_id"> = {
        orgId: request.orgId,
        ticketNumber,
        subject: request.subject,
        description: request.description,
        category,
        priority,
        status: TicketStatus.NEW,
        channel: request.channel,
        customer: request.customer,
        escalationLevel: 0,
        aiAnalysis,
        sla,
        messages: [initialMessage],
        relatedEntities: request.relatedEntities || [],
        tags: request.tags || [],
        customFields: request.customFields || {},
        internalNotes: [],
        createdAt: now,
        updatedAt: now,
      };
      
      // Auto-assign if AI suggests
      if (aiAnalysis.suggestedAssignee) {
        ticket.assignedTo = aiAnalysis.suggestedAssignee;
      }
      if (aiAnalysis.suggestedTeam) {
        ticket.assignedTeam = aiAnalysis.suggestedTeam;
      }
      
      const result = await db.collection(TICKETS_COLLECTION).insertOne(ticket);
      
      logger.info("Support ticket created", {
        component: "ticket-management",
        action: "createTicket",
      });
      
      return {
        success: true,
        ticketId: result.insertedId.toString(),
        ticketNumber,
      };
    } catch (error) {
      // Check for duplicate key error (code 11000) and retry
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000 && attempt < MAX_RETRIES) {
        logger.warn("Duplicate ticket number, retrying", {
          component: "ticket-management",
          attempt,
        });
        continue; // Retry with new ticket number
      }
      
      logger.error("Failed to create ticket", { component: "ticket-management" });
      return { success: false, error: "Failed to create ticket" };
    }
  }
  
  // Should not reach here, but guard against it
  return { success: false, error: "Failed to create ticket after retries" };
}

/**
 * Add message to ticket
 */
export async function addMessage(
  ticketId: string,
  orgId: string,
  message: Omit<TicketMessage, "id" | "createdAt">
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    const messageId = new ObjectId().toString();
    const fullMessage: TicketMessage = {
      ...message,
      id: messageId,
      createdAt: new Date(),
    };
    
    // Determine new status based on message type
    let newStatus: TicketStatus | undefined;
    if (message.authorType === "customer") {
      newStatus = TicketStatus.OPEN;
    } else if (message.authorType === "agent" && !message.isPrivate) {
      newStatus = TicketStatus.PENDING_CUSTOMER;
    }
    
    // Check if ticket exists first
    const ticket = await getTicket(ticketId, orgId);
    if (!ticket) {
      logger.error("Ticket not found for adding message", {
        component: "ticket-management",
        ticketId,
        orgId,
      });
      return { success: false, error: "Ticket not found" };
    }
    
    // Check if this is first response (public agent message only)
    const isFirstResponse = message.authorType === "agent" && !ticket.firstResponseAt && !message.isPrivate;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $push: { messages: fullMessage },
      $set: { updatedAt: new Date() },
    };
    
    if (newStatus) {
      updateOp.$set.status = newStatus;
    }
    
    if (isFirstResponse) {
      updateOp.$set.firstResponseAt = new Date();
      // Guard against missing sla or responseDeadline
      if (ticket.sla?.responseDeadline) {
        updateOp.$set["sla.firstResponseMet"] = new Date() <= ticket.sla.responseDeadline;
      } else {
        updateOp.$set["sla.firstResponseMet"] = false;
      }
    }
    
    await db.collection(TICKETS_COLLECTION).updateOne(
      { _id: new ObjectId(ticketId), orgId },
      updateOp
    );
    
    return { success: true, messageId };
  } catch (_error) {
    logger.error("Failed to add message", { component: "ticket-management" });
    return { success: false, error: "Failed to add message" };
  }
}

/**
 * Resolve ticket
 */
export async function resolveTicket(
  ticketId: string,
  orgId: string,
  resolution: string,
  agentId: string,
  agentName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const ticket = await getTicket(ticketId, orgId);
    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }
    
    const now = new Date();
    
    // Defensively check for SLA and valid resolutionDeadline
    let resolutionMet = false;
    if (ticket.sla?.resolutionDeadline) {
      const deadline = ticket.sla.resolutionDeadline instanceof Date
        ? ticket.sla.resolutionDeadline
        : new Date(ticket.sla.resolutionDeadline);
      resolutionMet = !isNaN(deadline.getTime()) && now <= deadline;
    }
    
    // Add resolution message
    const resolutionMessage: TicketMessage = {
      id: new ObjectId().toString(),
      type: "agent",
      content: resolution,
      authorId: agentId,
      authorName: agentName,
      authorType: "agent",
      isPrivate: false,
      createdAt: now,
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: {
        status: TicketStatus.RESOLVED,
        resolvedAt: now,
        updatedAt: now,
        "sla.resolutionMet": resolutionMet,
      },
      $push: { messages: resolutionMessage },
    };
    
    await db.collection(TICKETS_COLLECTION).updateOne(
      { _id: new ObjectId(ticketId), orgId },
      updateOp
    );
    
    logger.info("Ticket resolved", {
      component: "ticket-management",
      action: "resolveTicket",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to resolve ticket", { component: "ticket-management" });
    return { success: false, error: "Failed to resolve ticket" };
  }
}

/**
 * Escalate ticket
 */
export async function escalateTicket(
  ticketId: string,
  orgId: string,
  reason: string,
  agentId: string,
  agentName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const ticket = await getTicket(ticketId, orgId);
    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }
    
    const newLevel = ticket.escalationLevel + 1;
    
    // Add internal note
    const note: InternalNote = {
      id: new ObjectId().toString(),
      content: `Escalated to level ${newLevel}: ${reason}`,
      authorId: agentId,
      authorName: agentName,
      createdAt: new Date(),
    };
    
    // Increase priority if not already critical
    let newPriority = ticket.priority;
    if (newLevel >= 2 && ticket.priority !== TicketPriority.CRITICAL) {
      if (ticket.priority === TicketPriority.LOW) {
        newPriority = TicketPriority.MEDIUM;
      } else if (ticket.priority === TicketPriority.MEDIUM) {
        newPriority = TicketPriority.HIGH;
      } else if (ticket.priority === TicketPriority.HIGH) {
        newPriority = TicketPriority.CRITICAL;
      }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: {
        escalationLevel: newLevel,
        priority: newPriority,
        "sla.escalatedAt": new Date(),
        updatedAt: new Date(),
      },
      $push: { internalNotes: note },
    };
    
    await db.collection(TICKETS_COLLECTION).updateOne(
      { _id: new ObjectId(ticketId), orgId },
      updateOp
    );
    
    logger.info("Ticket escalated", {
      component: "ticket-management",
      action: "escalateTicket",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to escalate ticket", { component: "ticket-management" });
    return { success: false, error: "Failed to escalate ticket" };
  }
}

/**
 * Assign ticket
 */
export async function assignTicket(
  ticketId: string,
  orgId: string,
  assigneeId: string,
  teamId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const updateData: Record<string, unknown> = {
      assignedTo: assigneeId,
      status: TicketStatus.OPEN,
      updatedAt: new Date(),
    };
    
    if (teamId) {
      updateData.assignedTeam = teamId;
    }
    
    const result = await db.collection(TICKETS_COLLECTION).updateOne(
      { _id: new ObjectId(ticketId), orgId },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      logger.warn("Ticket not found for assignment", {
        component: "ticket-management",
        ticketId,
        orgId,
      });
      return { success: false, error: "Ticket not found" };
    }
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to assign ticket", { component: "ticket-management" });
    return { success: false, error: "Failed to assign ticket" };
  }
}

/**
 * Rate satisfaction
 */
export async function rateSatisfaction(
  ticketId: string,
  orgId: string,
  score: number,
  feedback?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    if (score < 1 || score > 5) {
      return { success: false, error: "Score must be between 1 and 5" };
    }
    
    const satisfaction: SatisfactionRating = {
      score,
      feedback,
      ratedAt: new Date(),
    };
    
    const result = await db.collection(TICKETS_COLLECTION).updateOne(
      { _id: new ObjectId(ticketId), orgId },
      {
        $set: {
          satisfaction,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      logger.warn("Ticket not found for satisfaction rating", {
        component: "ticket-management",
        ticketId,
        orgId,
      });
      return { success: false, error: "Ticket not found" };
    }
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to rate satisfaction", { component: "ticket-management" });
    return { success: false, error: "Failed to rate satisfaction" };
  }
}

// ============================================================================
// AI Analysis Functions
// ============================================================================

/**
 * Analyze ticket with AI
 */
async function analyzeTicket(
  subject: string,
  description: string
): Promise<AIAnalysis> {
  const text = `${subject} ${description}`.toLowerCase();
  
  // Analyze category
  const categoryResult = analyzeCategory(text);
  
  // Analyze sentiment
  const sentimentResult = analyzeSentiment(text);
  
  // Analyze priority
  const priorityResult = analyzePriority(text, sentimentResult);
  
  // Extract keywords
  const keywords = extractKeywords(text);
  
  // Get suggested responses
  const suggestedResponses = await getSuggestedResponses(
    categoryResult.category,
    keywords
  );
  
  return {
    suggestedCategory: categoryResult.category,
    categoryConfidence: categoryResult.confidence,
    suggestedPriority: priorityResult.priority,
    priorityConfidence: priorityResult.confidence,
    sentiment: sentimentResult.level,
    sentimentScore: sentimentResult.score,
    keywords,
    suggestedResponses,
    urgencyIndicators: priorityResult.indicators,
    analyzedAt: new Date(),
  };
}

/**
 * Analyze category from text
 */
function analyzeCategory(text: string): { category: TicketCategory; confidence: number } {
  let bestCategory = TicketCategory.OTHER;
  let bestScore = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as TicketCategory;
    }
  }
  
  const confidence = bestScore > 0 ? Math.min(bestScore / 3, 1) : 0.3;
  return { category: bestCategory, confidence };
}

/**
 * Analyze sentiment from text
 */
function analyzeSentiment(text: string): { level: SentimentLevel; score: number } {
  let negativeScore = 0;
  let positiveScore = 0;
  
  // Check negative indicators
  for (const keyword of URGENCY_KEYWORDS.negative) {
    if (text.includes(keyword.toLowerCase())) {
      negativeScore++;
    }
  }
  
  // Simple positive keywords
  const positiveKeywords = [
    "thank", "great", "excellent", "good", "appreciate",
    "شكر", "ممتاز", "جيد", "رائع"
  ];
  
  for (const keyword of positiveKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      positiveScore++;
    }
  }
  
  // Calculate score (-1 to 1)
  const totalScore = (positiveScore - negativeScore) / Math.max(positiveScore + negativeScore, 1);
  
  let level: SentimentLevel;
  if (totalScore <= -0.6) {
    level = SentimentLevel.VERY_NEGATIVE;
  } else if (totalScore <= -0.2) {
    level = SentimentLevel.NEGATIVE;
  } else if (totalScore >= 0.6) {
    level = SentimentLevel.VERY_POSITIVE;
  } else if (totalScore >= 0.2) {
    level = SentimentLevel.POSITIVE;
  } else {
    level = SentimentLevel.NEUTRAL;
  }
  
  return { level, score: totalScore };
}

/**
 * Analyze priority from text
 */
function analyzePriority(
  text: string,
  sentiment: { level: SentimentLevel; score: number }
): { priority: TicketPriority; confidence: number; indicators: string[] } {
  const indicators: string[] = [];
  let priorityScore = 0;
  
  // Check critical keywords
  for (const keyword of URGENCY_KEYWORDS.critical) {
    if (text.includes(keyword.toLowerCase())) {
      priorityScore += 3;
      indicators.push(keyword);
    }
  }
  
  // Check high priority keywords
  for (const keyword of URGENCY_KEYWORDS.high) {
    if (text.includes(keyword.toLowerCase())) {
      priorityScore += 2;
      indicators.push(keyword);
    }
  }
  
  // Negative sentiment increases priority
  if (sentiment.level === SentimentLevel.VERY_NEGATIVE) {
    priorityScore += 2;
    indicators.push("very_negative_sentiment");
  } else if (sentiment.level === SentimentLevel.NEGATIVE) {
    priorityScore += 1;
    indicators.push("negative_sentiment");
  }
  
  // Determine priority
  let priority: TicketPriority;
  if (priorityScore >= 5) {
    priority = TicketPriority.CRITICAL;
  } else if (priorityScore >= 3) {
    priority = TicketPriority.HIGH;
  } else if (priorityScore >= 1) {
    priority = TicketPriority.MEDIUM;
  } else {
    priority = TicketPriority.LOW;
  }
  
  const confidence = Math.min(priorityScore / 5, 1);
  return { priority, confidence, indicators };
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const allKeywords = new Set<string>();
  
  for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        allKeywords.add(keyword);
      }
    }
  }
  
  return Array.from(allKeywords).slice(0, 10);
}

/**
 * Get suggested responses based on category and keywords
 */
async function getSuggestedResponses(
  category: TicketCategory,
  _keywords: string[]
): Promise<SuggestedResponse[]> {
  try {
    const db = await getDatabase();
    
    // Get templates for category
    const templates = await db.collection(TEMPLATES_COLLECTION)
      .find({ category, isActive: true })
      .limit(3)
      .toArray();
    
    const responses: SuggestedResponse[] = templates.map((t, i) => ({
      id: t._id.toString(),
      type: "template" as const,
      content: t.content,
      contentAr: t.contentAr,
      confidence: 0.8 - (i * 0.1),
      source: t.name,
    }));
    
    return responses;
  } catch (_error) {
    return [];
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get ticket by ID
 */
export async function getTicket(
  ticketId: string,
  orgId: string
): Promise<SupportTicket | null> {
  try {
    const db = await getDatabase();
    
    const ticket = await db.collection(TICKETS_COLLECTION).findOne({
      _id: new ObjectId(ticketId),
      orgId,
    }) as WithId<Document> | null;
    
    return ticket as unknown as SupportTicket | null;
  } catch (_error) {
    return null;
  }
}

/**
 * List tickets with filters
 */
export async function listTickets(
  orgId: string,
  filters: {
    status?: TicketStatus[];
    priority?: TicketPriority[];
    category?: TicketCategory[];
    assignedTo?: string;
    customerId?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
  },
  options?: { page?: number; limit?: number; sort?: string }
): Promise<{ tickets: SupportTicket[]; total: number }> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { orgId };
    
    if (filters.status?.length) {
      query.status = { $in: filters.status };
    }
    if (filters.priority?.length) {
      query.priority = { $in: filters.priority };
    }
    if (filters.category?.length) {
      query.category = { $in: filters.category };
    }
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }
    if (filters.customerId) {
      query["customer.userId"] = filters.customerId;
    }
    if (filters.search) {
      // Escape regex special characters to prevent injection/ReDoS
      const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { subject: { $regex: escapedSearch, $options: "i" } },
        { ticketNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    }
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }
    
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;
    
    const [tickets, total] = await Promise.all([
      db.collection(TICKETS_COLLECTION)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(TICKETS_COLLECTION).countDocuments(query),
    ]);
    
    return {
      tickets: tickets as unknown as SupportTicket[],
      total,
    };
  } catch (_error) {
    logger.error("Failed to list tickets", { component: "ticket-management" });
    return { tickets: [], total: 0 };
  }
}

/**
 * Get SLA breach report
 */
export async function getSLABreachReport(
  orgId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<{
  totalTickets: number;
  breachedResponse: number;
  breachedResolution: number;
  responseRate: number;
  resolutionRate: number;
}> {
  try {
    const db = await getDatabase();
    
    const pipeline = [
      {
        $match: {
          orgId,
          createdAt: { $gte: dateFrom, $lte: dateTo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          responseMet: {
            $sum: { $cond: [{ $eq: ["$sla.firstResponseMet", true] }, 1, 0] },
          },
          resolutionMet: {
            $sum: { $cond: [{ $eq: ["$sla.resolutionMet", true] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $ne: ["$resolvedAt", null] }, 1, 0] },
          },
          responded: {
            $sum: { $cond: [{ $ne: ["$firstResponseAt", null] }, 1, 0] },
          },
        },
      },
    ];
    
    const results = await db.collection(TICKETS_COLLECTION)
      .aggregate(pipeline)
      .toArray();
    
    const data = results[0] || {
      total: 0,
      responseMet: 0,
      resolutionMet: 0,
      responded: 0,
      resolved: 0,
    };
    
    return {
      totalTickets: data.total,
      breachedResponse: data.responded - data.responseMet,
      breachedResolution: data.resolved - data.resolutionMet,
      responseRate: data.responded > 0 ? Math.round((data.responseMet / data.responded) * 100) : 100,
      resolutionRate: data.resolved > 0 ? Math.round((data.resolutionMet / data.resolved) * 100) : 100,
    };
  } catch (_error) {
    logger.error("Failed to get SLA report", { component: "ticket-management" });
    return {
      totalTickets: 0,
      breachedResponse: 0,
      breachedResolution: 0,
      responseRate: 100,
      resolutionRate: 100,
    };
  }
}

/**
 * Get satisfaction stats
 */
export async function getSatisfactionStats(
  orgId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<{
  averageScore: number;
  totalRatings: number;
  distribution: Record<number, number>;
}> {
  try {
    const db = await getDatabase();
    
    const pipeline = [
      {
        $match: {
          orgId,
          "satisfaction.ratedAt": { $gte: dateFrom, $lte: dateTo },
        },
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$satisfaction.score" },
          total: { $sum: 1 },
          score1: { $sum: { $cond: [{ $eq: ["$satisfaction.score", 1] }, 1, 0] } },
          score2: { $sum: { $cond: [{ $eq: ["$satisfaction.score", 2] }, 1, 0] } },
          score3: { $sum: { $cond: [{ $eq: ["$satisfaction.score", 3] }, 1, 0] } },
          score4: { $sum: { $cond: [{ $eq: ["$satisfaction.score", 4] }, 1, 0] } },
          score5: { $sum: { $cond: [{ $eq: ["$satisfaction.score", 5] }, 1, 0] } },
        },
      },
    ];
    
    const results = await db.collection(TICKETS_COLLECTION)
      .aggregate(pipeline)
      .toArray();
    
    const data = results[0];
    
    return {
      averageScore: data ? Math.round(data.avgScore * 10) / 10 : 0,
      totalRatings: data?.total || 0,
      distribution: {
        1: data?.score1 || 0,
        2: data?.score2 || 0,
        3: data?.score3 || 0,
        4: data?.score4 || 0,
        5: data?.score5 || 0,
      },
    };
  } catch (_error) {
    logger.error("Failed to get satisfaction stats", { component: "ticket-management" });
    return {
      averageScore: 0,
      totalRatings: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique ticket number atomically using a counter collection
 */
async function generateTicketNumber(orgId: string): Promise<string> {
  const db = await getDatabase();
  const year = new Date().getFullYear().toString().slice(-2);
  const counterKey = `ticket-${orgId}-${year}`;
  
  // Atomic increment on counter document
  // Use string _id directly for counter keys (not ObjectId)
  const result = await db.collection<{ _id: string; seq: number }>("counters").findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 }, $setOnInsert: { _id: counterKey } },
    { upsert: true, returnDocument: "after" }
  );
  
  // Read sequence from result directly (MongoDB driver v6+ returns document directly)
  const sequence = result?.seq ?? 1;
  return `TKT-${year}-${String(sequence).padStart(6, "0")}`;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  createTicket,
  addMessage,
  resolveTicket,
  escalateTicket,
  assignTicket,
  rateSatisfaction,
  getTicket,
  listTickets,
  getSLABreachReport,
  getSatisfactionStats,
};
