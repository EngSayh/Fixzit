/**
 * @fileoverview Performance Management Service
 * @module services/hr/performance-management
 * 
 * Comprehensive employee performance management:
 * - Goal setting and OKR management
 * - Performance review cycles
 * - 360-degree feedback collection
 * - AI-powered performance insights
 * - Career development tracking
 * - Competency assessments
 * 
 * @status IMPLEMENTED [AGENT-001-A]
 * @created 2025-12-29
 */

import { ObjectId, type WithId, type Document } from "mongodb";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Review cycle types
 */
export enum ReviewCycleType {
  ANNUAL = "annual",
  SEMI_ANNUAL = "semi_annual",
  QUARTERLY = "quarterly",
  MONTHLY = "monthly",
  PROBATION = "probation",
  PROJECT_BASED = "project_based",
}

/**
 * Review status
 */
export enum ReviewStatus {
  DRAFT = "draft",
  SELF_ASSESSMENT = "self_assessment",
  MANAGER_REVIEW = "manager_review",
  CALIBRATION = "calibration",
  FINALIZED = "finalized",
  ACKNOWLEDGED = "acknowledged",
}

/**
 * Goal status
 */
export enum GoalStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  AT_RISK = "at_risk",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

/**
 * Rating scale
 */
export enum Rating {
  EXCEPTIONAL = 5,
  EXCEEDS_EXPECTATIONS = 4,
  MEETS_EXPECTATIONS = 3,
  NEEDS_IMPROVEMENT = 2,
  UNSATISFACTORY = 1,
}

/**
 * Goal/OKR record
 */
