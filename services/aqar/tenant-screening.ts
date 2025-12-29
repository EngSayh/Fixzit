/**
 * @fileoverview Tenant Screening Service - AI-powered tenant evaluation
 * @module services/aqar/tenant-screening
 * 
 * Provides comprehensive tenant screening including:
 * - Credit worthiness evaluation
 * - Background verification
 * - Rental history analysis
 * - AI risk scoring
 * - Document verification
 * 
 * @compliance
 * - Saudi labor law for income verification
 * - Privacy regulations for data handling
 * 
 * @author [AGENT-001-A]
 * @created 2025-12-28
 */

import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Screening status
 */
export enum ScreeningStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  APPROVED = "APPROVED",
  CONDITIONALLY_APPROVED = "CONDITIONALLY_APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

/**
 * Risk level
 */
export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  VERY_HIGH = "VERY_HIGH",
}

/**
 * Document type for verification
 */
export enum DocumentType {
  NATIONAL_ID = "NATIONAL_ID",
  IQAMA = "IQAMA",
  PASSPORT = "PASSPORT",
  SALARY_CERTIFICATE = "SALARY_CERTIFICATE",
  BANK_STATEMENT = "BANK_STATEMENT",
  EMPLOYMENT_CONTRACT = "EMPLOYMENT_CONTRACT",
  PREVIOUS_LEASE = "PREVIOUS_LEASE",
  REFERENCE_LETTER = "REFERENCE_LETTER",
}

/**
 * Screening application
 */
export interface ScreeningApplication {
  _id: ObjectId;
  orgId: string;
  propertyId: string;
  unitId: string;
  applicantId: string;
  
  // Status
  status: ScreeningStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Applicant information
  applicant: {
    fullName: string;
    nationalId: string;
    dateOfBirth: Date;
    nationality: string;
    email: string;
    phone: string;
    currentAddress: string;
    employmentStatus: "employed" | "self_employed" | "retired" | "student" | "other";
    employer?: string;
    monthlyIncome: number;
    occupation?: string;
  };
  
  // Documents
  documents: {
    type: DocumentType;
    status: "pending" | "verified" | "rejected" | "expired";
    url: string;
    verifiedAt?: Date;
    verifiedBy?: string;
    notes?: string;
  }[];
  
  // Screening results
  results: {
    // Overall score (0-100)
    overallScore: number;
    riskLevel: RiskLevel;
    
    // Individual scores
    incomeScore: number;
    creditScore: number;
    rentalHistoryScore: number;
    employmentScore: number;
    documentScore: number;
    
    // Flags and notes
    redFlags: string[];
    positiveIndicators: string[];
    recommendations: string[];
    
    // Rental affordability
    affordability: {
      monthlyRent: number;
      monthlyIncome: number;
      rentToIncomeRatio: number;
      isAffordable: boolean;
    };
  };
  
  // Decision
  decision?: {
    result: "approved" | "rejected" | "conditional";
    reason: string;
    conditions?: string[];
    decidedBy: string;
    decidedAt: Date;
  };
  
  // Audit
  createdBy: string;
  assignedTo?: string;
}

/**
 * Screening request
 */
export interface CreateScreeningRequest {
  orgId: string;
  propertyId: string;
  unitId: string;
  applicant: ScreeningApplication["applicant"];
  createdBy: string;
}

/**
 * Screening score breakdown
 */
export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  factors: {
    name: string;
    points: number;
    explanation: string;
  }[];
}

// ============================================================================
// Score Configuration
// ============================================================================

const SCORING_CONFIG = {
  // Rent to income ratio thresholds
  affordabilityRatio: {
    ideal: 0.25, // 25% of income
    acceptable: 0.33, // 33% of income
    risky: 0.40, // 40% of income
  },
  
  // Minimum scores for approval
  minimumScores: {
    overall: 60,
    income: 50,
    documents: 70,
  },
  
  // Score weights
  weights: {
    income: 0.30,
    credit: 0.20,
    rentalHistory: 0.20,
    employment: 0.15,
    documents: 0.15,
  },
};

// ============================================================================
// Core Screening Operations
// ============================================================================

/**
 * Create a new screening application
 */
