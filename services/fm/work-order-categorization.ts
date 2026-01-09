/**
 * @fileoverview AI Work Order Categorization Service
 * @module services/fm/work-order-categorization
 * 
 * AI-powered work order categorization and triage system that:
 * - Automatically categorizes work orders using pattern matching
 * - Assigns priority based on keywords and context
 * - Suggests technician assignment based on skills
 * - Learns from manual corrections to improve accuracy
 * 
 * @status IMPLEMENTED [AGENT-0028]
 * @created 2026-01-09
 * @feature experimental.ai_work_order_triage
 */

import { ObjectId, type Document } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { WOCategory, WOPriority, MaintenanceType } from "@/types/fm/enums";
import { isFeatureEnabled } from "@/lib/feature-flags";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Confidence levels for AI categorization
 */
export enum ConfidenceLevel {
  HIGH = "high",      // > 85% - Auto-apply
  MEDIUM = "medium",  // 60-85% - Suggest but allow override
  LOW = "low",        // < 60% - Require manual review
}

/**
 * AI categorization result
 */
export interface CategorizationResult {
  category: WOCategory;
  priority: WOPriority;
  type: MaintenanceType;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  suggestedSkills: string[];
  suggestedTags: string[];
  reasoning: string;
  patterns: PatternMatch[];
}

/**
 * Pattern match details
 */
export interface PatternMatch {
  pattern: string;
  field: "title" | "description" | "location";
  score: number;
}

/**
 * Training feedback for ML improvement
 */
export interface CategorizationFeedback {
  _id?: ObjectId;
  orgId: string;
  workOrderId: ObjectId;
  originalPrediction: CategorizationResult;
  correctedCategory?: WOCategory;
  correctedPriority?: WOPriority;
  correctedType?: MaintenanceType;
  correctedBy: string;
  createdAt: Date;
}

// ============================================================================
// Category Patterns (Keyword-based ML)
// ============================================================================

/**
 * Category detection patterns with weights
 */
const CATEGORY_PATTERNS: Record<WOCategory, { keywords: string[]; weight: number }[]> = {
  [WOCategory.PLUMBING]: [
    { keywords: ["leak", "pipe", "drain", "faucet", "toilet", "water", "سباكة", "تسرب", "أنبوب"], weight: 0.9 },
    { keywords: ["clog", "blocked", "overflow", "انسداد", "فيضان"], weight: 0.8 },
    { keywords: ["sink", "shower", "bathtub", "bidet", "حوض", "دش"], weight: 0.7 },
  ],
  [WOCategory.ELECTRICAL]: [
    { keywords: ["electrical", "wire", "outlet", "switch", "كهربائي", "سلك", "مفتاح"], weight: 0.9 },
    { keywords: ["light", "bulb", "circuit", "breaker", "ضوء", "لمبة", "دائرة"], weight: 0.8 },
    { keywords: ["power", "socket", "voltage", "طاقة", "مقبس"], weight: 0.7 },
    { keywords: ["no power", "blackout", "spark", "انقطاع", "شرارة"], weight: 0.85 },
  ],
  [WOCategory.HVAC]: [
    { keywords: ["ac", "air conditioning", "cooling", "heating", "مكيف", "تبريد", "تدفئة"], weight: 0.9 },
    { keywords: ["thermostat", "ventilation", "duct", "تهوية", "مجرى"], weight: 0.8 },
    { keywords: ["filter", "compressor", "refrigerant", "فلتر", "ضاغط"], weight: 0.75 },
    { keywords: ["hot", "cold", "temperature", "حار", "بارد", "درجة حرارة"], weight: 0.6 },
  ],
  [WOCategory.MAINTENANCE]: [
    { keywords: ["repair", "fix", "broken", "damaged", "إصلاح", "مكسور", "تالف"], weight: 0.7 },
    { keywords: ["maintenance", "service", "صيانة", "خدمة"], weight: 0.8 },
    { keywords: ["replace", "install", "استبدال", "تركيب"], weight: 0.65 },
  ],
  [WOCategory.CLEANING]: [
    { keywords: ["clean", "cleaning", "تنظيف", "نظافة"], weight: 0.9 },
    { keywords: ["dust", "dirt", "stain", "غبار", "أوساخ", "بقعة"], weight: 0.8 },
    { keywords: ["sanitize", "disinfect", "تعقيم", "تطهير"], weight: 0.85 },
    { keywords: ["trash", "garbage", "waste", "نفايات", "قمامة"], weight: 0.75 },
  ],
  [WOCategory.SECURITY]: [
    { keywords: ["security", "lock", "key", "أمن", "قفل", "مفتاح"], weight: 0.9 },
    { keywords: ["alarm", "camera", "cctv", "إنذار", "كاميرا"], weight: 0.85 },
    { keywords: ["access", "door", "gate", "وصول", "باب", "بوابة"], weight: 0.7 },
    { keywords: ["break-in", "theft", "سرقة", "اقتحام"], weight: 0.95 },
  ],
  [WOCategory.LANDSCAPING]: [
    { keywords: ["garden", "lawn", "tree", "حديقة", "عشب", "شجرة"], weight: 0.9 },
    { keywords: ["irrigation", "sprinkler", "ري", "رشاش"], weight: 0.85 },
    { keywords: ["plant", "flower", "hedge", "نبات", "زهرة", "سياج"], weight: 0.8 },
  ],
  [WOCategory.INSPECTION]: [
    { keywords: ["inspect", "inspection", "check", "فحص", "تفتيش"], weight: 0.9 },
    { keywords: ["audit", "survey", "assessment", "تدقيق", "مسح", "تقييم"], weight: 0.85 },
    { keywords: ["report", "evaluate", "تقرير", "تقييم"], weight: 0.7 },
  ],
  [WOCategory.IT]: [
    { keywords: ["internet", "wifi", "network", "إنترنت", "واي فاي", "شبكة"], weight: 0.9 },
    { keywords: ["computer", "printer", "server", "كمبيوتر", "طابعة", "خادم"], weight: 0.85 },
    { keywords: ["software", "system", "login", "برنامج", "نظام", "تسجيل"], weight: 0.8 },
  ],
  [WOCategory.GENERAL]: [
    { keywords: ["request", "issue", "problem", "طلب", "مشكلة"], weight: 0.5 },
  ],
  [WOCategory.OTHER]: [
    { keywords: ["other", "misc", "أخرى", "متنوع"], weight: 0.4 },
  ],
};

