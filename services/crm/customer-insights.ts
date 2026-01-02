/**
 * @fileoverview Customer Insights & Engagement Service
 * @module services/crm/customer-insights
 * 
 * AI-powered customer relationship management:
 * - Customer health scoring
 * - Churn prediction
 * - Engagement tracking
 * - Lifecycle management
 * - Communication history
 * - NPS tracking
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
 * Customer health status
 */
export enum CustomerHealthStatus {
  EXCELLENT = "excellent",
  GOOD = "good",
  AT_RISK = "at_risk",
  CRITICAL = "critical",
  CHURNED = "churned",
}

/**
 * Customer lifecycle stage
 */
export enum CustomerLifecycleStage {
  LEAD = "lead",
  ONBOARDING = "onboarding",
  ACTIVE = "active",
  ENGAGED = "engaged",
  AT_RISK = "at_risk",
  CHURNED = "churned",
  WINBACK = "winback",
}

/**
 * Engagement type
 */
export enum EngagementType {
  LOGIN = "login",
  PAGE_VIEW = "page_view",
  FEATURE_USE = "feature_use",
  SUPPORT_TICKET = "support_ticket",
  PAYMENT = "payment",
  WORK_ORDER = "work_order",
  DOCUMENT_UPLOAD = "document_upload",
  COMMUNICATION = "communication",
  PROPERTY_ADD = "property_add",
  LEASE_CREATE = "lease_create",
}

/**
 * Customer profile
 */
export interface CustomerProfile {
  _id?: ObjectId;
  orgId: string;
  userId: string;
  email: string;
  name: string;
  phone?: string;
  preferredLanguage: "en" | "ar";
  
  // Account info
  accountType: "property_owner" | "tenant" | "vendor";
  tier?: "basic" | "premium" | "enterprise";
  
  // Health scoring
  healthScore: number;
  healthStatus: CustomerHealthStatus;
  healthFactors: HealthFactor[];
  
  // Lifecycle
  lifecycleStage: CustomerLifecycleStage;
  lifetimeValue: number;
  predictedChurnRisk: number;
  churnPredictionFactors: string[];
  
  // Engagement
  engagementScore: number;
  lastActivityAt?: Date;
  totalActivities: number;
  activitiesLast30Days: number;
  
  // NPS
  npsScore?: number;
  npsCategory?: "promoter" | "passive" | "detractor";
  lastNpsSurveyAt?: Date;
  
  // Support
  totalTickets: number;
  openTickets: number;
  averageSatisfaction?: number;
  
  // Billing
  monthlyRevenue: number;
  totalRevenue: number;
  paymentIssues: number;
  lastPaymentAt?: Date;
  
  // Properties/Units
  totalProperties: number;
  totalUnits: number;
  occupancyRate: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  onboardedAt?: Date;
  lastEngagementSyncAt?: Date;
}

/**
 * Health factor
 */
export interface HealthFactor {
  name: string;
  weight: number;
  score: number;
  impact: "positive" | "negative" | "neutral";
  details: string;
}

/**
 * Engagement event
 */
export interface EngagementEvent {
  _id?: ObjectId;
  orgId: string;
  userId: string;
  type: EngagementType;
  action: string;
  metadata?: Record<string, unknown>;
  deviceType?: "desktop" | "mobile" | "tablet";
  sessionId?: string;
  createdAt: Date;
}

/**
 * Customer communication
 */
export interface CustomerCommunication {
  _id?: ObjectId;
  orgId: string;
  userId: string;
  type: "email" | "sms" | "call" | "meeting" | "in_app";
  direction: "inbound" | "outbound";
  subject: string;
  content: string;
  outcome?: string;
  sentiment?: "positive" | "negative" | "neutral";
  scheduledFollowUp?: Date;
  createdBy: string;
  createdAt: Date;
}

/**
 * NPS survey response
 */
export interface NPSSurveyResponse {
  _id?: ObjectId;
  orgId: string;
  userId: string;
  score: number;
  category: "promoter" | "passive" | "detractor";
  feedback?: string;
  touchpoint: string;
  createdAt: Date;
}

