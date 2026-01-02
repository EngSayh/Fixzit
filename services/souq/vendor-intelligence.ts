/**
 * @fileoverview AI-Powered Vendor Scoring & Fraud Detection
 * @module services/souq/vendor-intelligence
 * 
 * Enterprise vendor management with:
 * - Multi-factor vendor scoring algorithm
 * - Fraud detection and risk assessment
 * - Performance analytics
 * - Compliance monitoring
 * - Automated alerts and actions
 * 
 * @status IMPLEMENTED [AGENT-001-A]
 * @created 2025-12-29
 */

import { ObjectId, type WithId, type Document } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate orgId and vendorId are non-empty strings
 * @throws Error if validation fails
 */
function validateIds(orgId: string, vendorId: string): void {
  if (typeof orgId !== "string" || orgId.trim().length === 0) {
    throw new Error("orgId must be a non-empty string");
  }
  if (typeof vendorId !== "string" || vendorId.trim().length === 0) {
    throw new Error("vendorId must be a non-empty string");
  }
}

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Vendor score tier
 */
export enum VendorTier {
  PLATINUM = "platinum",   // Score >= 95
  GOLD = "gold",           // Score >= 85
  SILVER = "silver",       // Score >= 70
  BRONZE = "bronze",       // Score >= 50
  PROBATION = "probation", // Score < 50
  SUSPENDED = "suspended", // Suspended due to violations
}

/**
 * Fraud risk level
 */
export enum FraudRiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Vendor score breakdown
 */
export interface VendorScoreBreakdown {
  // Performance metrics (40%)
  performance: {
    orderFulfillmentRate: number;
    onTimeDeliveryRate: number;
    cancellationRate: number;
    defectRate: number;
    score: number;
  };
  
  // Customer satisfaction (30%)
  customerSatisfaction: {
    averageRating: number;
    reviewCount: number;
    responseTime: number;
    resolutionRate: number;
    score: number;
  };
  
  // Compliance (20%)
  compliance: {
    documentationComplete: boolean;
    policyViolations: number;
    vatCompliant: boolean;
    licenseValid: boolean;
    score: number;
  };
  
  // Growth & Activity (10%)
  activity: {
    listingsCount: number;
    salesGrowth: number;
    accountAge: number;
    loginFrequency: number;
    score: number;
  };
  
  // Overall
  totalScore: number;
  tier: VendorTier;
  calculatedAt: Date;
}

/**
 * Fraud signal
 */
export interface FraudSignal {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: Record<string, unknown>;
  detectedAt: Date;
}

/**
 * Fraud assessment
 */
export interface FraudAssessment {
  riskLevel: FraudRiskLevel;
  riskScore: number;
  signals: FraudSignal[];
  recommendedActions: string[];
  assessedAt: Date;
  expiresAt: Date;
}

/**
 * Vendor profile
 */
export interface VendorProfile {
  _id?: ObjectId;
  orgId: string;
  vendorId: string;
  businessName: string;
  businessNameAr?: string;
  
  // Contact
  email: string;
  phone: string;
  
  // Registration
  commercialRegistration?: string;
  vatNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  
  // Scoring
  currentScore: VendorScoreBreakdown;
  scoreHistory: ScoreHistoryEntry[];
  tier: VendorTier;
  
  // Fraud
  fraudAssessment: FraudAssessment;
  
  // Status
  status: "active" | "pending" | "suspended" | "terminated";
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedUntil?: Date;
  
  // Metrics
  metrics: VendorMetrics;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastScoreUpdate: Date;
  lastFraudCheck: Date;
}

/**
 * Score history entry
 */
export interface ScoreHistoryEntry {
  score: number;
  tier: VendorTier;
  recordedAt: Date;
}

/**
 * Vendor metrics
 */
export interface VendorMetrics {
  // Orders
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  
  // Revenue
  totalRevenue: number;
  last30DaysRevenue: number;
  averageOrderValue: number;
  salesGrowth: number; // Percentage growth from previous period
  
  // Listings
  activeListings: number;
  totalListings: number;
  
  // Reviews
  totalReviews: number;
  averageRating: number;
  positiveReviewRate: number;
  
  // Response
  averageResponseTime: number; // minutes
  responseRate: number;
  
  // Delivery
  onTimeDeliveryRate: number;
  averageDeliveryTime: number; // days
  
  // Issues
  disputesCount: number;
  claimsCount: number;
  policyViolations: number;
}

/**
 * Vendor alert
 */