export interface Goal {
  _id?: ObjectId;
  orgId: string;
  employeeId: string;
  reviewCycleId?: string;
  title: string;
  titleAr?: string;
  description: string;
  category: "business" | "development" | "team" | "personal";
  type: "goal" | "okr";
  weight: number; // Percentage weight in overall score
  status: GoalStatus;
  startDate?: Date | string | null; // Optional start date for progress tracking
  targetDate: Date;
  progress: number; // 0-100
  keyResults?: KeyResult[];
  milestones: Milestone[];
  metrics?: GoalMetric[];
  alignedTo?: string; // Parent goal ID for cascading
  visibility: "private" | "team" | "company";
  comments: GoalComment[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * OKR Key Result
 */
export interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number;
  status: GoalStatus;
}

/**
 * Goal milestone
 */
export interface Milestone {
  id: string;
  title: string;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
}

/**
 * Goal metric
 */
export interface GoalMetric {
  name: string;
  target: number;
  current: number;
  unit: string;
}

/**
 * Goal comment
 */
export interface GoalComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

/**
 * Review cycle
 */
export interface ReviewCycle {
  _id?: ObjectId;
  orgId: string;
  name: string;
  nameAr?: string;
  type: ReviewCycleType;
  year: number;
  quarter?: number;
  startDate: Date;
  endDate: Date;
  selfAssessmentDeadline: Date;
  managerReviewDeadline: Date;
  calibrationDeadline: Date;
  finalizationDate: Date;
  status: "planning" | "active" | "review" | "calibration" | "completed";
  competencies: Competency[];
  ratingScale: RatingScale;
  participantCount: number;
  completedCount: number;
  settings: ReviewCycleSettings;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Competency definition
 */
export interface Competency {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  category: "core" | "leadership" | "technical" | "behavioral";
  weight: number;
  levels: CompetencyLevel[];
}

/**
 * Competency level descriptor
 */
export interface CompetencyLevel {
  rating: Rating;
  description: string;
  descriptionAr?: string;
}

/**
 * Rating scale configuration
 */
export interface RatingScale {
  exceptional: { min: number; max: number; label: string; labelAr?: string };
  exceeds: { min: number; max: number; label: string; labelAr?: string };
  meets: { min: number; max: number; label: string; labelAr?: string };
  needs: { min: number; max: number; label: string; labelAr?: string };
  unsatisfactory: { min: number; max: number; label: string; labelAr?: string };
}

/**
 * Review cycle settings
 */
export interface ReviewCycleSettings {
  includeGoals: boolean;
  goalWeight: number;
  includeCompetencies: boolean;
  competencyWeight: number;
  include360Feedback: boolean;
  feedbackWeight: number;
  requireSelfAssessment: boolean;
  enableCalibration: boolean;
  anonymousFeedback: boolean;
}

/**
 * Performance review
 */
export interface PerformanceReview {
  _id?: ObjectId;
  orgId: string;
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  reviewCycleId: string;
  status: ReviewStatus;
  selfAssessment?: SelfAssessment;
  managerAssessment?: ManagerAssessment;
  feedbackResponses: FeedbackResponse[];
  goals: ReviewGoal[];
  competencyRatings: CompetencyRating[];
  overallRating?: number;
  calibratedRating?: number;
  calibrationNotes?: string;
  strengths: string[];
  areasForImprovement: string[];
  developmentPlan: DevelopmentItem[];
  managerComments?: string;
  employeeComments?: string;
  acknowledgement?: {
    acknowledged: boolean;
    acknowledgedAt?: Date;
    employeeSignature?: string;
  };
  aiInsights?: PerformanceInsight[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Self assessment section
 */
export interface SelfAssessment {
  completedAt: Date;
  overallSelfRating: number;
  accomplishments: string[];
  challenges: string[];
  developmentGoals: string[];
  additionalComments?: string;
}

/**
 * Manager assessment section
 */
export interface ManagerAssessment {
  completedAt: Date;
  overallRating: number;
  keyAccomplishments: string[];
  areasForImprovement: string[];
  recommendedActions: string[];
  promotionRecommendation?: "ready" | "1_year" | "2_years" | "not_recommended";
  compensationRecommendation?: "increase" | "bonus" | "both" | "none";
}

/**
 * 360 feedback response
 */
export interface FeedbackResponse {
  id: string;
  providerId: string;
  providerName?: string; // Only if not anonymous
  relationship: "manager" | "peer" | "direct_report" | "cross_functional" | "external";
  ratings: { competencyId: string; rating: number }[];
  strengths: string[];
  improvements: string[];
  comments?: string;
  submittedAt: Date;
}

/**
 * Goal in review context
 */
export interface ReviewGoal {
  goalId: string;
  title: string;
  weight: number;
  targetProgress: number;
  actualProgress: number;
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;
}

/**
 * Competency rating
 */
export interface CompetencyRating {
  competencyId: string;
  competencyName: string;
  selfRating?: number;
  managerRating?: number;
  peerAverage?: number;
  finalRating?: number;
  weight?: number; // Weight for weighted average calculation
}

/**
 * Development plan item
 */
export interface DevelopmentItem {
  id: string;
  area: string;
  action: string;
  targetDate: Date;
  resources?: string[];
  status: "planned" | "in_progress" | "completed";
  progress: number;
}

/**
 * AI-generated performance insight
 */
export interface PerformanceInsight {
  type: "strength" | "development" | "trend" | "recommendation";
  title: string;
  description: string;
  confidence: number;
  supporting_data: string[];
}

// ============================================================================
// Constants
// ============================================================================

const GOALS_COLLECTION = "performance_goals";
const CYCLES_COLLECTION = "review_cycles";
const REVIEWS_COLLECTION = "performance_reviews";

/**
 * Default competencies - weights must sum to 100%
 * These are partial defaults; organizations should customize.
 * Runtime validation ensures total weight === 100.
 */
const DEFAULT_COMPETENCIES: Omit<Competency, "id">[] = [
  {
    name: "Communication",
    nameAr: "التواصل",
    description: "Effectively conveys information and ideas",
    category: "core",
    weight: 15,
    levels: [
      { rating: Rating.EXCEPTIONAL, description: "Masterfully communicates complex ideas" },
      { rating: Rating.EXCEEDS_EXPECTATIONS, description: "Consistently clear and persuasive" },
      { rating: Rating.MEETS_EXPECTATIONS, description: "Communicates adequately" },
      { rating: Rating.NEEDS_IMPROVEMENT, description: "Sometimes unclear or incomplete" },
      { rating: Rating.UNSATISFACTORY, description: "Frequently miscommunicates" },
    ],
  },
  {
    name: "Problem Solving",
    nameAr: "حل المشكلات",
    description: "Analyzes issues and develops effective solutions",
    category: "core",
    weight: 20,
    levels: [
      { rating: Rating.EXCEPTIONAL, description: "Solves complex problems innovatively" },
      { rating: Rating.EXCEEDS_EXPECTATIONS, description: "Consistently finds effective solutions" },
      { rating: Rating.MEETS_EXPECTATIONS, description: "Adequately solves routine problems" },
      { rating: Rating.NEEDS_IMPROVEMENT, description: "Sometimes struggles with problems" },
      { rating: Rating.UNSATISFACTORY, description: "Unable to solve basic problems" },
    ],
  },
  {
    name: "Teamwork",
    nameAr: "العمل الجماعي",
    description: "Collaborates effectively with others",
    category: "behavioral",
    weight: 15,
    levels: [
      { rating: Rating.EXCEPTIONAL, description: "Elevates entire team performance" },
      { rating: Rating.EXCEEDS_EXPECTATIONS, description: "Highly collaborative and supportive" },
      { rating: Rating.MEETS_EXPECTATIONS, description: "Works well with team" },
      { rating: Rating.NEEDS_IMPROVEMENT, description: "Sometimes difficult to work with" },
      { rating: Rating.UNSATISFACTORY, description: "Does not collaborate" },
    ],
  },
  {
    name: "Technical Skills",
    nameAr: "المهارات التقنية",
    description: "Demonstrates proficiency in role-specific technical skills",
    category: "technical",
    weight: 25,
    levels: [
      { rating: Rating.EXCEPTIONAL, description: "Expert-level technical mastery" },
      { rating: Rating.EXCEEDS_EXPECTATIONS, description: "Advanced technical proficiency" },
      { rating: Rating.MEETS_EXPECTATIONS, description: "Competent in required skills" },
      { rating: Rating.NEEDS_IMPROVEMENT, description: "Developing technical abilities" },
      { rating: Rating.UNSATISFACTORY, description: "Lacks required technical skills" },
    ],
  },
  {
    name: "Initiative & Ownership",
    nameAr: "المبادرة والمسؤولية",
    description: "Takes initiative and ownership of work",
    category: "behavioral",
    weight: 15,
    levels: [
      { rating: Rating.EXCEPTIONAL, description: "Drives significant improvements proactively" },
      { rating: Rating.EXCEEDS_EXPECTATIONS, description: "Regularly takes initiative" },
      { rating: Rating.MEETS_EXPECTATIONS, description: "Takes ownership when assigned" },
      { rating: Rating.NEEDS_IMPROVEMENT, description: "Requires frequent direction" },
      { rating: Rating.UNSATISFACTORY, description: "Avoids responsibility" },
    ],
  },
  {
    name: "Adaptability",
    nameAr: "القدرة على التكيف",
    description: "Adapts to change and handles ambiguity",
    category: "behavioral",
    weight: 10,
    levels: [
      { rating: Rating.EXCEPTIONAL, description: "Thrives in changing environments" },
      { rating: Rating.EXCEEDS_EXPECTATIONS, description: "Quickly adapts to new situations" },
      { rating: Rating.MEETS_EXPECTATIONS, description: "Handles change adequately" },
      { rating: Rating.NEEDS_IMPROVEMENT, description: "Struggles with change" },
      { rating: Rating.UNSATISFACTORY, description: "Resists change" },
    ],
  },
];

// Validate DEFAULT_COMPETENCIES weights sum to 100%
const totalWeight = DEFAULT_COMPETENCIES.reduce((sum, c) => sum + c.weight, 0);
if (totalWeight !== 100) {
  // eslint-disable-next-line no-console -- Startup validation warning
  console.warn(`[performance-management] DEFAULT_COMPETENCIES weights sum to ${totalWeight}%, expected 100%`);
}

// ============================================================================
// Goal Management
// ============================================================================

/**
 * Create goal or OKR
 */
export async function createGoal(
  orgId: string,
  data: Omit<Goal, "_id" | "status" | "progress" | "comments" | "createdAt" | "updatedAt">
): Promise<{ success: boolean; goalId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    const goal: Omit<Goal, "_id"> = {
      ...data,
      orgId,
      status: GoalStatus.NOT_STARTED,
      progress: 0,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(GOALS_COLLECTION).insertOne(goal);
    
    logger.info("Goal created", {
      component: "performance-management",
      action: "createGoal",
    });
    
    return { success: true, goalId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to create goal", { component: "performance-management" });
    return { success: false, error: "Failed to create goal" };
  }
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(
  goalId: string,
  orgId: string,
  progress: number,
  userId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // First, fetch the goal to check for AT_RISK status
    const goal = await db.collection(GOALS_COLLECTION).findOne({
      _id: new ObjectId(goalId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!goal) {
      return { success: false, error: "Goal not found" };
    }
    
    // Determine status based on progress and time remaining
    let status = GoalStatus.IN_PROGRESS;
    if (progress === 0) {
      status = GoalStatus.NOT_STARTED;
    } else if (progress >= 100) {
      status = GoalStatus.COMPLETED;
    } else {
      // Check if goal is at risk based on time vs progress
      const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
      const startDate = goal.startDate ? new Date(goal.startDate) : (goal.createdAt ? new Date(goal.createdAt) : null);
      const now = new Date();
      
      if (targetDate && startDate && targetDate > startDate) {
        const totalDuration = targetDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);
        
        // At risk if expected progress exceeds actual by more than 20%
        if (expectedProgress - progress > 20) {
          status = GoalStatus.AT_RISK;
        }
      }
    }
    
    // Build update document - using conditional structure to properly type $push
    const baseUpdate = {
      $set: {
        progress: Math.min(100, Math.max(0, progress)),
        status,
        updatedAt: new Date(),
      },
    };
    
    const updateWithComment = comment ? {
      ...baseUpdate,
      $push: {
        comments: {
          id: new ObjectId().toString(),
          userId,
          userName: "User", // Would be resolved from session
          content: comment,
          createdAt: new Date(),
        },
      },
    } : baseUpdate;
    
    const result = await db.collection(GOALS_COLLECTION).updateOne(
      { _id: new ObjectId(goalId), orgId },
      updateWithComment as Document
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: "Goal not found" };
    }
    
    // matchedCount > 0 but modifiedCount === 0 means goal found but no change needed
    // Still return success since the goal exists and is already at the desired state
    
    logger.info("Goal progress updated", {
      component: "performance-management",
      action: "updateGoalProgress",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to update progress", { component: "performance-management" });
    return { success: false, error: "Failed to update progress" };
  }
}

/**
 * Get employee goals
 */
export async function getEmployeeGoals(
  employeeId: string,
  orgId: string,
  options?: {
    status?: GoalStatus;
    reviewCycleId?: string;
  }
): Promise<Goal[]> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { orgId, employeeId };
    if (options?.status) query.status = options.status;
    if (options?.reviewCycleId) query.reviewCycleId = options.reviewCycleId;
    
    const goals = await db.collection(GOALS_COLLECTION)
      .find(query)
      .sort({ targetDate: 1 })
      .toArray();
    
    return goals as unknown as Goal[];
  } catch (_error) {
    logger.error("Failed to get goals", { component: "performance-management" });
    return [];
  }
}

// ============================================================================
// Review Cycle Management
// ============================================================================

/**
 * Create review cycle
 */
export async function createReviewCycle(
  orgId: string,
  data: Omit<ReviewCycle, "_id" | "participantCount" | "completedCount" | "status" | "createdAt" | "updatedAt">,
  userId: string
): Promise<{ success: boolean; cycleId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Add default competencies if none provided
    const competencies = data.competencies.length > 0
      ? data.competencies
      : DEFAULT_COMPETENCIES.map(c => ({ ...c, id: new ObjectId().toString() }));
    
    const cycle: Omit<ReviewCycle, "_id"> = {
      ...data,
      orgId,
      competencies,
      status: "planning",
      participantCount: 0,
      completedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };
    
    const result = await db.collection(CYCLES_COLLECTION).insertOne(cycle);
    
    logger.info("Review cycle created", {
      component: "performance-management",
      action: "createReviewCycle",
    });
    
    return { success: true, cycleId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to create cycle", { component: "performance-management" });
    return { success: false, error: "Failed to create review cycle" };
  }
}

/**
 * Launch review cycle
 */
export async function launchReviewCycle(
  cycleId: string,
  orgId: string,
  employeeIds: string[]
): Promise<{ success: boolean; reviewsCreated: number; error?: string }> {
  try {
    const db = await getDatabase();
    
    const cycle = await db.collection(CYCLES_COLLECTION).findOne({
      _id: new ObjectId(cycleId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!cycle) {
      return { success: false, reviewsCreated: 0, error: "Cycle not found" };
    }
    
    // Create reviews for each employee
    const reviews: Omit<PerformanceReview, "_id">[] = [];
    
    for (const employeeId of employeeIds) {
      // TODO: In production, fetch employee and manager details from employees collection
      // For now, using placeholder values - this should be enhanced to:
      // const employee = await db.collection("employees").findOne({ _id: employeeId, orgId });
      // const manager = employee?.managerId ? await db.collection("employees").findOne({ _id: employee.managerId, orgId }) : null;
      const review: Omit<PerformanceReview, "_id"> = {
        orgId,
        employeeId,
        employeeName: "Employee", // TODO: Resolve from employee directory
        managerId: "manager", // TODO: Resolve from employee.managerId
        managerName: "Manager", // TODO: Resolve from manager record
        reviewCycleId: cycleId,
        status: ReviewStatus.SELF_ASSESSMENT,
        feedbackResponses: [],
        goals: [],
        competencyRatings: [],
        strengths: [],
        areasForImprovement: [],
        developmentPlan: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      reviews.push(review);
    }
    
    // Wrap insertMany and cycle update in transaction for atomicity
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        if (reviews.length > 0) {
          await db.collection(REVIEWS_COLLECTION).insertMany(reviews, { session });
        }
        
        // Update cycle status
        await db.collection(CYCLES_COLLECTION).updateOne(
          { _id: new ObjectId(cycleId) },
          {
            $set: {
              status: "active",
              participantCount: employeeIds.length,
              updatedAt: new Date(),
            },
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
    
    logger.info("Review cycle launched", {
      component: "performance-management",
      action: "launchReviewCycle",
    });
    
    return { success: true, reviewsCreated: reviews.length };
  } catch (_error) {
    logger.error("Failed to launch cycle", { component: "performance-management" });
    return { success: false, reviewsCreated: 0, error: "Failed to launch cycle" };
  }
}

// ============================================================================
// Performance Reviews
// ============================================================================

/**
 * Submit self assessment
 */
export async function submitSelfAssessment(
  reviewId: string,
  orgId: string,
  assessment: Omit<SelfAssessment, "completedAt">,
  competencyRatings: { competencyId: string; rating: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Get review to find cycle
    const review = await db.collection(REVIEWS_COLLECTION).findOne({
      _id: new ObjectId(reviewId),
      orgId,
      status: ReviewStatus.SELF_ASSESSMENT,
    }) as WithId<Document> | null;
    
    if (!review) {
      return { success: false, error: "Review not found or not in self-assessment phase" };
    }
    
    // Fetch cycle to get competency names
    const cycle = await db.collection(CYCLES_COLLECTION).findOne({
      _id: new ObjectId((review as unknown as PerformanceReview).reviewCycleId),
      orgId,
    }) as WithId<Document> | null;
    
    // Build competency id -> name map
    const competencyMap = new Map<string, string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cycleData = cycle as Record<string, any> | null;
    if (cycleData && cycleData.competencies) {
      for (const comp of cycleData.competencies) {
        competencyMap.set(comp.id || comp._id?.toString(), comp.name || "Unknown");
      }
    }
    
    // Build competency ratings with self-rating and resolved names
    const ratings = competencyRatings.map(cr => ({
      competencyId: cr.competencyId,
      competencyName: competencyMap.get(cr.competencyId) || "Unknown",
      selfRating: cr.rating,
    }));
    
    const result = await db.collection(REVIEWS_COLLECTION).updateOne(
      { _id: new ObjectId(reviewId), orgId, status: ReviewStatus.SELF_ASSESSMENT },
      {
        $set: {
          selfAssessment: {
            ...assessment,
            completedAt: new Date(),
          },
          competencyRatings: ratings,
          status: ReviewStatus.MANAGER_REVIEW,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Review not found or not in self-assessment phase" };
    }
    
    logger.info("Self assessment submitted", {
      component: "performance-management",
      action: "submitSelfAssessment",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to submit self assessment", { component: "performance-management" });
    return { success: false, error: "Failed to submit self assessment" };
  }
}

/**
 * Submit manager assessment
 */
export async function submitManagerAssessment(
  reviewId: string,
  orgId: string,
  assessment: Omit<ManagerAssessment, "completedAt">,
  competencyRatings: { competencyId: string; rating: number }[],
  // Note: goalRatings is reserved for future goal-based performance tracking
  // Currently unused - goal ratings are tracked separately via updateGoalProgress
  _goalRatings: { goalId: string; rating: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const review = await db.collection(REVIEWS_COLLECTION).findOne({
      _id: new ObjectId(reviewId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!review) {
      return { success: false, error: "Review not found" };
    }
    
    // Validate review is in correct status for manager submission
    const reviewData = review as unknown as PerformanceReview;
    if (reviewData.status !== ReviewStatus.MANAGER_REVIEW) {
      return { success: false, error: "Review is not ready for manager assessment" };
    }
    
    const existingRatings = reviewData.competencyRatings || [];
    
    // Merge manager ratings with existing self ratings
    const mergedRatings = existingRatings.map(r => {
      const managerRating = competencyRatings.find(cr => cr.competencyId === r.competencyId);
      return {
        ...r,
        managerRating: managerRating?.rating,
        finalRating: managerRating?.rating, // Default to manager rating
        weight: r.weight ?? 1, // Ensure weight is present for calculation
      };
    });
    
    // Calculate overall rating using weighted average
    const totalWeight = mergedRatings.reduce((sum, r) => sum + (r.weight ?? 1), 0);
    const weightedSum = mergedRatings.reduce((sum, r) => sum + ((r.finalRating || 3) * (r.weight ?? 1)), 0);
    const overallRating = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 3;
    
    const result = await db.collection(REVIEWS_COLLECTION).updateOne(
      { _id: new ObjectId(reviewId), orgId },
      {
        $set: {
          managerAssessment: {
            ...assessment,
            completedAt: new Date(),
          },
          competencyRatings: mergedRatings,
          overallRating,
          areasForImprovement: assessment.areasForImprovement,
          status: ReviewStatus.CALIBRATION,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Failed to update review" };
    }
    
    logger.info("Manager assessment submitted", {
      component: "performance-management",
      action: "submitManagerAssessment",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to submit manager assessment", { component: "performance-management" });
    return { success: false, error: "Failed to submit manager assessment" };
  }
}

/**
 * Finalize review after calibration
 */
export async function finalizeReview(
  reviewId: string,
  orgId: string,
  calibratedRating: number,
  calibrationNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection(REVIEWS_COLLECTION).updateOne(
      { _id: new ObjectId(reviewId), orgId, status: ReviewStatus.CALIBRATION },
      {
        $set: {
          calibratedRating,
          calibrationNotes,
          status: ReviewStatus.FINALIZED,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Review not found or not in calibration" };
    }
    
    // Update cycle completion count
    const review = await db.collection(REVIEWS_COLLECTION).findOne({
      _id: new ObjectId(reviewId),
    }) as WithId<Document> | null;
    
    if (review) {
      const r = review as unknown as PerformanceReview;
      await db.collection(CYCLES_COLLECTION).updateOne(
        { _id: new ObjectId(r.reviewCycleId) },
        { $inc: { completedCount: 1 } }
      );
    }
    
    logger.info("Review finalized", {
      component: "performance-management",
      action: "finalizeReview",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to finalize review", { component: "performance-management" });
    return { success: false, error: "Failed to finalize review" };
  }
}

// ============================================================================
// AI Insights
// ============================================================================

/**
 * Generate AI performance insights
 */
export async function generatePerformanceInsights(
  reviewId: string,
  orgId: string
): Promise<PerformanceInsight[]> {
  try {
    const db = await getDatabase();
    const insights: PerformanceInsight[] = [];
    
    const review = await db.collection(REVIEWS_COLLECTION).findOne({
      _id: new ObjectId(reviewId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!review) return [];
    
    const r = review as unknown as PerformanceReview;
    
    // Analyze competency ratings
    const highRatings = r.competencyRatings.filter(cr => (cr.finalRating || 0) >= 4);
    const lowRatings = r.competencyRatings.filter(cr => (cr.finalRating || 0) <= 2);
    
    if (highRatings.length > 0) {
      insights.push({
        type: "strength",
        title: "Key Strengths Identified",
        description: `Employee excels in ${highRatings.length} competency areas`,
        confidence: 0.85,
        supporting_data: highRatings.map(r => r.competencyName),
      });
    }
    
    if (lowRatings.length > 0) {
      insights.push({
        type: "development",
        title: "Development Opportunities",
        description: `Focus areas identified for ${lowRatings.length} competencies`,
        confidence: 0.9,
        supporting_data: lowRatings.map(r => r.competencyName),
      });
    }
    
    // Analyze self vs manager rating gap
    for (const rating of r.competencyRatings) {
      if (rating.selfRating && rating.managerRating) {
        const gap = rating.selfRating - rating.managerRating;
        if (Math.abs(gap) >= 1.5) {
          insights.push({
            type: "trend",
            title: "Perception Gap",
            description: gap > 0 
              ? `Self-rating higher than manager in ${rating.competencyName}`
              : `Manager rates higher than self in ${rating.competencyName}`,
            confidence: 0.8,
            supporting_data: [
              `Self: ${rating.selfRating}`,
              `Manager: ${rating.managerRating}`,
            ],
          });
        }
      }
    }
    
    // Goal completion analysis
    const completedGoals = r.goals.filter(g => g.actualProgress >= 100);
    const goalCompletionRate = r.goals.length > 0 
      ? (completedGoals.length / r.goals.length) * 100 
      : 0;
    
    if (goalCompletionRate < 50) {
      insights.push({
        type: "recommendation",
        title: "Goal Setting Review Recommended",
        description: "Less than 50% goal completion rate - review goal setting process",
        confidence: 0.75,
        supporting_data: [
          `Completed: ${completedGoals.length}`,
          `Total: ${r.goals.length}`,
        ],
      });
    }
    
    // Save insights to review
    await db.collection(REVIEWS_COLLECTION).updateOne(
      { _id: new ObjectId(reviewId) },
      {
        $set: {
          aiInsights: insights,
          updatedAt: new Date(),
        },
      }
    );
    
    logger.info("Performance insights generated", {
      component: "performance-management",
      action: "generatePerformanceInsights",
    });
    
    return insights;
  } catch (_error) {
    logger.error("Failed to generate insights", { component: "performance-management" });
    return [];
  }
}

/**
 * Get team performance summary
 */
export async function getTeamPerformanceSummary(
  managerId: string,
  orgId: string,
  reviewCycleId: string
): Promise<{
  totalEmployees: number;
  completed: number;
  averageRating: number;
  ratingDistribution: Record<string, number>;
  topPerformers: { employeeId: string; name: string; rating: number }[];
  needsAttention: { employeeId: string; name: string; rating: number }[];
}> {
  try {
    const db = await getDatabase();
    
    const reviews = await db.collection(REVIEWS_COLLECTION)
      .find({
        orgId,
        managerId,
        reviewCycleId,
      })
      .toArray() as WithId<Document>[];
    
    const reviewRecords = reviews as unknown as PerformanceReview[];
    
    const completed = reviewRecords.filter(r => 
      r.status === ReviewStatus.FINALIZED || r.status === ReviewStatus.ACKNOWLEDGED
    );
    
    const ratings = completed
      .map(r => r.calibratedRating || r.overallRating || 0)
      .filter(r => r > 0);
    
    const averageRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;
    
    // Distribution
    const distribution: Record<string, number> = {
      exceptional: 0,
      exceeds: 0,
      meets: 0,
      needs: 0,
      unsatisfactory: 0,
    };
    
    for (const rating of ratings) {
      if (rating >= 4.5) distribution.exceptional++;
      else if (rating >= 3.5) distribution.exceeds++;
      else if (rating >= 2.5) distribution.meets++;
      else if (rating >= 1.5) distribution.needs++;
      else distribution.unsatisfactory++;
    }
    
    // Top performers
    const topPerformers = completed
      .filter(r => (r.calibratedRating || r.overallRating || 0) >= 4)
      .map(r => ({
        employeeId: r.employeeId,
        name: r.employeeName,
        rating: r.calibratedRating || r.overallRating || 0,
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
    
    // Needs attention
    const needsAttention = completed
      .filter(r => (r.calibratedRating || r.overallRating || 0) < 3)
      .map(r => ({
        employeeId: r.employeeId,
        name: r.employeeName,
        rating: r.calibratedRating || r.overallRating || 0,
      }))
      .sort((a, b) => a.rating - b.rating);
    
    return {
      totalEmployees: reviewRecords.length,
      completed: completed.length,
      averageRating,
      ratingDistribution: distribution,
      topPerformers,
      needsAttention,
    };
  } catch (_error) {
    logger.error("Failed to get team summary", { component: "performance-management" });
    return {
      totalEmployees: 0,
      completed: 0,
      averageRating: 0,
      ratingDistribution: {},
      topPerformers: [],
      needsAttention: [],
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  createGoal,
  updateGoalProgress,
  getEmployeeGoals,
  createReviewCycle,
  launchReviewCycle,
  submitSelfAssessment,
  submitManagerAssessment,
  finalizeReview,
  generatePerformanceInsights,
  getTeamPerformanceSummary,
};