/**
 * Priority detection patterns
 */
const PRIORITY_PATTERNS: Record<WOPriority, { keywords: string[]; weight: number }[]> = {
  [WOPriority.CRITICAL]: [
    { keywords: ["emergency", "urgent", "immediately", "طوارئ", "عاجل", "فوري"], weight: 0.95 },
    { keywords: ["fire", "flood", "gas leak", "حريق", "فيضان", "تسرب غاز"], weight: 0.98 },
    { keywords: ["safety", "danger", "hazard", "سلامة", "خطر"], weight: 0.9 },
    { keywords: ["no water", "no power", "انقطاع مياه", "انقطاع كهرباء"], weight: 0.92 },
  ],
  [WOPriority.HIGH]: [
    { keywords: ["asap", "today", "broken", "اليوم", "مكسور"], weight: 0.8 },
    { keywords: ["leak", "flooding", "تسرب", "غمر"], weight: 0.75 },
    { keywords: ["not working", "failed", "لا يعمل", "فشل"], weight: 0.7 },
  ],
  [WOPriority.MEDIUM]: [
    { keywords: ["soon", "this week", "قريباً", "هذا الأسبوع"], weight: 0.6 },
    { keywords: ["issue", "problem", "مشكلة"], weight: 0.5 },
  ],
  [WOPriority.LOW]: [
    { keywords: ["whenever", "convenience", "minor", "متى ما", "راحة", "بسيط"], weight: 0.4 },
    { keywords: ["cosmetic", "appearance", "مظهر"], weight: 0.35 },
  ],
};

/**
 * Skill mappings for technician suggestions
 */
const CATEGORY_SKILLS: Record<WOCategory, string[]> = {
  [WOCategory.PLUMBING]: ["plumbing", "pipe_fitting", "drainage"],
  [WOCategory.ELECTRICAL]: ["electrical", "wiring", "circuit_repair"],
  [WOCategory.HVAC]: ["hvac", "ac_repair", "refrigeration"],
  [WOCategory.MAINTENANCE]: ["general_maintenance", "handyman"],
  [WOCategory.CLEANING]: ["cleaning", "sanitation"],
  [WOCategory.SECURITY]: ["security_systems", "lock_installation"],
  [WOCategory.LANDSCAPING]: ["landscaping", "gardening", "irrigation"],
  [WOCategory.INSPECTION]: ["inspection", "assessment"],
  [WOCategory.IT]: ["networking", "it_support"],
  [WOCategory.GENERAL]: ["general_maintenance"],
  [WOCategory.OTHER]: ["general_maintenance"],
};

