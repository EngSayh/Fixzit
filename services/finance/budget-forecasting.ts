/**
 * @fileoverview Budget Forecasting Service
 * @module services/finance/budget-forecasting
 * 
 * AI-powered budget forecasting and management system that:
 * - Creates and tracks organizational budgets
 * - Provides AI-based spending forecasts
 * - Monitors budget utilization in real-time
 * - Generates variance analysis reports
 * - Supports multi-property budget consolidation
 * - Implements zero-based budgeting workflows
 * 
 * @status IMPLEMENTED [AGENT-001-A]
 * @created 2025-12-29
 */

import { ObjectId, type WithId, type Document } from "mongodb";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { ExpenseCategory } from "./expense-categorization";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Budget period types
 */
export enum BudgetPeriod {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUAL = "annual",
}

/**
 * Budget status
 */
export enum BudgetStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  ACTIVE = "active",
  CLOSED = "closed",
  REVISED = "revised",
}

/**
 * Forecast confidence
 */
export enum ForecastConfidence {
  HIGH = "high",       // Stable historical data, low variance
  MEDIUM = "medium",   // Some variability
  LOW = "low",         // Limited data or high variance
}

/**
 * Budget record
 */
export interface BudgetRecord {
  _id?: ObjectId;
  orgId: string;
  propertyId?: string;
  name: string;
  description?: string;
  period: BudgetPeriod;
  fiscalYear: number;
  startDate: Date;
  endDate: Date;
  status: BudgetStatus;
  lineItems: BudgetLineItem[];
  totals: BudgetTotals;
  approvals: BudgetApproval[];
  revisions: BudgetRevision[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}

/**
 * Budget line item
 */
export interface BudgetLineItem {
  id: string;
  category: ExpenseCategory;
  subcategory?: string;
  description?: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  forecast: number;
  forecastConfidence: ForecastConfidence;
  monthlyBreakdown: MonthlyBudget[];
  notes?: string;
}

/**
 * Monthly budget allocation
 */
export interface MonthlyBudget {
  month: number; // 1-12
  year: number;
  budgeted: number;
  actual: number;
  forecast: number;
  status: "on_track" | "over_budget" | "under_budget";
}

/**
 * Budget totals summary
 */
export interface BudgetTotals {
  totalBudgeted: number;
  totalActual: number;
  totalForecast: number;
  totalVariance: number;
  utilizationPercent: number;
  remainingBudget: number;
  projectedOverrun: number;
  healthScore: number; // 0-100
}

/**
 * Budget approval record
 */
export interface BudgetApproval {
  approver: string;
  role: string;
  action: "approved" | "rejected" | "requested_changes";
  timestamp: Date;
  comments?: string;
}

/**
 * Budget revision record
 */
export interface BudgetRevision {
  version: number;
  revisedBy: string;
  revisedAt: Date;
  reason: string;
  changes: {
    category: ExpenseCategory;
    previousAmount: number;
    newAmount: number;
  }[];
}

/**
 * Forecast result
 */
export interface ForecastResult {
  category: ExpenseCategory;
  currentMonthForecast: number;
  remainingPeriodForecast: number;
  endOfYearForecast: number;
  confidence: ForecastConfidence;
  trend: "increasing" | "stable" | "decreasing";
  factors: string[];
  recommendations: string[];
}

/**
 * Variance analysis
 */
export interface VarianceAnalysis {
  category: ExpenseCategory;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: "favorable" | "unfavorable" | "neutral";
  rootCauses: string[];
  recommendations: string[];
}

// ============================================================================
// Constants
// ============================================================================

const BUDGETS_COLLECTION = "budgets";
const FORECASTS_COLLECTION = "budget_forecasts";

// ============================================================================
// Budget Management
// ============================================================================

/**
 * Create new budget
 */
export async function createBudget(
  orgId: string,
  data: {
    name: string;
    description?: string;
    period: BudgetPeriod;
    fiscalYear: number;
    startDate: Date;
    endDate: Date;
    lineItems: Omit<BudgetLineItem, "actualAmount" | "variance" | "variancePercent" | "forecast" | "forecastConfidence" | "monthlyBreakdown">[];
    propertyId?: string;
  },
  userId: string
): Promise<{ success: boolean; budgetId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Initialize line items with actuals = 0
    const lineItems: BudgetLineItem[] = data.lineItems.map(item => ({
      ...item,
      actualAmount: 0,
      variance: item.budgetedAmount,
      variancePercent: 100,
      forecast: item.budgetedAmount,
      forecastConfidence: ForecastConfidence.MEDIUM,
      monthlyBreakdown: generateMonthlyBreakdown(
        data.startDate,
        data.endDate,
        item.budgetedAmount
      ),
    }));
    
    const totals = calculateTotals(lineItems);
    
    const budget: Omit<BudgetRecord, "_id"> = {
      orgId,
      propertyId: data.propertyId,
      name: data.name,
      description: data.description,
      period: data.period,
      fiscalYear: data.fiscalYear,
      startDate: data.startDate,
      endDate: data.endDate,
      status: BudgetStatus.DRAFT,
      lineItems,
      totals,
      approvals: [],
      revisions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };
    
    const result = await db.collection(BUDGETS_COLLECTION).insertOne(budget);
    
    logger.info("Budget created", {
      component: "budget-forecasting",
      action: "createBudget",
    });
    
    return { success: true, budgetId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to create budget", { 
      component: "budget-forecasting",
      error: _error instanceof Error ? _error.message : String(_error),
    });
    return { 
      success: false, 
      error: _error instanceof Error ? _error.message : "Failed to create budget",
    };
  }
}

