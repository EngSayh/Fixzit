/**
 * @fileoverview AI Expense Categorization Service
 * @module services/finance/expense-categorization
 * 
 * AI-powered expense categorization and analysis system that:
 * - Automatically categorizes expenses using ML patterns
 * - Learns from manual corrections to improve accuracy
 * - Detects anomalies and potential duplicates
 * - Provides spending insights and trends
 * - Supports multi-currency expense tracking
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
 * Expense categories aligned with Saudi accounting standards
 */
export enum ExpenseCategory {
  UTILITIES = "utilities",
  MAINTENANCE = "maintenance",
  SALARIES = "salaries",
  RENT = "rent",
  INSURANCE = "insurance",
  MARKETING = "marketing",
  OFFICE_SUPPLIES = "office_supplies",
  PROFESSIONAL_SERVICES = "professional_services",
  TRAVEL = "travel",
  TELECOMMUNICATIONS = "telecommunications",
  SOFTWARE_SUBSCRIPTIONS = "software_subscriptions",
  EQUIPMENT = "equipment",
  TAXES = "taxes",
  BANK_FEES = "bank_fees",
  MISCELLANEOUS = "miscellaneous",
}

/**
 * Expense subcategories for detailed tracking
 */
export const SUBCATEGORIES: Record<ExpenseCategory, string[]> = {
  [ExpenseCategory.UTILITIES]: ["electricity", "water", "gas", "sewage"],
  [ExpenseCategory.MAINTENANCE]: ["repairs", "cleaning", "landscaping", "pest_control"],
  [ExpenseCategory.SALARIES]: ["wages", "bonuses", "gosi", "benefits"],
  [ExpenseCategory.RENT]: ["office_rent", "warehouse_rent", "parking"],
  [ExpenseCategory.INSURANCE]: ["property", "liability", "health", "vehicle"],
  [ExpenseCategory.MARKETING]: ["advertising", "promotions", "events", "branding"],
  [ExpenseCategory.OFFICE_SUPPLIES]: ["stationery", "furniture", "kitchen_supplies"],
  [ExpenseCategory.PROFESSIONAL_SERVICES]: ["legal", "accounting", "consulting"],
  [ExpenseCategory.TRAVEL]: ["transportation", "accommodation", "meals", "per_diem"],
  [ExpenseCategory.TELECOMMUNICATIONS]: ["internet", "phone", "mobile"],
  [ExpenseCategory.SOFTWARE_SUBSCRIPTIONS]: ["saas", "licenses", "cloud_services"],
  [ExpenseCategory.EQUIPMENT]: ["computers", "machinery", "tools"],
  [ExpenseCategory.TAXES]: ["vat", "withholding", "zakat", "municipal"],
  [ExpenseCategory.BANK_FEES]: ["wire_transfer", "card_fees", "account_maintenance"],
  [ExpenseCategory.MISCELLANEOUS]: ["other", "uncategorized"],
};

/**
 * Confidence levels for AI categorization
 */
export enum ConfidenceLevel {
  HIGH = "high",      // > 90% - Auto-approve
  MEDIUM = "medium",  // 70-90% - Suggest but allow override
  LOW = "low",        // < 70% - Require manual review
}

/**
 * Expense status
 */
export enum ExpenseStatus {
  PENDING = "pending",
  CATEGORIZED = "categorized",
  APPROVED = "approved",
  REJECTED = "rejected",
  DUPLICATE = "duplicate",
}

/**
 * Expense record
 */