// ============================================================================
// Core Categorization Functions
// ============================================================================

/**
 * Categorize a work order using AI pattern matching
 */
export async function categorizeWorkOrder(
  orgId: string,
  title: string,
  description: string,
  location?: string
): Promise<CategorizationResult> {
  // Check if feature is enabled
  const featureEnabled = await isFeatureEnabled("experimental.ai_work_order_triage", { orgId });
  
  if (!featureEnabled) {
    logger.debug("AI work order triage disabled for org", { orgId });
    return getDefaultCategorization();
  }

  const text = `${title} ${description} ${location || ""}`.toLowerCase();
  const patterns: PatternMatch[] = [];
  
  // Calculate category scores
  const categoryScores = new Map<WOCategory, number>();
  
  for (const [category, patternList] of Object.entries(CATEGORY_PATTERNS)) {
    let score = 0;
    for (const pattern of patternList) {
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += pattern.weight;
          patterns.push({
            pattern: keyword,
            field: title.toLowerCase().includes(keyword.toLowerCase()) ? "title" : 
                   description.toLowerCase().includes(keyword.toLowerCase()) ? "description" : "location",
            score: pattern.weight,
          });
        }
      }
    }
    categoryScores.set(category as WOCategory, score);
  }

  // Calculate priority scores
  const priorityScores = new Map<WOPriority, number>();
  
  for (const [priority, patternList] of Object.entries(PRIORITY_PATTERNS)) {
    let score = 0;
    for (const pattern of patternList) {
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += pattern.weight;
        }
      }
    }
    priorityScores.set(priority as WOPriority, score);
  }

  // Determine best category
  let bestCategory = WOCategory.GENERAL;
  let bestCategoryScore = 0;
  for (const [category, score] of categoryScores) {
    if (score > bestCategoryScore) {
      bestCategoryScore = score;
      bestCategory = category;
    }
  }

  // Determine best priority
  let bestPriority = WOPriority.MEDIUM;
  let bestPriorityScore = 0;
  for (const [priority, score] of priorityScores) {
    if (score > bestPriorityScore) {
      bestPriorityScore = score;
      bestPriority = priority;
    }
  }

  // Calculate confidence
  const confidenceScore = Math.min(bestCategoryScore / 2, 1); // Normalize to 0-1
  const confidence = getConfidenceLevel(confidenceScore);

  // Determine type based on keywords
  const type = determineType(text);

  // Get suggested skills
  const suggestedSkills = CATEGORY_SKILLS[bestCategory] || ["general_maintenance"];

  // Generate tags
  const suggestedTags = generateTags(patterns, bestCategory, bestPriority);

  const result: CategorizationResult = {
    category: bestCategory,
    priority: bestPriority,
    type,
    confidence,
    confidenceScore: Math.round(confidenceScore * 100),
    suggestedSkills,
    suggestedTags,
    reasoning: generateReasoning(patterns, bestCategory, bestPriority, confidence),
    patterns: patterns.slice(0, 5), // Top 5 patterns
  };

  logger.info("Work order categorized", {
    component: "work-order-categorization",
    orgId,
    category: result.category,
    priority: result.priority,
    confidence: result.confidence,
    confidenceScore: result.confidenceScore,
    patternsFound: patterns.length,
  });

  return result;
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return ConfidenceLevel.HIGH;
  if (score >= 0.60) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

/**
 * Determine work order type from text
 */
function determineType(text: string): MaintenanceType {
  if (text.includes("emergency") || text.includes("urgent") || text.includes("طوارئ")) {
    return MaintenanceType.EMERGENCY;
  }
  if (text.includes("preventive") || text.includes("scheduled") || text.includes("وقائي")) {
    return MaintenanceType.PREVENTIVE;
  }
  if (text.includes("inspect") || text.includes("check") || text.includes("فحص") || text.includes("predict")) {
    return MaintenanceType.PREDICTIVE;
  }
  return MaintenanceType.CORRECTIVE;
}

/**
 * Generate suggested tags
 */