/**
 * Submit budget for approval
 */
export async function submitForApproval(
  budgetId: string,
  orgId: string,
  _userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection(BUDGETS_COLLECTION).updateOne(
      { _id: new ObjectId(budgetId), orgId, status: BudgetStatus.DRAFT },
      {
        $set: {
          status: BudgetStatus.PENDING_APPROVAL,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Budget not found or not in draft status" };
    }
    
    logger.info("Budget submitted for approval", {
      component: "budget-forecasting",
      action: "submitForApproval",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to submit budget", { component: "budget-forecasting" });
    return { success: false, error: "Failed to submit budget" };
  }
}

/**
 * Approve budget
 */
export async function approveBudget(
  budgetId: string,
  orgId: string,
  approverId: string,
  approverRole: string,
  comments?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const approval: BudgetApproval = {
      approver: approverId,
      role: approverRole,
      action: "approved",
      timestamp: new Date(),
      comments,
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: {
        status: BudgetStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
      $push: { approvals: approval },
    };
    
    const result = await db.collection(BUDGETS_COLLECTION).updateOne(
      { _id: new ObjectId(budgetId), orgId, status: BudgetStatus.PENDING_APPROVAL },
      updateOp
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Budget not found or not pending approval" };
    }
    
    logger.info("Budget approved", {
      component: "budget-forecasting",
      action: "approveBudget",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to approve budget", { component: "budget-forecasting" });
    return { success: false, error: "Failed to approve budget" };
  }
}

/**
 * Activate budget (make it current)
 */
export async function activateBudget(
  budgetId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await mongoose.startSession();
  try {
    const db = await getDatabase();
    
    let result: { success: boolean; error?: string } = { success: false };
    
    await session.withTransaction(async () => {
      // Get the budget to find its period info
      const budget = await db.collection(BUDGETS_COLLECTION).findOne({
        _id: new ObjectId(budgetId),
        orgId,
      }, { session }) as WithId<Document> | null;
      
      if (!budget) {
        result = { success: false, error: "Budget not found" };
        return;
      }
      
      const record = budget as unknown as BudgetRecord;
      
      // Only APPROVED budgets can be activated (status guard)
      if (record.status !== BudgetStatus.APPROVED) {
        // Keep generic error message per existing pattern
        result = { success: false, error: "Budget not found" };
        return;
      }
      
      // Close other active budgets for same property/period
      await db.collection(BUDGETS_COLLECTION).updateMany(
        {
          orgId,
          propertyId: record.propertyId,
          fiscalYear: record.fiscalYear,
          status: BudgetStatus.ACTIVE,
          _id: { $ne: new ObjectId(budgetId) },
        },
        {
          $set: {
            status: BudgetStatus.CLOSED,
            updatedAt: new Date(),
          },
        },
        { session }
      );
      
      // Activate this budget (include status condition for atomic check)
      const updateResult = await db.collection(BUDGETS_COLLECTION).updateOne(
        { _id: new ObjectId(budgetId), orgId, status: BudgetStatus.APPROVED },
        {
          $set: {
            status: BudgetStatus.ACTIVE,
            updatedAt: new Date(),
          },
        },
        { session }
      );
      
      if (updateResult.modifiedCount === 0) {
        result = { success: false, error: "Failed to activate budget" };
        return;
      }
      
      result = { success: true };
    });
    
    if (result.success) {
      logger.info("Budget activated", {
        component: "budget-forecasting",
        action: "activateBudget",
      });
    }
    
    return result;
  } catch (_error) {
    logger.error("Failed to activate budget", { component: "budget-forecasting" });
    return { success: false, error: "Failed to activate budget" };
  } finally {
    await session.endSession();
  }
}

/**
 * Update budget with actual expenses
 */
export async function syncActuals(
  budgetId: string,
  orgId: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const db = await getDatabase();
    
    const budget = await db.collection(BUDGETS_COLLECTION).findOne({
      _id: new ObjectId(budgetId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!budget) {
      return { success: false, updated: 0, error: "Budget not found" };
    }
    
    const record = budget as unknown as BudgetRecord;
    
    // Query actual expenses by category
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match: any = {
      orgId,
      date: { $gte: record.startDate, $lte: record.endDate },
      status: { $in: ["categorized", "approved"] },
    };
    
    if (record.propertyId) {
      match.propertyId = record.propertyId;
    }
    
    const actuals = await db.collection("expenses").aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            category: "$category",
            month: { $month: "$date" },
            year: { $year: "$date" },
          },
          total: { $sum: "$amountSAR" },
        },
      },
    ]).toArray();
    
    // Update line items
    const updatedLineItems = record.lineItems.map(item => {
      const categoryActuals = actuals.filter(
        a => a._id.category === item.category
      );
      
      const totalActual = categoryActuals.reduce(
        (sum, a) => sum + (a.total as number), 0
      );
      
      // Update monthly breakdown
      const monthlyBreakdown = item.monthlyBreakdown.map(mb => {
        const monthActual = categoryActuals.find(
          a => a._id.month === mb.month && a._id.year === mb.year
        );
        const actual = monthActual ? (monthActual.total as number) : 0;
        
        return {
          ...mb,
          actual,
          status: getMonthStatus(mb.budgeted, actual),
        };
      });
      
      const variance = item.budgetedAmount - totalActual;
      const variancePercent = item.budgetedAmount > 0
        ? Math.round((variance / item.budgetedAmount) * 100)
        : 0;
      
      return {
        ...item,
        actualAmount: totalActual,
        variance,
        variancePercent,
        monthlyBreakdown,
      };
    });
    
    // Recalculate totals
    const totals = calculateTotals(updatedLineItems);
    
    await db.collection(BUDGETS_COLLECTION).updateOne(
      { _id: new ObjectId(budgetId), orgId },
      {
        $set: {
          lineItems: updatedLineItems,
          totals,
          updatedAt: new Date(),
        },
      }
    );
    
    logger.info("Budget actuals synced", {
      component: "budget-forecasting",
      action: "syncActuals",
    });
    
    return { success: true, updated: actuals.length };
  } catch (_error) {
    logger.error("Failed to sync actuals", { component: "budget-forecasting" });
    return { success: false, updated: 0, error: "Failed to sync actuals" };
  }
}

// ============================================================================
// AI Forecasting
// ============================================================================

/**
 * Generate spending forecast
 */
export async function generateForecast(
  orgId: string,
  options?: {
    propertyId?: string;
    budgetId?: string;
    horizonMonths?: number;
  }
): Promise<ForecastResult[]> {
  try {
    const db = await getDatabase();
    const horizonMonths = options?.horizonMonths || 3;
    const results: ForecastResult[] = [];
    
    // Get historical data (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match: any = {
      orgId,
      date: { $gte: twelveMonthsAgo },
      status: { $in: ["categorized", "approved"] },
    };
    
    if (options?.propertyId) match.propertyId = options.propertyId;
    
    const historicalData = await db.collection("expenses").aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            category: "$category",
            month: { $month: "$date" },
            year: { $year: "$date" },
          },
          total: { $sum: "$amountSAR" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]).toArray();
    
    // Group by category
    const categoryData = new Map<string, { month: number; year: number; total: number }[]>();
    
    for (const d of historicalData) {
      const category = d._id.category as string;
      if (!categoryData.has(category)) {
        categoryData.set(category, []);
      }
      categoryData.get(category)!.push({
        month: d._id.month as number,
        year: d._id.year as number,
        total: d.total as number,
      });
    }
    
    // Generate forecast for each category
    for (const [category, data] of categoryData) {
      const forecast = calculateCategoryForecast(data, horizonMonths);
      results.push({
        ...forecast,
        category: category as ExpenseCategory,
      });
    }
    
    // Store forecast
    await db.collection(FORECASTS_COLLECTION).insertOne({
      orgId,
      propertyId: options?.propertyId,
      budgetId: options?.budgetId,
      generatedAt: new Date(),
      horizonMonths,
      results,
    });
    
    logger.info("Forecast generated", {
      component: "budget-forecasting",
      action: "generateForecast",
    });
    
    return results;
  } catch (error) {
    logger.error("Failed to generate forecast", { 
      component: "budget-forecasting",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Rethrow to let callers distinguish failure from empty result
    throw error;
  }
}

/**
 * Calculate forecast for a category
 */
function calculateCategoryForecast(
  data: { month: number; year: number; total: number }[],
  horizonMonths: number
): Omit<ForecastResult, "category"> {
  if (data.length === 0) {
    return {
      currentMonthForecast: 0,
      remainingPeriodForecast: 0,
      endOfYearForecast: 0,
      confidence: ForecastConfidence.LOW,
      trend: "stable",
      factors: ["Insufficient data"],
      recommendations: ["Collect more historical data for accurate forecasting"],
    };
  }
  
  // Calculate statistics
  const amounts = data.map(d => d.total);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const cv = avg > 0 ? stdDev / avg : 0; // Coefficient of variation
  
  // Determine trend (simple linear regression)
  const n = amounts.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += amounts[i];
    sumXY += i * amounts[i];
    sumX2 += i * i;
  }
  
  const denominator = n * sumX2 - sumX * sumX;
  const slope = n > 1 && denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const trendPercent = avg > 0 ? (slope / avg) * 100 : 0;
  
  // Determine confidence
  let confidence: ForecastConfidence;
  if (n >= 6 && cv < 0.2) {
    confidence = ForecastConfidence.HIGH;
  } else if (n >= 3 && cv < 0.5) {
    confidence = ForecastConfidence.MEDIUM;
  } else {
    confidence = ForecastConfidence.LOW;
  }
  
  // Calculate forecasts (clamp to non-negative to prevent nonsensical projections)
  const currentMonthForecast = Math.max(0, Math.round(avg + slope * n));
  const remainingPeriodForecast = Math.round(currentMonthForecast * horizonMonths);
  
  // End of year (remaining months in calendar year)
  // Note: This includes the current month in the remaining count.
  // getMonth() returns 0-11, so December (11) gives remainingMonths = 1
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const remainingMonths = 12 - currentMonth; // 12 in Jan, 1 in Dec
  const endOfYearForecast = Math.round(currentMonthForecast * remainingMonths);
  
  // Determine trend direction
  let trend: "increasing" | "stable" | "decreasing";
  if (trendPercent > 5) {
    trend = "increasing";
  } else if (trendPercent < -5) {
    trend = "decreasing";
  } else {
    trend = "stable";
  }
  
  // Generate insights
  const factors: string[] = [];
  const recommendations: string[] = [];
  
  if (trend === "increasing") {
    factors.push(`Spending trend: +${Math.round(trendPercent)}% month-over-month`);
    recommendations.push("Review spending patterns to identify cost optimization opportunities");
  }
  
  if (cv > 0.3) {
    factors.push("High spending variability detected");
    recommendations.push("Consider implementing spending controls for more predictable budgeting");
  }
  
  if (n < 6) {
    factors.push(`Limited historical data (${n} months)`);
    recommendations.push("Forecast accuracy will improve with more historical data");
  }
  
  return {
    currentMonthForecast,
    remainingPeriodForecast,
    endOfYearForecast,
    confidence,
    trend,
    factors,
    recommendations,
  };
}