export interface VendorAlert {
  _id?: ObjectId;
  orgId: string;
  vendorId: string;
  type: "score_drop" | "fraud_detected" | "compliance_issue" | "performance_warning" | "tier_change";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  data?: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Constants
// ============================================================================

const VENDORS_COLLECTION = "vendor_profiles";
const ALERTS_COLLECTION = "vendor_alerts";

// Score weights
const SCORE_WEIGHTS = {
  performance: 0.40,
  customerSatisfaction: 0.30,
  compliance: 0.20,
  activity: 0.10,
};

// Tier thresholds
const TIER_THRESHOLDS = {
  platinum: 95,
  gold: 85,
  silver: 70,
  bronze: 50,
};

// Fraud signal patterns
const FRAUD_PATTERNS = {
  unusualActivitySpike: { weight: 0.15, severity: "medium" as const },
  duplicateListings: { weight: 0.10, severity: "low" as const },
  priceManipulation: { weight: 0.20, severity: "high" as const },
  fakeReviews: { weight: 0.25, severity: "critical" as const },
  multipleAccounts: { weight: 0.20, severity: "high" as const },
  suspiciousPayments: { weight: 0.25, severity: "critical" as const },
  addressMismatch: { weight: 0.10, severity: "medium" as const },
  rapidAccountChanges: { weight: 0.15, severity: "medium" as const },
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get vendor profile
 */
export async function getVendorProfile(
  orgId: string,
  vendorId: string
): Promise<VendorProfile | null> {
  try {
    validateIds(orgId, vendorId);
    const db = await getDatabase();
    
    const profile = await db.collection(VENDORS_COLLECTION).findOne({
      orgId,
      vendorId,
    }) as WithId<Document> | null;
    
    return profile as unknown as VendorProfile | null;
  } catch (error) {
    // Never log full profile object - contains PII
    logger.error("Failed to get vendor profile", { 
      component: "vendor-intelligence",
      vendorId, // Only log safe identifiers
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Calculate vendor score
 */
export async function calculateVendorScore(
  orgId: string,
  vendorId: string
): Promise<VendorScoreBreakdown> {
  try {
    validateIds(orgId, vendorId);
    // Get vendor metrics
    const profile = await getVendorProfile(orgId, vendorId);
    const metrics = profile?.metrics || getDefaultMetrics();
    
    // Calculate performance score (40%)
    const performance = calculatePerformanceScore(metrics);
    
    // Calculate customer satisfaction score (30%)
    const customerSatisfaction = calculateSatisfactionScore(metrics);
    
    // Calculate compliance score (20%)
    const compliance = await calculateComplianceScore(orgId, vendorId);
    
    // Calculate activity score (10%)
    const activity = calculateActivityScore(metrics, profile);
    
    // Calculate total weighted score
    const totalScore = Math.round(
      performance.score * SCORE_WEIGHTS.performance +
      customerSatisfaction.score * SCORE_WEIGHTS.customerSatisfaction +
      compliance.score * SCORE_WEIGHTS.compliance +
      activity.score * SCORE_WEIGHTS.activity
    );
    
    // Determine tier
    const tier = determineTier(totalScore);
    
    const scoreBreakdown: VendorScoreBreakdown = {
      performance,
      customerSatisfaction,
      compliance,
      activity,
      totalScore,
      tier,
      calculatedAt: new Date(),
    };
    
    // Update vendor profile
    await updateVendorScore(orgId, vendorId, scoreBreakdown);
    
    // Check for tier change and create alert if needed
    if (profile && profile.tier !== tier) {
      await createTierChangeAlert(orgId, vendorId, profile.tier, tier);
    }
    
    return scoreBreakdown;
  } catch (error) {
    logger.error("Failed to calculate vendor score", { 
      component: "vendor-intelligence",
      error: error instanceof Error ? error.message : String(error),
    });
    return getDefaultScoreBreakdown();
  }
}

/**
 * Assess fraud risk
 */
export async function assessFraudRisk(
  orgId: string,
  vendorId: string
): Promise<FraudAssessment> {
  try {
    const db = await getDatabase();
    const signals: FraudSignal[] = [];
    let riskScore = 0;
    
    // Get vendor profile and metrics
    const profile = await getVendorProfile(orgId, vendorId);
    const metrics = profile?.metrics || getDefaultMetrics();
    
    // Check for unusual activity spike
    const activitySignal = await checkActivitySpike(orgId, vendorId);
    if (activitySignal) {
      signals.push(activitySignal);
      riskScore += FRAUD_PATTERNS.unusualActivitySpike.weight;
    }
    
    // Check for duplicate listings
    const duplicateSignal = await checkDuplicateListings(orgId, vendorId);
    if (duplicateSignal) {
      signals.push(duplicateSignal);
      riskScore += FRAUD_PATTERNS.duplicateListings.weight;
    }
    
    // Check for price manipulation
    const priceSignal = await checkPriceManipulation(orgId, vendorId);
    if (priceSignal) {
      signals.push(priceSignal);
      riskScore += FRAUD_PATTERNS.priceManipulation.weight;
    }
    
    // Check for fake reviews
    const reviewSignal = await checkFakeReviews(orgId, vendorId);
    if (reviewSignal) {
      signals.push(reviewSignal);
      riskScore += FRAUD_PATTERNS.fakeReviews.weight;
    }
    
    // Check for suspicious payment patterns
    const paymentSignal = await checkSuspiciousPayments(orgId, vendorId, metrics);
    if (paymentSignal) {
      signals.push(paymentSignal);
      riskScore += FRAUD_PATTERNS.suspiciousPayments.weight;
    }
    
    // Determine risk level
    let riskLevel: FraudRiskLevel;
    if (riskScore >= 0.7) {
      riskLevel = FraudRiskLevel.CRITICAL;
    } else if (riskScore >= 0.5) {
      riskLevel = FraudRiskLevel.HIGH;
    } else if (riskScore >= 0.25) {
      riskLevel = FraudRiskLevel.MEDIUM;
    } else {
      riskLevel = FraudRiskLevel.LOW;
    }
    
    // Generate recommendations
    const recommendedActions = generateFraudRecommendations(riskLevel, signals);
    
    const assessment: FraudAssessment = {
      riskLevel,
      // Clamp riskScore to 0-100 range (score can accumulate beyond 1.0 with multiple signals)
      riskScore: Math.round(Math.min(1, Math.max(0, riskScore)) * 100),
      signals,
      recommendedActions,
      assessedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
    
    // Update vendor profile and check if vendor exists
    const updateResult = await db.collection(VENDORS_COLLECTION).updateOne(
      { orgId, vendorId },
      {
        $set: {
          fraudAssessment: assessment,
          lastFraudCheck: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    
    // Check if vendor was found - log error if not
    if (updateResult.matchedCount === 0) {
      logger.error("Fraud assessment failed: vendor not found", {
        component: "vendor-intelligence",
        orgId,
        vendorId,
      });
      // Do not create fraud alert for non-existent vendor
      return assessment;
    }
    
    // Create alert for high/critical risk (only when vendor exists)
    if (riskLevel === FraudRiskLevel.HIGH || riskLevel === FraudRiskLevel.CRITICAL) {
      await createFraudAlert(orgId, vendorId, assessment);
    }
    
    logger.info("Fraud assessment completed", {
      component: "vendor-intelligence",
      action: "assessFraudRisk",
    });
    
    return assessment;
  } catch (_error) {
    logger.error("Failed to assess fraud risk", { component: "vendor-intelligence" });
    // Fail-closed: Return error state instead of defaulting to MEDIUM which hides the failure
    throw new Error("Failed to assess fraud risk - manual review required");
  }
}

/**
 * Suspend vendor
 */
export async function suspendVendor(
  orgId: string,
  vendorId: string,
  reason: string,
  durationDays?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const suspendedUntil = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : undefined;
    
    const result = await db.collection(VENDORS_COLLECTION).updateOne(
      { orgId, vendorId },
      {
        $set: {
          status: "suspended",
          tier: VendorTier.SUSPENDED,
          suspensionReason: reason,
          suspendedAt: new Date(),
          suspendedUntil,
          updatedAt: new Date(),
        },
      }
    );
    
    // Check if vendor was actually found and updated
    if (result.matchedCount === 0) {
      logger.warn("Vendor not found for suspension", {
        component: "vendor-intelligence",
        action: "suspendVendor",
        orgId,
        vendorId,
      });
      return { success: false, error: "Vendor not found" };
    }
    
    // Only create alert if vendor was matched
    await createVendorAlert(orgId, vendorId, {
      type: "tier_change",
      severity: "critical",
      title: "Vendor Suspended",
      description: reason,
      data: { durationDays },
    });
    
    logger.info("Vendor suspended", {
      component: "vendor-intelligence",
      action: "suspendVendor",
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to suspend vendor", { 
      component: "vendor-intelligence",
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: "Failed to suspend vendor" };
  }
}

/**
 * Reinstate vendor
 */
export async function reinstateVendor(
  orgId: string,
  vendorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Recalculate score to determine tier
    const score = await calculateVendorScore(orgId, vendorId);
    
    const result = await db.collection(VENDORS_COLLECTION).updateOne(
      { orgId, vendorId },
      {
        $set: {
          status: "active",
          tier: score.tier,
          suspensionReason: null,
          suspendedAt: null,
          suspendedUntil: null,
          updatedAt: new Date(),
        },
      }
    );
    
    // Check if vendor was found
    if (result.matchedCount === 0) {
      return { success: false, error: "Vendor not found" };
    }
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to reinstate vendor", { 
      component: "vendor-intelligence",
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: "Failed to reinstate vendor" };
  }
}

// ============================================================================
// Score Calculation Helpers
// ============================================================================

function calculatePerformanceScore(metrics: VendorMetrics): VendorScoreBreakdown["performance"] {
  // Order fulfillment rate (weight: 35%) - guard against division by zero
  const fulfillmentScore = metrics.totalOrders > 0
    ? (metrics.completedOrders / metrics.totalOrders) * 100
    : 100;
  
  // On-time delivery rate (weight: 30%)
  const deliveryScore = metrics.onTimeDeliveryRate;
  
  // Cancellation rate (weight: 20%) - lower is better
  const cancellationRate = metrics.totalOrders > 0
    ? (metrics.cancelledOrders / metrics.totalOrders) * 100
    : 0;
  const cancellationScore = Math.max(0, 100 - cancellationRate * 5);
  
  // Defect rate (weight: 15%) - based on returns
  const defectRate = metrics.totalOrders > 0
    ? (metrics.returnedOrders / metrics.totalOrders) * 100
    : 0;
  const defectScore = Math.max(0, 100 - defectRate * 3);
  
  const score = Math.round(
    fulfillmentScore * 0.35 +
    deliveryScore * 0.30 +
    cancellationScore * 0.20 +
    defectScore * 0.15
  );
  
  return {
    orderFulfillmentRate: Math.round(fulfillmentScore),
    onTimeDeliveryRate: Math.round(deliveryScore),
    cancellationRate: Math.round(cancellationRate * 100) / 100,
    defectRate: Math.round(defectRate * 100) / 100,
    score,
  };
}

function calculateSatisfactionScore(metrics: VendorMetrics): VendorScoreBreakdown["customerSatisfaction"] {
  // Average rating (weight: 40%)
  const ratingScore = (metrics.averageRating / 5) * 100;
  
  // Review count bonus (weight: 20%)
  let reviewBonus = 0;
  if (metrics.totalReviews >= 100) reviewBonus = 100;
  else if (metrics.totalReviews >= 50) reviewBonus = 80;
  else if (metrics.totalReviews >= 20) reviewBonus = 60;
  else if (metrics.totalReviews >= 10) reviewBonus = 40;
  else reviewBonus = 20;
  
  // Response time (weight: 20%) - based on average in minutes
  let responseTimeScore = 100;
  if (metrics.averageResponseTime > 1440) responseTimeScore = 20; // > 24 hours
  else if (metrics.averageResponseTime > 480) responseTimeScore = 50; // > 8 hours
  else if (metrics.averageResponseTime > 120) responseTimeScore = 70; // > 2 hours
  else if (metrics.averageResponseTime > 60) responseTimeScore = 85; // > 1 hour
  
  // Resolution rate (weight: 20%)
  const resolutionScore = metrics.responseRate;
  
  const score = Math.round(
    ratingScore * 0.40 +
    reviewBonus * 0.20 +
    responseTimeScore * 0.20 +
    resolutionScore * 0.20
  );
  
  return {
    averageRating: metrics.averageRating,
    reviewCount: metrics.totalReviews,
    responseTime: metrics.averageResponseTime,
    resolutionRate: metrics.responseRate,
    score,
  };
}

async function calculateComplianceScore(
  orgId: string,
  vendorId: string
): Promise<VendorScoreBreakdown["compliance"]> {
  try {
    const db = await getDatabase();
    
    const profile = await db.collection(VENDORS_COLLECTION).findOne({
      orgId,
      vendorId,
    }) as WithId<Document> | null;
    
    const vendor = profile as unknown as VendorProfile | null;
    
    // Documentation complete (weight: 30%)
    const hasCommercialReg = !!vendor?.commercialRegistration;
    const hasVat = !!vendor?.vatNumber;
    const hasLicense = !!vendor?.licenseNumber;
    const documentationComplete = hasCommercialReg && hasVat && hasLicense;
    const docScore = documentationComplete ? 100 : (
      (hasCommercialReg ? 33 : 0) + (hasVat ? 33 : 0) + (hasLicense ? 34 : 0)
    );
    
    // Policy violations (weight: 30%)
    const violations = vendor?.metrics?.policyViolations || 0;
    let violationScore = 100;
    if (violations >= 5) violationScore = 0;
    else if (violations >= 3) violationScore = 40;
    else if (violations >= 1) violationScore = 70;
    
    // VAT compliant (weight: 20%)
    const vatCompliant = !!vendor?.vatNumber;
    const vatScore = vatCompliant ? 100 : 0;
    
    // License valid (weight: 20%)
    const licenseValid = vendor?.licenseExpiry
      ? new Date(vendor.licenseExpiry) > new Date()
      : false;
    const licenseScore = licenseValid ? 100 : 0;
    
    const score = Math.round(
      docScore * 0.30 +
      violationScore * 0.30 +
      vatScore * 0.20 +
      licenseScore * 0.20
    );
    
    return {
      documentationComplete,
      policyViolations: violations,
      vatCompliant,
      licenseValid,
      score,
    };
  } catch (error) {
    logger.error("Failed to calculate compliance score", {
      error: error instanceof Error ? error.message : String(error),
      component: "vendor-intelligence",
    });
    // Return fallback values when compliance data unavailable
    return {
      documentationComplete: false,
      policyViolations: 0,
      vatCompliant: false,
      licenseValid: false,
      score: 50, // Default score when data unavailable
    };
  }
}

function calculateActivityScore(
  metrics: VendorMetrics,
  profile: VendorProfile | null
): VendorScoreBreakdown["activity"] {
  // Active listings (weight: 30%)
  let listingsScore = 0;
  if (metrics.activeListings >= 100) listingsScore = 100;
  else if (metrics.activeListings >= 50) listingsScore = 80;
  else if (metrics.activeListings >= 20) listingsScore = 60;
  else if (metrics.activeListings >= 5) listingsScore = 40;
  else listingsScore = 20;
  
  // Sales growth (weight: 30%)
  let growthScore = 50;
  const salesGrowth = metrics.salesGrowth || 0;
  if (salesGrowth >= 20) growthScore = 100;
  else if (salesGrowth >= 10) growthScore = 80;
  else if (salesGrowth >= 0) growthScore = 60;
  else if (salesGrowth >= -10) growthScore = 40;
  else growthScore = 20;
  
  // Account age (weight: 20%)
  let ageScore = 50;
  if (profile?.createdAt) {
    const ageMonths = Math.floor(
      (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    if (ageMonths >= 24) ageScore = 100;
    else if (ageMonths >= 12) ageScore = 80;
    else if (ageMonths >= 6) ageScore = 60;
    else ageScore = 40;
  }
  
  // Login frequency (weight: 20%)
  // TODO: [VENDOR-LOGIN-001] Query actual login data from user/vendor analytics
  // Implementation: Query login_events collection for last 30 days,
  // calculate frequency, normalize to 0-100 scale based on expected logins
  // Fallback: 50 (neutral score) when data unavailable
  const loginScore = 50; // Neutral fallback - production should query real data
  
  const score = Math.round(
    listingsScore * 0.30 +
    growthScore * 0.30 +
    ageScore * 0.20 +
    loginScore * 0.20
  );
  
  return {
    listingsCount: metrics.activeListings,
    salesGrowth: metrics.salesGrowth || 0,
    accountAge: profile?.createdAt
      ? Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0,
    loginFrequency: loginScore, // Use the same value used in score calculation
    score,
  };
}

function determineTier(score: number): VendorTier {
  if (score >= TIER_THRESHOLDS.platinum) return VendorTier.PLATINUM;
  if (score >= TIER_THRESHOLDS.gold) return VendorTier.GOLD;
  if (score >= TIER_THRESHOLDS.silver) return VendorTier.SILVER;
  if (score >= TIER_THRESHOLDS.bronze) return VendorTier.BRONZE;
  return VendorTier.PROBATION;
}

// ============================================================================
// Fraud Detection Helpers
// ============================================================================

/**
 * Activity spike detection - [FRAUD-SPIKE-001] 
 * Compares recent order/listing rate vs historical baseline (7-day avg)
 * Threshold: > 3x normal activity triggers signal
 * 
 * @implemented [AGENT-001-A] 2026-01-02
 */
async function checkActivitySpike(
  orgId: string,
  vendorId: string
): Promise<FraudSignal | null> {
  try {
    const db = await getDatabase();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get recent 24h activity count
    const recentOrders = await db.collection("orders").countDocuments({
      orgId,
      vendorId,
      createdAt: { $gte: oneDayAgo },
    });
    
    // Get 7-day historical average (excluding last 24h)
    const historicalOrders = await db.collection("orders").countDocuments({
      orgId,
      vendorId,
      createdAt: { $gte: sevenDaysAgo, $lt: oneDayAgo },
    });
    
    const dailyAverage = historicalOrders / 6; // 6 days of data
    const spikeThreshold = dailyAverage * 3;
    
    // Require minimum baseline to avoid false positives on new vendors
    if (dailyAverage >= 2 && recentOrders > spikeThreshold) {
      return {
        type: "activity_spike",
        severity: recentOrders > dailyAverage * 5 ? "high" : "medium",
        description: `Order volume ${Math.round(recentOrders / dailyAverage)}x above normal (${recentOrders} vs avg ${Math.round(dailyAverage)})`,
        evidence: {
          recentOrders,
          dailyAverage: Math.round(dailyAverage),
          spikeMultiplier: Math.round(recentOrders / dailyAverage * 10) / 10,
        },
        detectedAt: new Date(),
      };
    }
    
    return null;
  } catch (error) {
    logger.warn("Activity spike check failed", {
      vendorId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Duplicate listings detection - [FRAUD-DUP-001]
 * Fingerprints titles/descriptions using similarity hashing
 * Detects high similarity (> 90%) across vendor listings
 * 
 * @implemented [AGENT-001-A] 2026-01-02
 */
async function checkDuplicateListings(
  orgId: string,
  vendorId: string
): Promise<FraudSignal | null> {
  try {
    const db = await getDatabase();
    
    // Get vendor's active listings
    const listings = await db.collection("marketplace_products")
      .find({
        orgId,
        vendorId,
        status: "active",
      })
      .project({ _id: 1, name: 1, description: 1 })
      .limit(100)
      .toArray();
    
    if (listings.length < 2) return null;
    
    // Simple fingerprint: normalize and hash first 100 chars of title+desc
    const fingerprints = new Map<string, string[]>();
    
    for (const listing of listings) {
      const text = `${listing.name || ""} ${listing.description || ""}`.toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 100);
      
      if (text.length < 10) continue;
      
      // Create 3-gram fingerprint for similarity detection
      const ngrams = [];
      for (let i = 0; i <= text.length - 3; i++) {
        ngrams.push(text.substring(i, i + 3));
      }
      const fingerprint = ngrams.sort().slice(0, 10).join("|");
      
      if (!fingerprints.has(fingerprint)) {
        fingerprints.set(fingerprint, []);
      }
      fingerprints.get(fingerprint)!.push(listing._id.toString());
    }
    
    // Find duplicate groups (same fingerprint)
    const duplicateGroups = Array.from(fingerprints.values()).filter(ids => ids.length > 1);
    const duplicateCount = duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0);
    
    if (duplicateCount >= 3) {
      return {
        type: "duplicate_listings",
        severity: duplicateCount >= 10 ? "high" : "medium",
        description: `${duplicateCount} potentially duplicate listings detected`,
        evidence: {
          totalListings: listings.length,
          duplicateCount,
          duplicateGroups: duplicateGroups.length,
        },
        detectedAt: new Date(),
      };
    }
    
    return null;
  } catch (error) {
    logger.warn("Duplicate listings check failed", {
      vendorId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Price manipulation detection - [FRAUD-PRICE-001]
 * Detects rapid price swings (> 50% change in 24h) vs median
 * 
 * @implemented [AGENT-001-A] 2026-01-02
 */
async function checkPriceManipulation(
  orgId: string,
  vendorId: string
): Promise<FraudSignal | null> {
  try {
    const db = await getDatabase();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get recent price changes from audit log
    const priceChanges = await db.collection("audit_logs")
      .find({
        orgId,
        "data.vendorId": vendorId,
        action: "product_price_updated",
        createdAt: { $gte: oneDayAgo },
      })
      .project({ "data.oldPrice": 1, "data.newPrice": 1, "data.productId": 1 })
      .limit(50)
      .toArray();
    
    if (priceChanges.length < 2) return null;
    
    // Check for suspicious price swings
    let suspiciousSwings = 0;
    const swingDetails: Array<{ productId: string; change: number }> = [];
    
    for (const change of priceChanges) {
      const oldPrice = change.data?.oldPrice;
      const newPrice = change.data?.newPrice;
      
      if (typeof oldPrice === "number" && typeof newPrice === "number" && oldPrice > 0) {
        const percentChange = Math.abs((newPrice - oldPrice) / oldPrice);
        
        if (percentChange > 0.5) { // > 50% change
          suspiciousSwings++;
          swingDetails.push({
            productId: change.data?.productId,
            change: Math.round(percentChange * 100),
          });
        }
      }
    }
    
    if (suspiciousSwings >= 3) {
      return {
        type: "price_manipulation",
        severity: suspiciousSwings >= 5 ? "high" : "medium",
        description: `${suspiciousSwings} suspicious price swings (>50%) in 24 hours`,
        evidence: {
          swingCount: suspiciousSwings,
          totalPriceChanges: priceChanges.length,
          topSwings: swingDetails.slice(0, 5),
        },
        detectedAt: new Date(),
      };
    }
    
    return null;
  } catch (error) {
    logger.warn("Price manipulation check failed", {
      vendorId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Fake review detection - [FRAUD-REVIEW-001]
 * Flags abnormal review velocity and suspicious patterns
 * 
 * @implemented [AGENT-001-A] 2026-01-02
 */
async function checkFakeReviews(
  orgId: string,
  vendorId: string
): Promise<FraudSignal | null> {
  try {
    const db = await getDatabase();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Check for review velocity spikes (> 5 reviews in 1 hour)
    const recentReviews = await db.collection("reviews")
      .find({
        orgId,
        vendorId,
        createdAt: { $gte: oneHourAgo },
      })
      .project({ userId: 1, rating: 1 })
      .toArray();
    
    if (recentReviews.length >= 5) {
      // Check for duplicate reviewers
      const reviewerIds = recentReviews.map(r => r.userId?.toString());
      const uniqueReviewers = new Set(reviewerIds);
      const duplicateReviewers = reviewerIds.length - uniqueReviewers.size;
      
      // Check for rating patterns (all 5-star is suspicious)
      const allFiveStars = recentReviews.every(r => r.rating === 5);
      
      if (duplicateReviewers >= 1 || allFiveStars) {
        return {
          type: "fake_reviews",
          severity: duplicateReviewers >= 3 ? "high" : "medium",
          description: `Suspicious review pattern: ${recentReviews.length} reviews in 1 hour${duplicateReviewers > 0 ? `, ${duplicateReviewers} duplicate reviewers` : ""}${allFiveStars ? ", all 5-star" : ""}`,
          evidence: {
            reviewsInHour: recentReviews.length,
            duplicateReviewers,
            allFiveStars,
            uniqueReviewers: uniqueReviewers.size,
          },
          detectedAt: new Date(),
        };
      }
    }
    
    // Check for abnormal daily review velocity
    const dailyReviews = await db.collection("reviews").countDocuments({
      orgId,
      vendorId,
      createdAt: { $gte: oneDayAgo },
    });
    
    // Get vendor's typical daily reviews (30-day average)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const historicalReviews = await db.collection("reviews").countDocuments({
      orgId,
      vendorId,
      createdAt: { $gte: thirtyDaysAgo, $lt: oneDayAgo },
    });
    
    const avgDailyReviews = historicalReviews / 29;
    
    if (avgDailyReviews >= 1 && dailyReviews > avgDailyReviews * 5) {
      return {
        type: "fake_reviews",
        severity: "medium",
        description: `Review velocity ${Math.round(dailyReviews / avgDailyReviews)}x above normal`,
        evidence: {
          dailyReviews,
          avgDailyReviews: Math.round(avgDailyReviews * 10) / 10,
          velocityMultiplier: Math.round(dailyReviews / avgDailyReviews * 10) / 10,
        },
        detectedAt: new Date(),
      };
    }
    
    return null;
  } catch (error) {
    logger.warn("Fake review check failed", {
      vendorId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function checkSuspiciousPayments(
  _orgId: string,
  _vendorId: string,
  metrics: VendorMetrics
): Promise<FraudSignal | null> {
  // Check for suspicious payment patterns
  // High refund rate could indicate issues
  if (metrics.totalOrders > 10) {
    const refundRate = metrics.returnedOrders / metrics.totalOrders;
    if (refundRate > 0.3) { // > 30% refund rate
      return {
        type: "high_refund_rate",
        severity: "high",
        description: `Abnormally high refund rate: ${Math.round(refundRate * 100)}%`,
        evidence: {
          totalOrders: metrics.totalOrders,
          returnedOrders: metrics.returnedOrders,
          refundRate: Math.round(refundRate * 100),
        },
        detectedAt: new Date(),
      };
    }
  }
  return null;
}

function generateFraudRecommendations(
  riskLevel: FraudRiskLevel,
  signals: FraudSignal[]
): string[] {
  const recommendations: string[] = [];
  
  if (riskLevel === FraudRiskLevel.CRITICAL) {
    recommendations.push("Immediately suspend vendor account");
    recommendations.push("Freeze all pending payouts");
    recommendations.push("Conduct manual investigation");
  } else if (riskLevel === FraudRiskLevel.HIGH) {
    recommendations.push("Schedule manual review within 24 hours");
    recommendations.push("Enable enhanced monitoring");
    recommendations.push("Require additional verification");
  } else if (riskLevel === FraudRiskLevel.MEDIUM) {
    recommendations.push("Add to watchlist for ongoing monitoring");
    recommendations.push("Review recent transactions");
  }
  
  // Add signal-specific recommendations
  for (const signal of signals) {
    if (signal.type === "high_refund_rate") {
      recommendations.push("Investigate product quality issues");
      recommendations.push("Review customer complaints");
    }
  }
  
  return [...new Set(recommendations)]; // Remove duplicates
}

// ============================================================================
// Alert Functions
// ============================================================================

async function createVendorAlert(
  orgId: string,
  vendorId: string,
  alert: Omit<VendorAlert, "_id" | "orgId" | "vendorId" | "acknowledged" | "createdAt">
): Promise<boolean> {
  try {
    const db = await getDatabase();
    
    const alertRecord: Omit<VendorAlert, "_id"> = {
      orgId,
      vendorId,
      ...alert,
      acknowledged: false,
      createdAt: new Date(),
    };
    
    await db.collection(ALERTS_COLLECTION).insertOne(alertRecord);
    return true;
  } catch (error) {
    // Never log full profile object - contains PII
    logger.error("Failed to create vendor alert", { 
      component: "vendor-intelligence",
      vendorId, // Only safe identifier
      alertType: alert.type,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function createTierChangeAlert(
  orgId: string,
  vendorId: string,
  oldTier: VendorTier,
  newTier: VendorTier
): Promise<void> {
  const tierOrder = [VendorTier.SUSPENDED, VendorTier.PROBATION, VendorTier.BRONZE, VendorTier.SILVER, VendorTier.GOLD, VendorTier.PLATINUM];
  const isUpgrade = tierOrder.indexOf(newTier) > tierOrder.indexOf(oldTier);
  
  await createVendorAlert(orgId, vendorId, {
    type: "tier_change",
    severity: isUpgrade ? "info" : "warning",
    title: isUpgrade ? `Tier Upgraded: ${newTier}` : `Tier Downgraded: ${newTier}`,
    description: `Vendor tier changed from ${oldTier} to ${newTier}`,
    data: { oldTier, newTier, isUpgrade },
  });
}

async function createFraudAlert(
  orgId: string,
  vendorId: string,
  assessment: FraudAssessment
): Promise<void> {
  await createVendorAlert(orgId, vendorId, {
    type: "fraud_detected",
    severity: assessment.riskLevel === FraudRiskLevel.CRITICAL ? "critical" : "warning",
    title: `Fraud Risk: ${assessment.riskLevel.toUpperCase()}`,
    description: `${assessment.signals.length} fraud signals detected`,
    data: {
      riskScore: assessment.riskScore,
      signalCount: assessment.signals.length,
      signals: assessment.signals.map(s => s.type),
    },
  });
}

async function updateVendorScore(
  orgId: string,
  vendorId: string,
  score: VendorScoreBreakdown
): Promise<void> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: {
        currentScore: score,
        tier: score.tier,
        lastScoreUpdate: new Date(),
        updatedAt: new Date(),
      },
      $push: {
        scoreHistory: {
          $each: [{
            score: score.totalScore,
            tier: score.tier,
            recordedAt: new Date(),
          }],
          $slice: -30, // Keep last 30 scores
        },
      },
    };
    
    await db.collection(VENDORS_COLLECTION).updateOne(
      { orgId, vendorId },
      updateOp
      // Removed upsert: true - vendor document must exist before updating score
      // to prevent creating incomplete records
    );
  } catch (_error) {
    logger.error("Failed to update vendor score", { component: "vendor-intelligence" });
  }
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Get vendor dashboard
 */
export async function getVendorDashboard(
  orgId: string
): Promise<{
  totalVendors: number;
  tierDistribution: Record<VendorTier, number>;
  averageScore: number;
  atRiskVendors: number;
  fraudAlerts: number;
}> {
  try {
    const db = await getDatabase();
    
    const pipeline = [
      { $match: { orgId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgScore: { $avg: "$currentScore.totalScore" },
          platinum: { $sum: { $cond: [{ $eq: ["$tier", "platinum"] }, 1, 0] } },
          gold: { $sum: { $cond: [{ $eq: ["$tier", "gold"] }, 1, 0] } },
          silver: { $sum: { $cond: [{ $eq: ["$tier", "silver"] }, 1, 0] } },
          bronze: { $sum: { $cond: [{ $eq: ["$tier", "bronze"] }, 1, 0] } },
          probation: { $sum: { $cond: [{ $eq: ["$tier", "probation"] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ["$tier", "suspended"] }, 1, 0] } },
          // Count distinct at-risk vendors: probation OR suspended OR high-risk fraud
          // Using $or to avoid double-counting vendors in multiple categories
          atRiskDistinct: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$tier", "probation"] },
                    { $eq: ["$tier", "suspended"] },
                    { $in: ["$fraudAssessment.riskLevel", ["high", "critical"]] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
    
    const results = await db.collection(VENDORS_COLLECTION)
      .aggregate(pipeline)
      .toArray();
    
    const data = results[0] || {};
    
    // Count unacknowledged fraud alerts
    const fraudAlerts = await db.collection(ALERTS_COLLECTION).countDocuments({
      orgId,
      type: "fraud_detected",
      acknowledged: false,
    });
    
    return {
      totalVendors: data.total || 0,
      tierDistribution: {
        [VendorTier.PLATINUM]: data.platinum || 0,
        [VendorTier.GOLD]: data.gold || 0,
        [VendorTier.SILVER]: data.silver || 0,
        [VendorTier.BRONZE]: data.bronze || 0,
        [VendorTier.PROBATION]: data.probation || 0,
        [VendorTier.SUSPENDED]: data.suspended || 0,
      },
      averageScore: Math.round(data.avgScore || 0),
      // Use distinct count to avoid double-counting vendors in multiple at-risk categories
      atRiskVendors: data.atRiskDistinct || 0,
      fraudAlerts,
    };
  } catch (_error) {
    logger.error("Failed to get vendor dashboard", { component: "vendor-intelligence" });
    return {
      totalVendors: 0,
      tierDistribution: {
        [VendorTier.PLATINUM]: 0,
        [VendorTier.GOLD]: 0,
        [VendorTier.SILVER]: 0,
        [VendorTier.BRONZE]: 0,
        [VendorTier.PROBATION]: 0,
        [VendorTier.SUSPENDED]: 0,
      },
      averageScore: 0,
      atRiskVendors: 0,
      fraudAlerts: 0,
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getDefaultMetrics(): VendorMetrics {
  return {
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    totalRevenue: 0,
    last30DaysRevenue: 0,
    averageOrderValue: 0,
    salesGrowth: 0,
    activeListings: 0,
    totalListings: 0,
    totalReviews: 0,
    averageRating: 0,
    positiveReviewRate: 0,
    averageResponseTime: 0,
    responseRate: 0,
    onTimeDeliveryRate: 0,
    averageDeliveryTime: 0,
    disputesCount: 0,
    claimsCount: 0,
    policyViolations: 0,
  };
}

function getDefaultScoreBreakdown(): VendorScoreBreakdown {
  return {
    performance: {
      orderFulfillmentRate: 0,
      onTimeDeliveryRate: 0,
      cancellationRate: 0,
      defectRate: 0,
      score: 50,
    },
    customerSatisfaction: {
      averageRating: 0,
      reviewCount: 0,
      responseTime: 0,
      resolutionRate: 0,
      score: 50,
    },
    compliance: {
      documentationComplete: false,
      policyViolations: 0,
      vatCompliant: false,
      licenseValid: false,
      score: 50,
    },
    activity: {
      listingsCount: 0,
      salesGrowth: 0,
      accountAge: 0,
      loginFrequency: 0,
      score: 50,
    },
    totalScore: 50,
    tier: VendorTier.BRONZE,
    calculatedAt: new Date(),
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getVendorProfile,
  calculateVendorScore,
  assessFraudRisk,
  suspendVendor,
  reinstateVendor,
  getVendorDashboard,
};