export async function createScreeningApplication(
  request: CreateScreeningRequest
): Promise<{ success: boolean; application?: ScreeningApplication; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Check for existing active screening
    const existing = await db.collection("screening_applications").findOne({
      orgId: request.orgId,
      unitId: request.unitId,
      "applicant.nationalId": request.applicant.nationalId,
      status: { $in: [ScreeningStatus.PENDING, ScreeningStatus.IN_PROGRESS] },
    });
    
    if (existing) {
      return { success: false, error: "Active screening already exists for this applicant" };
    }
    
    // Create applicant record if not exists
    const applicantResult = await db.collection("applicants").updateOne(
      { 
        orgId: request.orgId, 
        nationalId: request.applicant.nationalId 
      },
      {
        $set: {
          ...request.applicant,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    
    // Validate that we have a valid applicantId
    let applicantId: string;
    if (applicantResult.upsertedId) {
      applicantId = applicantResult.upsertedId.toString();
    } else {
      const existingApplicant = await db.collection("applicants").findOne({ 
        orgId: request.orgId, 
        nationalId: request.applicant.nationalId 
      });
      if (!existingApplicant?._id) {
        throw new Error(
          `Failed to find or create applicant for orgId=${request.orgId}, nationalId=${request.applicant.nationalId}`
        );
      }
      applicantId = existingApplicant._id.toString();
    }
    
    // Create screening application
    const application: Omit<ScreeningApplication, "_id"> = {
      orgId: request.orgId,
      propertyId: request.propertyId,
      unitId: request.unitId,
      applicantId,
      status: ScreeningStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      applicant: request.applicant,
      documents: [],
      results: {
        overallScore: 0,
        riskLevel: RiskLevel.HIGH,
        incomeScore: 0,
        creditScore: 0,
        rentalHistoryScore: 0,
        employmentScore: 0,
        documentScore: 0,
        redFlags: [],
        positiveIndicators: [],
        recommendations: [],
        affordability: {
          monthlyRent: 0,
          monthlyIncome: request.applicant.monthlyIncome,
          rentToIncomeRatio: 0,
          isAffordable: false,
        },
      },
      createdBy: request.createdBy,
    };
    
    const result = await db.collection("screening_applications").insertOne(application);
    
    logger.info("Screening application created", {
      applicationId: result.insertedId.toString(),
      orgId: request.orgId,
      unitId: request.unitId,
    });
    
    return {
      success: true,
      application: { ...application, _id: result.insertedId } as ScreeningApplication,
    };
  } catch (error) {
    logger.error("Failed to create screening application", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId: request.orgId,
      unitId: request.unitId,
      // PII redacted - do not log nationalId, email, phone, income
    });
    return { success: false, error: "Failed to create screening application" };
  }
}

/**
 * Add document to screening application
 */
export async function addDocument(
  orgId: string,
  applicationId: string,
  document: {
    type: DocumentType;
    url: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateDoc: any = {
      $push: {
        documents: {
          type: document.type,
          status: "pending",
          url: document.url,
        },
      },
      $set: { updatedAt: new Date() },
    };
    
    await db.collection("screening_applications").updateOne(
      { _id: new ObjectId(applicationId), orgId },
      updateDoc
    );
    
    logger.info("Document added to screening", {
      applicationId,
      documentType: document.type,
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to add document", {
      error: error instanceof Error ? error.message : "Unknown error",
      applicationId,
    });
    return { success: false, error: "Failed to add document" };
  }
}

/**
 * Verify a document
 */
export async function verifyDocument(
  orgId: string,
  applicationId: string,
  documentType: DocumentType,
  verified: boolean,
  verifiedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection("screening_applications").updateOne(
      { 
        _id: new ObjectId(applicationId), 
        orgId,
        "documents.type": documentType,
      },
      {
        $set: {
          "documents.$.status": verified ? "verified" : "rejected",
          "documents.$.verifiedAt": new Date(),
          "documents.$.verifiedBy": verifiedBy,
          "documents.$.notes": notes,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: `Document type '${documentType}' not found in application` };
    }
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to verify document", {
      error: error instanceof Error ? error.message : "Unknown error",
      applicationId,
    });
    return { success: false, error: "Failed to verify document" };
  }
}

// ============================================================================
// AI Scoring Engine
// ============================================================================

/**
 * Calculate comprehensive screening score
 */