// ============================================================================
// Variance Analysis
// ============================================================================

/**
 * Perform variance analysis on budget
 */
export async function analyzeVariance(
  budgetId: string,
  orgId: string
): Promise<VarianceAnalysis[]> {
  try {
    const db = await getDatabase();
    
    const budget = await db.collection(BUDGETS_COLLECTION).findOne({
      _id: new ObjectId(budgetId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!budget) {
      return [];
    }
    
    const record = budget as unknown as BudgetRecord;
    const analyses: VarianceAnalysis[] = [];
    
    for (const item of record.lineItems) {
      const variance = item.budgetedAmount - item.actualAmount;
      const variancePercent = item.budgetedAmount > 0
        ? Math.round((variance / item.budgetedAmount) * 100)
        : 0;
      
      let status: "favorable" | "unfavorable" | "neutral";
      if (variancePercent > 5) {
        status = "favorable"; // Under budget
      } else if (variancePercent < -5) {
        status = "unfavorable"; // Over budget
      } else {
        status = "neutral";
      }
      
      const rootCauses: string[] = [];
      const recommendations: string[] = [];
      
      if (status === "unfavorable") {
        rootCauses.push("Actual spending exceeded budget allocation");
        
        // Check for increasing trend with strict comparison
        // Requires at least one strict increase and non-zero values
        const recentMonths = item.monthlyBreakdown.slice(-3);
        const hasNonZeroData = recentMonths.some(m => m.actual > 0);
        const hasStrictIncrease = recentMonths.some(
          (m, i) => i > 0 && m.actual > recentMonths[i - 1].actual
        );
        const isNonDecreasing = recentMonths.every(
          (m, i) => i === 0 || m.actual >= recentMonths[i - 1].actual
        );
        const increasing = hasNonZeroData && hasStrictIncrease && isNonDecreasing;
        
        if (increasing) {
          rootCauses.push("Consistent monthly increase in spending");
          recommendations.push("Review contracts for price escalation clauses");
        }
        
        recommendations.push("Consider reallocating budget from underspent categories");
      }
      
      if (status === "favorable" && variancePercent > 30) {
        rootCauses.push("Significant underspend vs budget");
        recommendations.push("Evaluate if budget allocation was accurate");
        recommendations.push("Consider reallocating surplus to high-priority areas");
      }
      
      analyses.push({
        category: item.category,
        budgeted: item.budgetedAmount,
        actual: item.actualAmount,
        variance,
        variancePercent,
        status,
        rootCauses,
        recommendations,
      });
    }
    
    return analyses.sort((a, b) => a.variancePercent - b.variancePercent);
  } catch (_error) {
    logger.error("Failed to analyze variance", { component: "budget-forecasting" });
    return [];
  }
}

/**
 * Get budget health score
 */
export async function getBudgetHealthScore(
  budgetId: string,
  orgId: string
): Promise<{ score: number; factors: { name: string; impact: number }[]; recommendations: string[] }> {
  try {
    const db = await getDatabase();
    
    const budget = await db.collection(BUDGETS_COLLECTION).findOne({
      _id: new ObjectId(budgetId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!budget) {
      return { score: 0, factors: [], recommendations: [] };
    }
    
    const record = budget as unknown as BudgetRecord;
    const factors: { name: string; impact: number }[] = [];
    const recommendations: string[] = [];
    
    let score = 100;
    
    // Factor 1: Overall utilization
    const utilization = record.totals.utilizationPercent;
    if (utilization > 100) {
      const overrun = utilization - 100;
      const impact = Math.min(30, overrun / 2);
      score -= impact;
      factors.push({ name: "Over budget", impact: -impact });
      recommendations.push("Implement spending controls to reduce overrun");
    } else if (utilization < 50) {
      const underrun = 50 - utilization;
      const impact = Math.min(10, underrun / 5);
      score -= impact;
      factors.push({ name: "Significant underspend", impact: -impact });
    } else {
      factors.push({ name: "On-track spending", impact: 0 });
    }
    
    // Factor 2: Category distribution
    const overBudgetCategories = record.lineItems.filter(
      item => item.actualAmount > item.budgetedAmount
    ).length;
    
    if (overBudgetCategories > 3) {
      score -= 15;
      factors.push({ name: "Multiple overspent categories", impact: -15 });
      recommendations.push("Review budget allocations across categories");
    }
    
    // Factor 3: Forecast accuracy
    const projectedOverrun = record.totals.projectedOverrun;
    if (projectedOverrun > 0) {
      const overrunPercent = (projectedOverrun / record.totals.totalBudgeted) * 100;
      const impact = Math.min(20, overrunPercent);
      score -= impact;
      factors.push({ name: "Projected year-end overrun", impact: -impact });
      recommendations.push(`Reduce spending by ${Math.round(projectedOverrun)} SAR to stay on budget`);
    }
    
    return {
      score: Math.max(0, Math.round(score)),
      factors,
      recommendations,
    };
  } catch (_error) {
    logger.error("Failed to get budget health", { component: "budget-forecasting" });
    return { score: 0, factors: [], recommendations: [] };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateMonthlyBreakdown(
  startDate: Date,
  endDate: Date,
  totalBudget: number
): MonthlyBudget[] {
  const breakdown: MonthlyBudget[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Count months
  let months = 0;
  const temp = new Date(start);
  while (temp <= end) {
    months++;
    temp.setMonth(temp.getMonth() + 1);
  }
  
  // Even distribution
  const monthlyAmount = months > 0 ? Math.round(totalBudget / months) : totalBudget;
  
  const current = new Date(start);
  while (current <= end) {
    breakdown.push({
      month: current.getMonth() + 1,
      year: current.getFullYear(),
      budgeted: monthlyAmount,
      actual: 0,
      forecast: monthlyAmount,
      status: "on_track",
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return breakdown;
}

function calculateTotals(lineItems: BudgetLineItem[]): BudgetTotals {
  const totalBudgeted = lineItems.reduce((sum, item) => sum + item.budgetedAmount, 0);
  const totalActual = lineItems.reduce((sum, item) => sum + item.actualAmount, 0);
  const totalForecast = lineItems.reduce((sum, item) => sum + item.forecast, 0);
  const totalVariance = totalBudgeted - totalActual;
  const utilizationPercent = totalBudgeted > 0
    ? Math.round((totalActual / totalBudgeted) * 100)
    : 0;
  
  const projectedOverrun = totalForecast > totalBudgeted
    ? totalForecast - totalBudgeted
    : 0;
  
  // Health score (simplified) - guard against division by zero
  let healthScore = 100;
  if (utilizationPercent > 100) healthScore -= Math.min(50, utilizationPercent - 100);
  if (projectedOverrun > 0 && totalBudgeted > 0) {
    const overrunPercent = (projectedOverrun / totalBudgeted) * 100;
    healthScore -= Math.min(30, overrunPercent);
  }
  
  return {
    totalBudgeted,
    totalActual,
    totalForecast,
    totalVariance,
    utilizationPercent,
    remainingBudget: Math.max(0, totalBudgeted - totalActual),
    projectedOverrun,
    healthScore: Math.max(0, Math.round(healthScore)),
  };
}

function getMonthStatus(budgeted: number, actual: number): "on_track" | "over_budget" | "under_budget" {
  if (budgeted === 0) return "on_track";
  const ratio = actual / budgeted;
  if (ratio > 1.1) return "over_budget";
  if (ratio < 0.5) return "under_budget";
  return "on_track";
}

// ============================================================================
// Exports
// ============================================================================

export default {
  createBudget,
  submitForApproval,
  approveBudget,
  activateBudget,
  syncActuals,
  generateForecast,
  analyzeVariance,
  getBudgetHealthScore,
};