export interface ExpenseRecord {
  _id?: ObjectId;
  orgId: string;
  propertyId?: string;
  unitId?: string;
  vendorId?: string;
  vendorName: string;
  description: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  amountSAR: number;
  date: Date;
  dueDate?: Date;
  paidDate?: Date;
  category: ExpenseCategory;
  subcategory?: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  aiCategorized: boolean;
  manualOverride: boolean;
  overrideBy?: string;
  overrideAt?: Date;
  status: ExpenseStatus;
  attachments: ExpenseAttachment[];
  metadata: ExpenseMetadata;
  duplicateOf?: string;
  tags: string[];
  vatAmount?: number;
  vatRate?: number;
  paymentMethod?: string;
  referenceNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Expense attachment
 */
export interface ExpenseAttachment {
  id: string;
  type: "receipt" | "invoice" | "contract" | "other";
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  ocrText?: string;
  ocrProcessed: boolean;
}

/**
 * Expense metadata for ML training
 */
export interface ExpenseMetadata {
  extractedVendor?: string;
  extractedAmount?: number;
  extractedDate?: Date;
  keywords: string[];
  patterns: string[];
  sourceType: "manual" | "ocr" | "import" | "api";
}

/**
 * Categorization rule for ML model
 */
export interface CategorizationRule {
  _id?: ObjectId;
  orgId: string;
  vendorPattern?: string;
  descriptionKeywords: string[];
  amountRange?: { min: number; max: number };
  category: ExpenseCategory;
  subcategory?: string;
  confidence: number;
  usageCount: number;
  correctCount: number;
  accuracy: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Spending insight
 */
export interface SpendingInsight {
  type: "trend" | "anomaly" | "opportunity" | "warning";
  category: ExpenseCategory;
  message: string;
  value: number;
  previousValue?: number;
  changePercent?: number;
  recommendation?: string;
  priority: "high" | "medium" | "low";
}

/**
 * Category spending summary
 */
export interface CategorySpending {
  category: ExpenseCategory;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  percentOfTotal: number;
  monthlyTrend: { month: string; amount: number }[];
}

// ============================================================================
// Constants
// ============================================================================

const EXPENSES_COLLECTION = "expenses";
const RULES_COLLECTION = "expense_categorization_rules";

/**
 * Keyword patterns for initial categorization
 */
const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  [ExpenseCategory.UTILITIES]: ["saudi electricity", "sec", "national water", "nwc", "gas", "utility"],
  [ExpenseCategory.MAINTENANCE]: ["repair", "fix", "maintenance", "cleaning", "plumber", "electrician"],
  [ExpenseCategory.SALARIES]: ["salary", "wage", "gosi", "payroll", "bonus", "commission"],
  [ExpenseCategory.RENT]: ["rent", "lease", "tenancy", "office space"],
  [ExpenseCategory.INSURANCE]: ["insurance", "tawuniya", "medgulf", "policy", "coverage"],
  [ExpenseCategory.MARKETING]: ["advertising", "ads", "google", "facebook", "promotion", "print"],
  [ExpenseCategory.OFFICE_SUPPLIES]: ["staples", "jarir", "office", "stationery", "furniture"],
  [ExpenseCategory.PROFESSIONAL_SERVICES]: ["legal", "lawyer", "accountant", "consultant", "audit"],
  [ExpenseCategory.TRAVEL]: ["hotel", "flight", "airline", "uber", "careem", "travel"],
  [ExpenseCategory.TELECOMMUNICATIONS]: ["stc", "mobily", "zain", "internet", "telephone"],
  [ExpenseCategory.SOFTWARE_SUBSCRIPTIONS]: ["subscription", "license", "software", "cloud", "saas"],
  [ExpenseCategory.EQUIPMENT]: ["computer", "laptop", "printer", "equipment", "machine"],
  [ExpenseCategory.TAXES]: ["vat", "tax", "zakat", "withholding", "municipal"],
  [ExpenseCategory.BANK_FEES]: ["bank", "transfer fee", "wire", "card fee"],
  [ExpenseCategory.MISCELLANEOUS]: [],
};

// ============================================================================
// Expense Management
// ============================================================================

/**
 * Create new expense with AI categorization
 */
export async function createExpense(
  data: Omit<ExpenseRecord, "_id" | "category" | "subcategory" | "confidence" | "confidenceLevel" |
    "aiCategorized" | "manualOverride" | "status" | "createdAt" | "updatedAt">,
  autoApprove: boolean = true
): Promise<{ success: boolean; expenseId?: string; category?: ExpenseCategory; error?: string }> {
  try {
    const db = await getDatabase();
    
    // AI categorization
    const categorization = await categorizeExpense(
      data.vendorName,
      data.description,
      data.amountSAR,
      data.orgId
    );
    
    // Check for duplicates
    const duplicate = await findDuplicate(
      data.orgId,
      data.vendorName,
      data.amountSAR,
      data.date
    );
    
    const expense: Omit<ExpenseRecord, "_id"> = {
      ...data,
      category: categorization.category,
      subcategory: categorization.subcategory,
      confidence: categorization.confidence,
      confidenceLevel: categorization.confidenceLevel,
      aiCategorized: true,
      manualOverride: false,
      status: duplicate 
        ? ExpenseStatus.DUPLICATE 
        : (autoApprove && categorization.confidenceLevel === ConfidenceLevel.HIGH)
          ? ExpenseStatus.APPROVED
          : ExpenseStatus.CATEGORIZED,
      duplicateOf: duplicate?.expenseId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(EXPENSES_COLLECTION).insertOne(expense);
    
    logger.info("Expense created with AI categorization", {
      component: "expense-categorization",
      action: "createExpense",
    });
    
    return {
      success: true,
      expenseId: result.insertedId.toString(),
      category: categorization.category,
    };
  } catch (_error) {
    logger.error("Failed to create expense", { component: "expense-categorization" });
    return { success: false, error: "Failed to create expense" };
  }
}

/**
 * AI categorize expense based on patterns
 */
export async function categorizeExpense(
  vendorName: string,
  description: string,
  amount: number,
  orgId: string
): Promise<{
  category: ExpenseCategory;
  subcategory?: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
}> {
  const db = await getDatabase();
  
  // Normalize input
  const normalizedVendor = vendorName.toLowerCase().trim();
  const normalizedDesc = description.toLowerCase().trim();
  const combinedText = `${normalizedVendor} ${normalizedDesc}`;
  
  // Check organization-specific rules first (highest priority)
  const orgRules = await db.collection(RULES_COLLECTION)
    .find({ orgId, isActive: true })
    .sort({ accuracy: -1, usageCount: -1 })
    .toArray() as unknown as CategorizationRule[];
  
  for (const rule of orgRules) {
    const matches = matchesRule(combinedText, amount, rule);
    if (matches) {
      // Update rule usage
      await db.collection(RULES_COLLECTION).updateOne(
        { _id: rule._id },
        { $inc: { usageCount: 1 }, $set: { updatedAt: new Date() } }
      );
      
      return {
        category: rule.category,
        subcategory: rule.subcategory,
        confidence: Math.min(0.95, rule.accuracy),
        confidenceLevel: getConfidenceLevel(rule.accuracy),
      };
    }
  }
  
  // Fall back to keyword-based categorization
  let bestMatch: ExpenseCategory = ExpenseCategory.MISCELLANEOUS;
  let bestScore = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = calculateKeywordScore(combinedText, keywords);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category as ExpenseCategory;
    }
  }
  