export async function calculateScreeningScore(
  orgId: string,
  applicationId: string,
  monthlyRent: number
): Promise<{ success: boolean; results?: ScreeningApplication["results"]; error?: string }> {
  try {
    const db = await getDatabase();
    
    const application = await db.collection("screening_applications").findOne({
      _id: new ObjectId(applicationId),
      orgId,
    }) as ScreeningApplication | null;
    
    if (!application) {
      return { success: false, error: "Application not found" };
    }
    
    const applicant = application.applicant;
    const documents = application.documents;
    
    const redFlags: string[] = [];
    const positiveIndicators: string[] = [];
    const recommendations: string[] = [];
    
    // 1. Income Score (30% weight)
    const incomeScore = calculateIncomeScore(applicant, monthlyRent, redFlags, positiveIndicators);
    
    // 2. Credit Score (20% weight) - Would integrate with credit bureau
    const creditScore = await calculateCreditScore(orgId, applicant.nationalId, redFlags, positiveIndicators);
    
    // 3. Rental History Score (20% weight)
    const rentalHistoryScore = await calculateRentalHistoryScore(
      orgId, 
      applicant.nationalId, 
      redFlags, 
      positiveIndicators
    );
    
    // 4. Employment Score (15% weight)
    const employmentScore = calculateEmploymentScore(applicant, redFlags, positiveIndicators);
    
    // 5. Document Score (15% weight)
    const documentScore = calculateDocumentScore(documents, redFlags, positiveIndicators);
    
    // Calculate overall score
    const overallScore = Math.round(
      incomeScore * SCORING_CONFIG.weights.income +
      creditScore * SCORING_CONFIG.weights.credit +
      rentalHistoryScore * SCORING_CONFIG.weights.rentalHistory +
      employmentScore * SCORING_CONFIG.weights.employment +
      documentScore * SCORING_CONFIG.weights.documents
    );
    
    // Determine risk level
    let riskLevel: RiskLevel;
    if (overallScore >= 80) {
      riskLevel = RiskLevel.LOW;
    } else if (overallScore >= 60) {
      riskLevel = RiskLevel.MEDIUM;
    } else if (overallScore >= 40) {
      riskLevel = RiskLevel.HIGH;
    } else {
      riskLevel = RiskLevel.VERY_HIGH;
    }
    
    // Calculate affordability - guard against zero/negative income
    let rentToIncomeRatio: number;
    let isAffordable: boolean;
    
    if (!applicant.monthlyIncome || applicant.monthlyIncome <= 0) {
      rentToIncomeRatio = Number.POSITIVE_INFINITY;
      isAffordable = false;
      redFlags.push("Monthly income is zero or not provided - affordability cannot be calculated");
    } else {
      rentToIncomeRatio = monthlyRent / applicant.monthlyIncome;
      isAffordable = rentToIncomeRatio <= SCORING_CONFIG.affordabilityRatio.acceptable;
    }
    
    // Generate recommendations
    if (!isAffordable) {
      recommendations.push("Consider requiring a co-signer or larger security deposit");
    }
    if (documentScore < 70) {
      recommendations.push("Request additional documentation to verify applicant claims");
    }
    if (rentalHistoryScore < 50) {
      recommendations.push("Conduct thorough reference checks with previous landlords");
    }
    if (overallScore >= SCORING_CONFIG.minimumScores.overall) {
      recommendations.push("Applicant meets minimum requirements for approval");
    }
    
    const results: ScreeningApplication["results"] = {
      overallScore,
      riskLevel,
      incomeScore,
      creditScore,
      rentalHistoryScore,
      employmentScore,
      documentScore,
      redFlags,
      positiveIndicators,
      recommendations,
      affordability: {
        monthlyRent,
        monthlyIncome: applicant.monthlyIncome,
        rentToIncomeRatio, // Store as decimal (e.g., 0.33 for 33%) - consistent with isAffordable comparison
        isAffordable,
      },
    };
    
    // Update application
    await db.collection("screening_applications").updateOne(
      { _id: new ObjectId(applicationId), orgId },
      {
        $set: {
          results,
          status: ScreeningStatus.IN_PROGRESS,
          updatedAt: new Date(),
        },
      }
    );
    
    logger.info("Screening score calculated", {
      applicationId,
      overallScore,
      riskLevel,
    });
    
    return { success: true, results };
  } catch (error) {
    logger.error("Failed to calculate screening score", {
      error: error instanceof Error ? error.message : "Unknown error",
      applicationId,
    });
    return { success: false, error: "Failed to calculate screening score" };
  }
}

/**
 * Calculate income score
 */