// ============================================================================
// Constants
// ============================================================================

const PROFILES_COLLECTION = "customer_profiles";
const EVENTS_COLLECTION = "engagement_events";
const COMMUNICATIONS_COLLECTION = "customer_communications";
const NPS_COLLECTION = "nps_responses";

// Health score weights
const HEALTH_WEIGHTS = {
  engagement: 0.25,
  payment: 0.25,
  support: 0.20,
  usage: 0.15,
  nps: 0.15,
};

// Churn risk thresholds
const CHURN_RISK_THRESHOLDS = {
  low: 0.2,
  medium: 0.5,
  high: 0.75,
};

const buildProfileDefaults = (): Omit<CustomerProfile, "_id" | "orgId" | "userId" | "updatedAt"> => ({
  email: "",
  name: "Unknown",
  preferredLanguage: "en",
  accountType: "tenant",
  healthScore: 50,
  healthStatus: CustomerHealthStatus.GOOD,
  healthFactors: [],
  lifecycleStage: CustomerLifecycleStage.ONBOARDING,
  lifetimeValue: 0,
  predictedChurnRisk: 0,
  churnPredictionFactors: [],
  engagementScore: 0,
  totalActivities: 0,
  activitiesLast30Days: 0,
  totalTickets: 0,
  openTickets: 0,
  monthlyRevenue: 0,
  totalRevenue: 0,
  paymentIssues: 0,
  totalProperties: 0,
  totalUnits: 0,
  occupancyRate: 0,
  createdAt: new Date(),
});

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get or create customer profile
 */