  // Calculate confidence based on match score
  const confidence = Math.min(0.85, bestScore * 0.7 + 0.2);
  
  return {
    category: bestMatch,
    subcategory: undefined,
    confidence,
    confidenceLevel: getConfidenceLevel(confidence),
  };
}

/**
 * Override AI categorization (for training)
 */
export async function overrideCategory(
  expenseId: string,
  orgId: string,
  newCategory: ExpenseCategory,
  subcategory: string | undefined,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Validate expenseId before parsing
    if (!ObjectId.isValid(expenseId)) {
      return { success: false, error: "Invalid expenseId" };
    }
    
    // Get original expense
    const expense = await db.collection(EXPENSES_COLLECTION).findOne({
      _id: new ObjectId(expenseId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!expense) {
      return { success: false, error: "Expense not found" };
    }
    
    const record = expense as unknown as ExpenseRecord;
    
    // Update expense
    await db.collection(EXPENSES_COLLECTION).updateOne(
      { _id: new ObjectId(expenseId), orgId },
      {
        $set: {
          category: newCategory,
          subcategory,
          manualOverride: true,
          overrideBy: userId,
          overrideAt: new Date(),
          status: ExpenseStatus.APPROVED,
          updatedAt: new Date(),
        },
      }
    );
    
    // Learn from correction - create or update rule
    await learnFromCorrection(
      orgId,
      record.vendorName,
      record.description,
      record.amountSAR,
      newCategory,
      subcategory,
      record.category !== newCategory // was wrong
    );
    
    logger.info("Expense category overridden", {
      component: "expense-categorization",
      action: "overrideCategory",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to override category", { component: "expense-categorization" });
    return { success: false, error: "Failed to override category" };
  }
}

/**
 * Learn from manual correction to improve ML
 */
async function learnFromCorrection(
  orgId: string,
  vendorName: string,
  description: string,
  amount: number,
  correctCategory: ExpenseCategory,
  subcategory: string | undefined,
  wasWrong: boolean
): Promise<void> {
  try {
    const db = await getDatabase();
    
    // Extract keywords from description
    const keywords = extractKeywords(description);
    
    // Check if similar rule exists
    const existingRule = await db.collection(RULES_COLLECTION).findOne({
      orgId,
      vendorPattern: vendorName.toLowerCase(),
      category: correctCategory,
    }) as WithId<Document> | null;
    
    if (existingRule) {
      // Atomic update: increment counts, merge keywords, and recalculate accuracy using aggregation pipeline
      const correctIncrement = wasWrong ? 0 : 1;
      
      await db.collection(RULES_COLLECTION).updateOne(
        { _id: existingRule._id },
        [
          {
            $set: {
              usageCount: { $add: ["$usageCount", 1] },
              correctCount: { $add: ["$correctCount", correctIncrement] },
              // Merge keywords atomically using $setUnion (deduplicates)
              descriptionKeywords: {
                $setUnion: [
                  { $ifNull: ["$descriptionKeywords", []] },
                  keywords,
                ],
              },
              updatedAt: new Date(),
            },
          },
          {
            $set: {
              accuracy: {
                $cond: {
                  if: { $gt: ["$usageCount", 0] },
                  then: { $divide: ["$correctCount", "$usageCount"] },
                  else: 0,
                },
              },
            },
          },
        ]
      );
    } else {
      // Create new rule
      const newRule: Omit<CategorizationRule, "_id"> = {
        orgId,
        vendorPattern: vendorName.toLowerCase(),
        descriptionKeywords: keywords,
        amountRange: { min: amount * 0.8, max: amount * 1.2 },
        category: correctCategory,
        subcategory,
        confidence: 0.7, // Initial confidence
        usageCount: 1,
        correctCount: wasWrong ? 0 : 1,
        accuracy: wasWrong ? 0 : 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection(RULES_COLLECTION).insertOne(newRule);
    }
  } catch (_error) {
    logger.error("Failed to learn from correction", { component: "expense-categorization" });
  }
}

// ============================================================================
// Duplicate Detection
// ============================================================================

/**
 * Find potential duplicate expense
 */
async function findDuplicate(
  orgId: string,
  vendorName: string,
  amount: number,
  date: Date
): Promise<{ expenseId: string; similarity: number } | null> {
  try {
    const db = await getDatabase();
    
    // Look for expenses with same amount within 3 days
    const threeDaysBefore = new Date(date);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
    const threeDaysAfter = new Date(date);
    threeDaysAfter.setDate(threeDaysAfter.getDate() + 3);
    
    // Escape regex special characters and truncate for safety
    const vendorPrefix = vendorName.substring(0, 5).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const similar = await db.collection(EXPENSES_COLLECTION).findOne({
      orgId,
      amountSAR: amount,
      date: { $gte: threeDaysBefore, $lte: threeDaysAfter },
      vendorName: { $regex: new RegExp(vendorPrefix, "i") },
      status: { $ne: ExpenseStatus.DUPLICATE },
    }) as WithId<Document> | null;
    
    if (similar) {
      return {
        expenseId: similar._id.toString(),
        similarity: 0.9,
      };
    }
    
    return null;
  } catch (_error) {
    return null;
  }
}

// ============================================================================
// Spending Analysis
// ============================================================================

/**
 * Get spending by category
 */
export async function getSpendingByCategory(
  orgId: string,
  options?: {
    propertyId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<CategorySpending[]> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match: any = {
      orgId,
      status: { $in: [ExpenseStatus.CATEGORIZED, ExpenseStatus.APPROVED] },
    };
    
    if (options?.propertyId) match.propertyId = options.propertyId;
    if (options?.dateFrom) match.date = { $gte: options.dateFrom };
    if (options?.dateTo) {
      match.date = { ...match.date, $lte: options.dateTo };
    }
    
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amountSAR" },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ];
    
    const results = await db.collection(EXPENSES_COLLECTION)
      .aggregate(pipeline)
      .toArray();
    
    const grandTotal = results.reduce((sum, r) => sum + (r.totalAmount as number), 0);
    
    return results.map(r => ({
      category: r._id as ExpenseCategory,
      totalAmount: r.totalAmount as number,
      transactionCount: r.transactionCount as number,
      averageAmount: Math.round((r.totalAmount as number) / (r.transactionCount as number)),
      percentOfTotal: grandTotal > 0 ? Math.round(((r.totalAmount as number) / grandTotal) * 100) : 0,
      monthlyTrend: [], // Would require additional query
    }));
  } catch (_error) {
    logger.error("Failed to get spending by category", { component: "expense-categorization" });
    return [];
  }
}

/**
 * Generate spending insights
 */
export async function generateSpendingInsights(
  orgId: string,
  options?: { propertyId?: string }
): Promise<SpendingInsight[]> {
  try {
    const db = await getDatabase();
    const insights: SpendingInsight[] = [];
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get this month's spending by category
    const thisMonth = await getSpendingByCategory(orgId, {
      propertyId: options?.propertyId,
      dateFrom: thisMonthStart,
    });
    
    // Get last month's spending by category
    const lastMonth = await getSpendingByCategory(orgId, {
      propertyId: options?.propertyId,
      dateFrom: lastMonthStart,
      dateTo: lastMonthEnd,
    });
    
    // Compare and generate insights
    for (const current of thisMonth) {
      const previous = lastMonth.find(p => p.category === current.category);
      
      if (previous) {
        // Guard against division by zero
        if (previous.totalAmount === 0) {
          // Previous was zero - this is a new spending category
          if (current.totalAmount > 0) {
            insights.push({
              type: "warning",
              category: current.category,
              message: `${current.category} is a new spending category this month`,
              value: current.totalAmount,
              previousValue: 0,
              changePercent: undefined,
              recommendation: `Review new ${current.category} expenses`,
              priority: current.totalAmount > 1000 ? "high" : "medium",
            });
          }
          continue; // Skip percentage-based comparisons
        }
        
        const changePercent = ((current.totalAmount - previous.totalAmount) / previous.totalAmount) * 100;
        
        // Significant increase
        if (changePercent > 30) {
          insights.push({
            type: "warning",
            category: current.category,
            message: `${current.category} spending increased by ${Math.round(changePercent)}% vs last month`,
            value: current.totalAmount,
            previousValue: previous.totalAmount,
            changePercent,
            recommendation: `Review ${current.category} expenses for potential savings`,
            priority: changePercent > 50 ? "high" : "medium",
          });
        }
        
        // Significant decrease (positive)
        if (changePercent < -20) {
          insights.push({
            type: "opportunity",
            category: current.category,
            message: `${current.category} spending decreased by ${Math.abs(Math.round(changePercent))}%`,
            value: current.totalAmount,
            previousValue: previous.totalAmount,
            changePercent,
            priority: "low",
          });
        }
      }
    }
    
    // Check for anomalies (expenses significantly higher than average)
    for (const category of thisMonth) {
      if (category.transactionCount >= 3) {
        const avgAmount = category.averageAmount;
        
        // Find expenses 3x higher than average
        const highExpenses = await db.collection(EXPENSES_COLLECTION).find({
          orgId,
          category: category.category,
          amountSAR: { $gte: avgAmount * 3 },
          date: { $gte: thisMonthStart },
        }).toArray();
        
        if (highExpenses.length > 0) {
          insights.push({
            type: "anomaly",
            category: category.category,
            message: `${highExpenses.length} unusually high ${category.category} expenses detected`,
            value: highExpenses.reduce((sum, e) => sum + (e.amountSAR as number), 0),
            recommendation: "Review these transactions for accuracy",
            priority: "high",
          });
        }
      }
    }
    
    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  } catch (_error) {
    logger.error("Failed to generate spending insights", { component: "expense-categorization" });
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function matchesRule(
  text: string,
  amount: number,
  rule: CategorizationRule
): boolean {
  // Check vendor pattern
  if (rule.vendorPattern && !text.includes(rule.vendorPattern)) {
    return false;
  }
  
  // Check keywords (at least one must match)
  if (rule.descriptionKeywords.length > 0) {
    const hasKeyword = rule.descriptionKeywords.some(kw => text.includes(kw.toLowerCase()));
    if (!hasKeyword) return false;
  }
  
  // Check amount range
  if (rule.amountRange) {
    if (amount < rule.amountRange.min || amount > rule.amountRange.max) {
      return false;
    }
  }
  
  return true;
}

function calculateKeywordScore(text: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  
  let matches = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  
  return matches / keywords.length;
}

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return ConfidenceLevel.HIGH;
  if (confidence >= 0.7) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  const stopWords = ["the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on", "at"];
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));
  
  return [...new Set(words)].slice(0, 10);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  createExpense,
  categorizeExpense,
  overrideCategory,
  getSpendingByCategory,
  generateSpendingInsights,
};