function calculateIncomeScore(
  applicant: ScreeningApplication["applicant"],
  monthlyRent: number,
  redFlags: string[],
  positiveIndicators: string[]
): number {
  let score = 50; // Base score
  
  // Guard against zero/negative income
  if (!applicant.monthlyIncome || applicant.monthlyIncome <= 0) {
    redFlags.push("Zero or missing monthly income - cannot assess affordability");
    return 0; // Minimum score for unverifiable income
  }
  
  const rentToIncome = monthlyRent / applicant.monthlyIncome;
  
  if (rentToIncome <= SCORING_CONFIG.affordabilityRatio.ideal) {
    score += 50;
    positiveIndicators.push(`Excellent rent-to-income ratio: ${Math.round(rentToIncome * 100)}%`);
  } else if (rentToIncome <= SCORING_CONFIG.affordabilityRatio.acceptable) {
    score += 30;
    positiveIndicators.push(`Acceptable rent-to-income ratio: ${Math.round(rentToIncome * 100)}%`);
  } else if (rentToIncome <= SCORING_CONFIG.affordabilityRatio.risky) {
    score += 10;
    redFlags.push(`High rent-to-income ratio: ${Math.round(rentToIncome * 100)}%`);
  } else {
    redFlags.push(`Very high rent-to-income ratio: ${Math.round(rentToIncome * 100)}% - exceeds 40%`);
  }
  
  // Bonus for high income
  if (applicant.monthlyIncome > 20000) {
    score += 10;
    positiveIndicators.push("High income earner");
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate credit score
 * Note: Would integrate with credit bureau in production
 */
async function calculateCreditScore(
  orgId: string,
  nationalId: string,
  redFlags: string[],
  positiveIndicators: string[]
): Promise<number> {
  // Placeholder - would integrate with SIMAH or other Saudi credit bureau
  // For now, return a neutral score with random variation
  
  try {
    const db = await getDatabase();
    
    // Check for any previous payment defaults in our system
    const defaults = await db.collection("payment_history").countDocuments({
      orgId,
      tenantNationalId: nationalId,
      status: "defaulted",
    });
    
    if (defaults > 0) {
      redFlags.push(`${defaults} previous payment default(s) on record`);
      return Math.max(20, 70 - defaults * 20);
    }
    
    // Check for positive payment history
    const onTimePayments = await db.collection("payment_history").countDocuments({
      orgId,
      tenantNationalId: nationalId,
      status: "paid",
      paidOnTime: true,
    });
    
    if (onTimePayments > 12) {
      positiveIndicators.push("Strong payment history with on-time payments");
      return 90;
    } else if (onTimePayments > 6) {
      positiveIndicators.push("Good payment history");
      return 75;
    }
    
    // No history - neutral score
    return 60;
  } catch {
    return 60; // Default neutral score on error
  }
}

/**
 * Calculate rental history score
 */
async function calculateRentalHistoryScore(
  orgId: string,
  nationalId: string,
  redFlags: string[],
  positiveIndicators: string[]
): Promise<number> {
  try {
    const db = await getDatabase();
    
    // Check for evictions
    const evictions = await db.collection("eviction_records").countDocuments({
      tenantNationalId: nationalId,
    });
    
    if (evictions > 0) {
      redFlags.push(`${evictions} eviction record(s) found`);
      return Math.max(0, 40 - evictions * 20);
    }
    
    // Check previous leases in our system
    const previousLeases = await db.collection("leases").find({
      "tenantSnapshot.nationalId": nationalId,
      status: { $in: ["RENEWED", "EXPIRED"] }, // Completed leases
    }).toArray();
    
    if (previousLeases.length > 0) {
      const renewedCount = previousLeases.filter(l => l.status === "RENEWED").length;
      if (renewedCount > 0) {
        positiveIndicators.push(`${renewedCount} lease renewal(s) - indicates good tenant relationship`);
        return 85 + Math.min(15, renewedCount * 5);
      }
      positiveIndicators.push("Previous rental history found");
      return 70;
    }
    
    // No rental history - neutral
    return 50;
  } catch {
    return 50;
  }
}

/**
 * Calculate employment score
 */
function calculateEmploymentScore(
  applicant: ScreeningApplication["applicant"],
  redFlags: string[],
  positiveIndicators: string[]
): number {
  let score = 50;
  
  switch (applicant.employmentStatus) {
    case "employed":
      score += 30;
      positiveIndicators.push("Stable employment");
      if (applicant.employer) {
        score += 10;
        positiveIndicators.push(`Employed at ${applicant.employer}`);
      }
      break;
    case "self_employed":
      score += 20;
      positiveIndicators.push("Self-employed");
      break;
    case "retired":
      score += 25;
      positiveIndicators.push("Retired with stable income");
      break;
    case "student":
      score += 5;
      redFlags.push("Student - may need guarantor");
      break;
    default:
      redFlags.push("Employment status unclear");
  }
  
  return Math.min(100, score);
}

/**
 * Calculate document score
 */
function calculateDocumentScore(
  documents: ScreeningApplication["documents"],
  redFlags: string[],
  positiveIndicators: string[]
): number {
  if (documents.length === 0) {
    redFlags.push("No documents submitted");
    return 0;
  }
  
  const verifiedCount = documents.filter(d => d.status === "verified").length;
  const rejectedCount = documents.filter(d => d.status === "rejected").length;
  const totalCount = documents.length;
  
  if (rejectedCount > 0) {
    redFlags.push(`${rejectedCount} document(s) rejected`);
  }
  
  if (verifiedCount === totalCount && totalCount >= 3) {
    positiveIndicators.push("All documents verified");
    return 100;
  }
  
  if (verifiedCount >= 3) {
    positiveIndicators.push("Core documents verified");
    return 80;
  }
  
  const score = Math.round((verifiedCount / Math.max(3, totalCount)) * 100);
  return Math.min(100, Math.max(0, score));
}

// ============================================================================
// Decision Making
// ============================================================================

/**
 * Make screening decision
 */
export async function makeDecision(
  orgId: string,
  applicationId: string,
  decision: "approved" | "rejected" | "conditional",
  reason: string,
  decidedBy: string,
  conditions?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const status = decision === "approved" 
      ? ScreeningStatus.APPROVED
      : decision === "conditional"
      ? ScreeningStatus.CONDITIONALLY_APPROVED
      : ScreeningStatus.REJECTED;
    
    const result = await db.collection("screening_applications").updateOne(
      { _id: new ObjectId(applicationId), orgId },
      {
        $set: {
          status,
          decision: {
            result: decision,
            reason,
            conditions,
            decidedBy,
            decidedAt: new Date(),
          },
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: `Application ${applicationId} not found in org ${orgId}` };
    }
    
    logger.info("Screening decision made", {
      applicationId,
      decision,
      decidedBy,
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to make screening decision", {
      error: error instanceof Error ? error.message : "Unknown error",
      applicationId,
    });
    return { success: false, error: "Failed to make decision" };
  }
}

/**
 * Get screening summary for display
 */
export async function getScreeningSummary(
  orgId: string,
  applicationId: string
): Promise<{
  application: ScreeningApplication | null;
  scoreBreakdown: ScoreBreakdown[];
}> {
  try {
    const db = await getDatabase();
    
    const application = await db.collection("screening_applications").findOne({
      _id: new ObjectId(applicationId),
      orgId,
    }) as ScreeningApplication | null;
    
    if (!application) {
      return { application: null, scoreBreakdown: [] };
    }
    
    const results = application.results;
    
    const scoreBreakdown: ScoreBreakdown[] = [
      {
        category: "Income & Affordability",
        score: results.incomeScore,
        maxScore: 100,
        factors: [
          {
            name: "Rent-to-Income Ratio",
            points: results.affordability.isAffordable ? 30 : 10,
            explanation: `${results.affordability.rentToIncomeRatio}% of income`,
          },
        ],
      },
      {
        category: "Credit History",
        score: results.creditScore,
        maxScore: 100,
        factors: [],
      },
      {
        category: "Rental History",
        score: results.rentalHistoryScore,
        maxScore: 100,
        factors: [],
      },
      {
        category: "Employment",
        score: results.employmentScore,
        maxScore: 100,
        factors: [
          {
            name: "Employment Status",
            points: results.employmentScore,
            explanation: application.applicant.employmentStatus,
          },
        ],
      },
      {
        category: "Documentation",
        score: results.documentScore,
        maxScore: 100,
        factors: [
          {
            name: "Documents Verified",
            points: results.documentScore,
            explanation: `${application.documents.filter(d => d.status === "verified").length}/${application.documents.length} verified`,
          },
        ],
      },
    ];
    
    return { application, scoreBreakdown };
  } catch (error) {
    logger.error("Failed to get screening summary", {
      error: error instanceof Error ? error.message : "Unknown error",
      applicationId,
    });
    return { application: null, scoreBreakdown: [] };
  }
}