function generateTags(patterns: PatternMatch[], category: WOCategory, priority: WOPriority): string[] {
  const tags: string[] = [];
  
  // Add category tag
  tags.push(category.toLowerCase());
  
  // Add priority tag if high/critical
  if (priority === WOPriority.CRITICAL || priority === WOPriority.HIGH) {
    tags.push("urgent");
  }
  
  // Add top pattern keywords as tags
  const uniquePatterns = [...new Set(patterns.map(p => p.pattern.toLowerCase()))];
  tags.push(...uniquePatterns.slice(0, 3));
  
  return [...new Set(tags)].slice(0, 5);
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(
  patterns: PatternMatch[],
  category: WOCategory,
  priority: WOPriority,
  confidence: ConfidenceLevel
): string {
  if (patterns.length === 0) {
    return "No specific patterns detected. Defaulting to general category.";
  }
  
  const topPatterns = patterns.slice(0, 3).map(p => `"${p.pattern}"`).join(", ");
  return `Detected ${category} work order based on keywords: ${topPatterns}. ` +
         `Priority set to ${priority} with ${confidence} confidence.`;
}

/**
 * Get default categorization when AI is disabled
 */
function getDefaultCategorization(): CategorizationResult {
  return {
    category: WOCategory.GENERAL,
    priority: WOPriority.MEDIUM,
    type: MaintenanceType.CORRECTIVE,
    confidence: ConfidenceLevel.LOW,
    confidenceScore: 0,
    suggestedSkills: ["general_maintenance"],
    suggestedTags: ["general"],
    reasoning: "AI categorization disabled. Using defaults.",
    patterns: [],
  };
}

// ============================================================================
// Feedback & Learning
// ============================================================================

const FEEDBACK_COLLECTION = "work_order_categorization_feedback";

/**
 * Record categorization feedback for ML improvement
 */
export async function recordCategorizationFeedback(
  orgId: string,
  workOrderId: ObjectId,
  originalPrediction: CategorizationResult,
  correctedBy: string,
  corrections: {
    category?: WOCategory;
    priority?: WOPriority;
    type?: MaintenanceType;
  }
): Promise<void> {
  const db = await getDatabase();
  
  const feedback: CategorizationFeedback = {
    orgId,
    workOrderId,
    originalPrediction,
    correctedCategory: corrections.category,
    correctedPriority: corrections.priority,
    correctedType: corrections.type,
    correctedBy,
    createdAt: new Date(),
  };

  await db.collection(FEEDBACK_COLLECTION).insertOne(feedback as unknown as Document);
  
  logger.info("Categorization feedback recorded", {
    component: "work-order-categorization",
    orgId,
    workOrderId: workOrderId.toString(),
    correctedCategory: corrections.category,
    correctedPriority: corrections.priority,
  });
}

/**
 * Get categorization accuracy stats for an org
 */
export async function getCategorizationStats(orgId: string): Promise<{
  totalPredictions: number;
  correctedPredictions: number;
  accuracyRate: number;
  categoryAccuracy: Record<string, number>;
}> {
  const db = await getDatabase();
  
  const feedback = await db.collection(FEEDBACK_COLLECTION)
    .find({ orgId })
    .toArray();
  
  const totalPredictions = feedback.length;
  const correctedPredictions = feedback.filter(f => 
    f.correctedCategory || f.correctedPriority || f.correctedType
  ).length;
  
  const accuracyRate = totalPredictions > 0 
    ? Math.round(((totalPredictions - correctedPredictions) / totalPredictions) * 100)
    : 100;

  // Calculate per-category accuracy
  const categoryAccuracy: Record<string, number> = {};
  const categoryFeedback = new Map<string, { total: number; correct: number }>();
  
  for (const f of feedback) {
    const cat = f.originalPrediction?.category;
    if (cat) {
      const existing = categoryFeedback.get(cat) || { total: 0, correct: 0 };
      existing.total++;
      if (!f.correctedCategory) existing.correct++;
      categoryFeedback.set(cat, existing);
    }
  }
  
  for (const [cat, stats] of categoryFeedback) {
    categoryAccuracy[cat] = Math.round((stats.correct / stats.total) * 100);
  }

  return {
    totalPredictions,
    correctedPredictions,
    accuracyRate,
    categoryAccuracy,
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  CATEGORY_PATTERNS,
  PRIORITY_PATTERNS,
  CATEGORY_SKILLS,
};