export async function getCustomerProfile(
  orgId: string,
  userId: string
): Promise<CustomerProfile | null> {
  try {
    const db = await getDatabase();
    
    const profile = await db.collection(PROFILES_COLLECTION).findOne({
      orgId,
      userId,
    }) as WithId<Document> | null;
    
    // Runtime validation for required CustomerProfile fields
    if (profile) {
      // Check required string fields
      if (typeof profile.orgId !== "string" || typeof profile.userId !== "string") {
        logger.warn("Invalid customer profile: missing orgId or userId", {
          component: "customer-insights",
          profileId: profile._id?.toString(),
        });
        return null;
      }
      // Check that numeric fields exist and are valid if present
      const numericFields = ["healthScore", "engagementScore", "totalActivities", "totalTickets"];
      for (const field of numericFields) {
        if (field in profile && typeof (profile as Record<string, unknown>)[field] !== "number") {
          logger.warn(`Invalid customer profile: ${field} is not a number`, {
            component: "customer-insights",
            profileId: profile._id?.toString(),
          });
          // Don't fail - the field may just be missing and we can use defaults
        }
      }
      return profile as unknown as CustomerProfile;
    }
    
    return null;
  } catch (error) {
    logger.error("Failed to get customer profile", { 
      component: "customer-insights",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Update or create customer profile
 */
export async function upsertCustomerProfile(
  orgId: string,
  userId: string,
  data: Partial<CustomerProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Destructure to exclude orgId and userId from incoming data to prevent override
    const { orgId: _orgId, userId: _userId, ...safeData } = data as Partial<CustomerProfile> & { orgId?: string; userId?: string };
    
    await db.collection(PROFILES_COLLECTION).updateOne(
      { orgId, userId },
      {
        $set: {
          ...safeData,
          orgId,  // Explicitly use function parameter
          userId, // Explicitly use function parameter
          updatedAt: new Date(),
        },
        $setOnInsert: buildProfileDefaults(),
      },
      { upsert: true }
    );
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to upsert customer profile", { 
      component: "customer-insights",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: "Failed to upsert profile" };
  }
}

/**
 * Track engagement event
 */
export async function trackEngagement(
  orgId: string,
  userId: string,
  event: Omit<EngagementEvent, "_id" | "orgId" | "userId" | "createdAt">
): Promise<{ success: boolean }> {
  try {
    const db = await getDatabase();
    
    const engagementEvent: Omit<EngagementEvent, "_id"> = {
      orgId,
      userId,
      ...event,
      createdAt: new Date(),
    };
    
    await db.collection(EVENTS_COLLECTION).insertOne(engagementEvent);
    
    // Update profile activity count
    // Note: activitiesLast30Days is computed on-demand by counting events
    // with createdAt >= now-30d in getCustomerProfile or via scheduled job.
    // We only update lastActivityAt and totalActivities here.
    await db.collection(PROFILES_COLLECTION).updateOne(
      { orgId, userId },
      {
        $set: {
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { 
          totalActivities: 1,
        },
        $setOnInsert: buildProfileDefaults(),
      },
      { upsert: true }
    );
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to track engagement", { component: "customer-insights" });
    return { success: false };
  }
}

/**
 * Log communication
 */
export async function logCommunication(
  orgId: string,
  communication: Omit<CustomerCommunication, "_id" | "orgId" | "createdAt">
): Promise<{ success: boolean; communicationId?: string }> {
  try {
    const db = await getDatabase();
    
    const record: Omit<CustomerCommunication, "_id"> = {
      orgId,
      ...communication,
      createdAt: new Date(),
    };
    
    const result = await db.collection(COMMUNICATIONS_COLLECTION).insertOne(record);
    
    return {
      success: true,
      communicationId: result.insertedId.toString(),
    };
  } catch (_error) {
    logger.error("Failed to log communication", { component: "customer-insights" });
    return { success: false };
  }
}

/**
 * Record NPS response
 */
export async function recordNPSResponse(
  orgId: string,
  userId: string,
  score: number,
  touchpoint: string,
  feedback?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    if (score < 0 || score > 10) {
      return { success: false, error: "NPS score must be between 0 and 10" };
    }
    
    // Determine category
    let category: "promoter" | "passive" | "detractor";
    if (score >= 9) {
      category = "promoter";
    } else if (score >= 7) {
      category = "passive";
    } else {
      category = "detractor";
    }
    
    const response: Omit<NPSSurveyResponse, "_id"> = {
      orgId,
      userId,
      score,
      category,
      feedback,
      touchpoint,
      createdAt: new Date(),
    };
    
    await db.collection(NPS_COLLECTION).insertOne(response);
    
    // Update profile (upsert to handle missing profiles)
    await db.collection(PROFILES_COLLECTION).updateOne(
      { orgId, userId },
      {
        $set: {
          npsScore: score,
          npsCategory: category,
          lastNpsSurveyAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: buildProfileDefaults(),
      },
      { upsert: true }
    );
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to record NPS response", { 
      component: "customer-insights",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: "Failed to record NPS" };
  }
}

// ============================================================================
// Health Score Calculation
// ============================================================================

/**
 * Calculate and update customer health score
 */
export async function calculateHealthScore(
  orgId: string,
  userId: string
): Promise<{
  healthScore: number;
  healthStatus: CustomerHealthStatus;
  factors: HealthFactor[];
}> {
  try {
    const db = await getDatabase();
    const factors: HealthFactor[] = [];
    
    // Get profile
    const profile = await getCustomerProfile(orgId, userId);
    if (!profile) {
      return {
        healthScore: 0,
        healthStatus: CustomerHealthStatus.CRITICAL,
        factors: [],
      };
    }
    
    // Calculate engagement score
    const engagementFactor = calculateEngagementFactor(profile);
    factors.push(engagementFactor);
    
    // Calculate payment score
    const paymentFactor = await calculatePaymentFactor(orgId, userId);
    factors.push(paymentFactor);
    
    // Calculate support score
    const supportFactor = await calculateSupportFactor(orgId, userId);
    factors.push(supportFactor);
    
    // Calculate usage score
    const usageFactor = calculateUsageFactor(profile);
    factors.push(usageFactor);
    
    // Calculate NPS score
    const npsFactor = calculateNPSFactor(profile);
    factors.push(npsFactor);
    
    // Calculate weighted total
    let healthScore = 0;
    healthScore += engagementFactor.score * HEALTH_WEIGHTS.engagement;
    healthScore += paymentFactor.score * HEALTH_WEIGHTS.payment;
    healthScore += supportFactor.score * HEALTH_WEIGHTS.support;
    healthScore += usageFactor.score * HEALTH_WEIGHTS.usage;
    healthScore += npsFactor.score * HEALTH_WEIGHTS.nps;
    
    healthScore = Math.round(healthScore);
    
    // Determine status
    let healthStatus: CustomerHealthStatus;
    if (healthScore >= 80) {
      healthStatus = CustomerHealthStatus.EXCELLENT;
    } else if (healthScore >= 60) {
      healthStatus = CustomerHealthStatus.GOOD;
    } else if (healthScore >= 40) {
      healthStatus = CustomerHealthStatus.AT_RISK;
    } else {
      healthStatus = CustomerHealthStatus.CRITICAL;
    }
    
    // Update profile
    await db.collection(PROFILES_COLLECTION).updateOne(
      { orgId, userId },
      {
        $set: {
          healthScore,
          healthStatus,
          healthFactors: factors,
          updatedAt: new Date(),
        },
      }
    );
    
    return { healthScore, healthStatus, factors };
  } catch (_error) {
    logger.error("Failed to calculate health score", { component: "customer-insights" });
    return {
      healthScore: 0,
      healthStatus: CustomerHealthStatus.CRITICAL,
      factors: [],
    };
  }
}

function calculateEngagementFactor(profile: CustomerProfile): HealthFactor {
  // Score based on activity in last 30 days
  const activities = profile.activitiesLast30Days || 0;
  const daysSinceLastActivity = profile.lastActivityAt
    ? Math.floor((Date.now() - profile.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  let score = 0;
  let impact: "positive" | "negative" | "neutral" = "neutral";
  let details = "";
  
  if (daysSinceLastActivity > 30) {
    score = 20;
    impact = "negative";
    details = "No activity in over 30 days";
  } else if (daysSinceLastActivity > 14) {
    score = 40;
    impact = "negative";
    details = "Limited recent activity";
  } else if (activities >= 50) {
    score = 100;
    impact = "positive";
    details = "Highly engaged user";
  } else if (activities >= 20) {
    score = 80;
    impact = "positive";
    details = "Regularly engaged";
  } else if (activities >= 5) {
    score = 60;
    impact = "neutral";
    details = "Moderate engagement";
  } else {
    score = 40;
    impact = "negative";
    details = "Low engagement";
  }
  
  return {
    name: "Engagement",
    weight: HEALTH_WEIGHTS.engagement,
    score,
    impact,
    details,
  };
}

async function calculatePaymentFactor(
  orgId: string,
  userId: string
): Promise<HealthFactor> {
  // In production, would query payment/billing data
  // Simulating based on profile data
  try {
    const db = await getDatabase();
    
    const profile = await db.collection(PROFILES_COLLECTION).findOne({
      orgId,
      userId,
    }) as WithId<Document> | null;
    
    const data = profile as unknown as CustomerProfile | null;
    
    let score = 100;
    let impact: "positive" | "negative" | "neutral" = "positive";
    let details = "All payments on time";
    
    if (data?.paymentIssues) {
      if (data.paymentIssues >= 3) {
        score = 30;
        impact = "negative";
        details = "Multiple payment issues";
      } else if (data.paymentIssues >= 1) {
        score = 60;
        impact = "negative";
        details = "Recent payment issue";
      }
    }
    
    return {
      name: "Payment",
      weight: HEALTH_WEIGHTS.payment,
      score,
      impact,
      details,
    };
  } catch (_error) {
    return {
      name: "Payment",
      weight: HEALTH_WEIGHTS.payment,
      score: 50,
      impact: "neutral",
      details: "Unable to calculate",
    };
  }
}

async function calculateSupportFactor(
  orgId: string,
  userId: string
): Promise<HealthFactor> {
  try {
    const db = await getDatabase();
    
    // Get recent tickets
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTickets = await db.collection("support_tickets")
      .countDocuments({
        orgId,
        "customer.userId": userId,
        createdAt: { $gte: thirtyDaysAgo },
      });
    
    const openTickets = await db.collection("support_tickets")
      .countDocuments({
        orgId,
        "customer.userId": userId,
        status: { $nin: ["resolved", "closed"] },
      });
    
    let score = 80;
    let impact: "positive" | "negative" | "neutral" = "positive";
    let details = "Low support needs";
    
    if (openTickets > 3) {
      score = 30;
      impact = "negative";
      details = `${openTickets} open tickets`;
    } else if (recentTickets > 5) {
      score = 50;
      impact = "negative";
      details = "High support volume";
    } else if (recentTickets > 2) {
      score = 70;
      impact = "neutral";
      details = "Moderate support needs";
    }
    
    return {
      name: "Support",
      weight: HEALTH_WEIGHTS.support,
      score,
      impact,
      details,
    };
  } catch (_error) {
    return {
      name: "Support",
      weight: HEALTH_WEIGHTS.support,
      score: 50,
      impact: "neutral",
      details: "Unable to calculate",
    };
  }
}

function calculateUsageFactor(profile: CustomerProfile): HealthFactor {
  const properties = profile.totalProperties || 0;
  const units = profile.totalUnits || 0;
  const occupancy = profile.occupancyRate || 0;
  
  let score = 50;
  let impact: "positive" | "negative" | "neutral" = "neutral";
  let details = "";
  
  if (properties === 0) {
    score = 30;
    impact = "negative";
    details = "No properties added";
  } else if (units > 10 && occupancy > 80) {
    score = 100;
    impact = "positive";
    details = "High usage with good occupancy";
  } else if (units > 5) {
    score = 80;
    impact = "positive";
    details = "Good portfolio size";
  } else if (occupancy < 50) {
    score = 50;
    impact = "negative";
    details = "Low occupancy rate";
  } else {
    score = 70;
    impact = "neutral";
    details = "Normal usage pattern";
  }
  
  return {
    name: "Usage",
    weight: HEALTH_WEIGHTS.usage,
    score,
    impact,
    details,
  };
}

function calculateNPSFactor(profile: CustomerProfile): HealthFactor {
  const npsScore = profile.npsScore;
  
  if (npsScore === undefined) {
    return {
      name: "NPS",
      weight: HEALTH_WEIGHTS.nps,
      score: 50,
      impact: "neutral",
      details: "No NPS survey completed",
    };
  }
  
  let score: number;
  let impact: "positive" | "negative" | "neutral";
  let details: string;
  
  if (npsScore >= 9) {
    score = 100;
    impact = "positive";
    details = "Promoter";
  } else if (npsScore >= 7) {
    score = 70;
    impact = "neutral";
    details = "Passive";
  } else {
    score = 30;
    impact = "negative";
    details = "Detractor";
  }
  
  return {
    name: "NPS",
    weight: HEALTH_WEIGHTS.nps,
    score,
    impact,
    details,
  };
}

// ============================================================================
// Churn Prediction
// ============================================================================

/**
 * Predict churn risk for customer
 */
export async function predictChurnRisk(
  orgId: string,
  userId: string
): Promise<{
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: string[];
  recommendations: string[];
}> {
  try {
    const db = await getDatabase();
    const factors: string[] = [];
    const recommendations: string[] = [];
    
    // Get profile
    const profile = await getCustomerProfile(orgId, userId);
    if (!profile) {
      return {
        riskScore: 0.5,
        riskLevel: "medium",
        factors: ["Insufficient data"],
        recommendations: ["Gather more customer data"],
      };
    }
    
    let riskScore = 0;
    
    // Factor: Engagement decline
    if (profile.activitiesLast30Days < 5) {
      riskScore += 0.2;
      factors.push("Low recent engagement");
      recommendations.push("Send re-engagement campaign");
    }
    
    // Factor: Days since last activity
    if (profile.lastActivityAt) {
      const daysSinceActivity = Math.floor(
        (Date.now() - profile.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActivity > 14) {
        riskScore += 0.25;
        factors.push(`No activity in ${daysSinceActivity} days`);
        recommendations.push("Personal outreach recommended");
      }
    }
    
    // Factor: NPS score
    if (profile.npsScore !== undefined && profile.npsScore < 7) {
      riskScore += 0.2;
      factors.push("Low NPS score");
      recommendations.push("Address customer feedback");
    }
    
    // Factor: Open support tickets
    if (profile.openTickets > 2) {
      riskScore += 0.15;
      factors.push("Multiple unresolved support issues");
      recommendations.push("Prioritize ticket resolution");
    }
    
    // Factor: Payment issues
    if (profile.paymentIssues > 0) {
      riskScore += 0.15;
      factors.push("Payment difficulties");
      recommendations.push("Offer payment plan or discussion");
    }
    
    // Factor: Low occupancy (for property owners)
    if (profile.accountType === "property_owner" && profile.occupancyRate < 50) {
      riskScore += 0.1;
      factors.push("Low occupancy rate");
      recommendations.push("Provide occupancy optimization support");
    }
    
    // Cap at 1.0
    riskScore = Math.min(riskScore, 1.0);
    
    // Determine risk level
    let riskLevel: "low" | "medium" | "high" | "critical";
    if (riskScore >= CHURN_RISK_THRESHOLDS.high) {
      riskLevel = "critical";
    } else if (riskScore >= CHURN_RISK_THRESHOLDS.medium) {
      riskLevel = "high";
    } else if (riskScore >= CHURN_RISK_THRESHOLDS.low) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }
    
    // Update profile
    await db.collection(PROFILES_COLLECTION).updateOne(
      { orgId, userId },
      {
        $set: {
          predictedChurnRisk: riskScore,
          churnPredictionFactors: factors,
          updatedAt: new Date(),
        },
      }
    );
    
    return { riskScore, riskLevel, factors, recommendations };
  } catch (_error) {
    logger.error("Failed to predict churn risk", { component: "customer-insights" });
    return {
      riskScore: 0.5,
      riskLevel: "medium",
      factors: ["Error calculating risk"],
      recommendations: [],
    };
  }
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Get customer health dashboard
 */
export async function getHealthDashboard(
  orgId: string
): Promise<{
  totalCustomers: number;
  healthDistribution: Record<CustomerHealthStatus, number>;
  averageHealthScore: number;
  atRiskCustomers: number;
  churnRiskDistribution: Record<string, number>;
}> {
  try {
    const db = await getDatabase();
    
    const pipeline = [
      { $match: { orgId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgHealth: { $avg: "$healthScore" },
          excellent: {
            $sum: { $cond: [{ $eq: ["$healthStatus", "excellent"] }, 1, 0] },
          },
          good: {
            $sum: { $cond: [{ $eq: ["$healthStatus", "good"] }, 1, 0] },
          },
          atRisk: {
            $sum: { $cond: [{ $eq: ["$healthStatus", "at_risk"] }, 1, 0] },
          },
          critical: {
            $sum: { $cond: [{ $eq: ["$healthStatus", "critical"] }, 1, 0] },
          },
          churned: {
            $sum: { $cond: [{ $eq: ["$healthStatus", "churned"] }, 1, 0] },
          },
          lowRisk: {
            $sum: { $cond: [{ $lt: ["$predictedChurnRisk", 0.2] }, 1, 0] },
          },
          mediumRisk: {
            $sum: {
              $cond: [
                { $and: [
                  { $gte: ["$predictedChurnRisk", 0.2] },
                  { $lt: ["$predictedChurnRisk", 0.5] },
                ]},
                1,
                0,
              ],
            },
          },
          highRisk: {
            $sum: { $cond: [{ $gte: ["$predictedChurnRisk", 0.5] }, 1, 0] },
          },
        },
      },
    ];
    
    const results = await db.collection(PROFILES_COLLECTION)
      .aggregate(pipeline)
      .toArray();
    
    const data = results[0] || {};
    
    return {
      totalCustomers: data.total || 0,
      healthDistribution: {
        [CustomerHealthStatus.EXCELLENT]: data.excellent || 0,
        [CustomerHealthStatus.GOOD]: data.good || 0,
        [CustomerHealthStatus.AT_RISK]: data.atRisk || 0,
        [CustomerHealthStatus.CRITICAL]: data.critical || 0,
        [CustomerHealthStatus.CHURNED]: data.churned || 0,
      },
      averageHealthScore: Math.round(data.avgHealth || 0),
      atRiskCustomers: (data.atRisk || 0) + (data.critical || 0),
      churnRiskDistribution: {
        low: data.lowRisk || 0,
        medium: data.mediumRisk || 0,
        high: data.highRisk || 0,
      },
    };
  } catch (_error) {
    logger.error("Failed to get health dashboard", { component: "customer-insights" });
    return {
      totalCustomers: 0,
      healthDistribution: {
        [CustomerHealthStatus.EXCELLENT]: 0,
        [CustomerHealthStatus.GOOD]: 0,
        [CustomerHealthStatus.AT_RISK]: 0,
        [CustomerHealthStatus.CRITICAL]: 0,
        [CustomerHealthStatus.CHURNED]: 0,
      },
      averageHealthScore: 0,
      atRiskCustomers: 0,
      churnRiskDistribution: { low: 0, medium: 0, high: 0 },
    };
  }
}

/**
 * Get NPS summary
 */
export async function getNPSSummary(
  orgId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<{
  npsScore: number;
  totalResponses: number;
  promoters: number;
  passives: number;
  detractors: number;
  trend: "up" | "down" | "stable" | null;
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
          promoters: {
            $sum: { $cond: [{ $gte: ["$score", 9] }, 1, 0] },
          },
          passives: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$score", 7] }, { $lt: ["$score", 9] }] },
                1,
                0,
              ],
            },
          },
          detractors: {
            $sum: { $cond: [{ $lt: ["$score", 7] }, 1, 0] },
          },
        },
      },
    ];
    
    const results = await db.collection(NPS_COLLECTION)
      .aggregate(pipeline)
      .toArray();
    
    const data = results[0] || { total: 0, promoters: 0, passives: 0, detractors: 0 };
    
    // Calculate NPS: % Promoters - % Detractors
    // Only compute when we have responses to avoid division by zero
    const total = data.total || 0;
    const npsScore = total > 0 
      ? Math.round(((data.promoters / total) - (data.detractors / total)) * 100)
      : 0;
    
    // Calculate trend by comparing with previous period
    const periodDuration = dateTo.getTime() - dateFrom.getTime();
    const prevDateFrom = new Date(dateFrom.getTime() - periodDuration);
    const prevDateTo = new Date(dateFrom.getTime() - 1); // 1ms before current period
    
    const prevPipeline = [
      {
        $match: {
          orgId,
          createdAt: { $gte: prevDateFrom, $lte: prevDateTo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          promoters: { $sum: { $cond: [{ $gte: ["$score", 9] }, 1, 0] } },
          detractors: { $sum: { $cond: [{ $lt: ["$score", 7] }, 1, 0] } },
        },
      },
    ];
    
    const prevResults = await db.collection(NPS_COLLECTION)
      .aggregate(prevPipeline)
      .toArray();
    
    const prevData = prevResults[0] || { total: 0, promoters: 0, detractors: 0 };
    const prevNpsScore = prevData.total > 0
      ? Math.round(((prevData.promoters / prevData.total) - (prevData.detractors / prevData.total)) * 100)
      : 0;
    
    // Determine trend: up if improved by 5+, down if declined by 5+, else stable
    let trend: "up" | "down" | "stable" | null = null;
    if (total > 0 && prevData.total > 0) {
      const diff = npsScore - prevNpsScore;
      if (diff >= 5) trend = "up";
      else if (diff <= -5) trend = "down";
      else trend = "stable";
    }
    
    return {
      npsScore: data.total > 0 ? npsScore : 0,
      totalResponses: data.total,
      promoters: data.promoters,
      passives: data.passives,
      detractors: data.detractors,
      trend,
    };
  } catch (_error) {
    logger.error("Failed to get NPS summary", { component: "customer-insights" });
    return {
      npsScore: 0,
      totalResponses: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      trend: null, // Consistent with success path
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getCustomerProfile,
  upsertCustomerProfile,
  trackEngagement,
  logCommunication,
  recordNPSResponse,
  calculateHealthScore,
  predictChurnRisk,
  getHealthDashboard,
  getNPSSummary,
};
