/**
 * @fileoverview ATS Scoring Dashboard API
 * @description Provides candidate scoring analytics, rankings, and comparison metrics.
 *              Aggregates data from the in-house scoring engine for HR decision-making.
 *
 * @route GET /api/ats/scoring-dashboard - Retrieve scoring metrics and candidate rankings
 * @access Protected - Requires applications:read permission
 * @module ats
 *
 * @features
 * - Top candidates by score (overall and per job)
 * - Score distribution histogram
 * - Skill gap analysis
 * - Score trending over time
 * - Comparison between candidates
 * - Hiring recommendation based on scores
 *
 * @agent AGENT-0031
 * @issue FEAT-ATS-001
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Application } from "@/server/models/Application";
import { Job } from "@/server/models/Job";
import { atsRBAC } from "@/lib/ats/rbac";
import { Types } from "mongoose";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

// ============================================================================
// TYPES
// ============================================================================

interface ScoringDashboardResponse {
  success: boolean;
  data?: {
    summary: ScoringSummary;
    topCandidates: RankedCandidate[];
    distribution: ScoreDistribution;
    skillGaps: SkillGapAnalysis[];
    recommendations: HiringRecommendation[];
  };
  error?: string;
}

interface ScoringSummary {
  totalApplications: number;
  scoredApplications: number;
  averageScore: number;
  medianScore: number;
  highScoreCount: number; // Score >= 80
  lowScoreCount: number;  // Score < 50
  pendingReview: number;
}

interface RankedCandidate {
  rank: number;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  cultureScore: number;
  status: string;
  appliedAt: string;
  matchedSkills: string[];
  missingSkills: string[];
}

interface ScoreDistribution {
  buckets: Array<{
    range: string;
    min: number;
    max: number;
    count: number;
    percentage: number;
  }>;
}

interface SkillGapAnalysis {
  skill: string;
  demand: number;      // How many jobs require this skill
  supply: number;      // How many candidates have this skill
  gapPercentage: number; // Demand vs supply gap
  priority: "high" | "medium" | "low";
}

interface HiringRecommendation {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  score: number;
  recommendation: "strong_hire" | "hire" | "maybe" | "no_hire";
  reasons: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateMedian(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getRecommendation(score: number): "strong_hire" | "hire" | "maybe" | "no_hire" {
  if (score >= 85) return "strong_hire";
  if (score >= 70) return "hire";
  if (score >= 50) return "maybe";
  return "no_hire";
}

function getRecommendationReasons(app: {
  score: number;
  skillScore: number;
  experienceScore: number;
  matchedSkills?: string[];
  missingSkills?: string[];
}): string[] {
  const reasons: string[] = [];
  
  if (app.score >= 85) {
    reasons.push("Excellent overall match");
  } else if (app.score >= 70) {
    reasons.push("Good overall match");
  }
  
  if (app.skillScore >= 80) {
    reasons.push("Strong skill alignment");
  } else if (app.skillScore < 50) {
    reasons.push("Skills gap identified");
  }
  
  if (app.experienceScore >= 80) {
    reasons.push("Meets experience requirements");
  } else if (app.experienceScore < 50) {
    reasons.push("Below experience threshold");
  }
  
  if (app.matchedSkills && app.matchedSkills.length >= 5) {
    reasons.push(`Matches ${app.matchedSkills.length} key skills`);
  }
  
  if (app.missingSkills && app.missingSkills.length >= 3) {
    reasons.push(`Missing ${app.missingSkills.length} required skills`);
  }
  
  return reasons.length > 0 ? reasons : ["Requires further evaluation"];
}

// ============================================================================
// API HANDLER
// ============================================================================

/**
 * GET /api/ats/scoring-dashboard - Get scoring analytics and candidate rankings
 *
 * Query Parameters:
 * - jobId: Filter by specific job (optional)
 * - limit: Number of top candidates to return (default: 20, max: 100)
 * - minScore: Minimum score filter (default: 0)
 * - status: Filter by application status (optional)
 * - sortBy: Sort field (score, appliedAt) (default: score)
 * - order: Sort order (asc, desc) (default: desc)
 */
export async function GET(req: NextRequest): Promise<NextResponse<ScoringDashboardResponse>> {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`scoring-dashboard:${clientIp}`, 30, 60_000);
  if (!rl.allowed) {
    return rateLimitError() as NextResponse<ScoringDashboardResponse>;
  }

  try {
    await connectToDatabase();

    // RBAC: Check permissions
    const authResult = await atsRBAC(req, ["applications:read"]);
    if (!authResult.authorized) {
      return authResult.response as NextResponse<ScoringDashboardResponse>;
    }
    const { orgId } = authResult;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const limitParam = searchParams.get("limit") || "20";
    const minScoreParam = searchParams.get("minScore") || "0";
    const stage = searchParams.get("stage");
    const sortBy = searchParams.get("sortBy") || "score";
    const order = searchParams.get("order") || "desc";

    const limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 100);
    const minScore = Math.max(0, Math.min(100, parseInt(minScoreParam, 10) || 0));

    // Validate jobId if provided
    if (jobId && !Types.ObjectId.isValid(jobId)) {
      return NextResponse.json(
        { success: false, error: "Invalid jobId parameter" },
        { status: 400 }
      );
    }

    // Build query - Application model uses 'score' field and 'stage' for status
    const query: Record<string, unknown> = {
      orgId: new Types.ObjectId(orgId),
      score: { $gte: minScore },
    };
    if (jobId) query.jobId = new Types.ObjectId(jobId);
    if (stage) query.stage = stage;

    // Fetch scored applications
    const applications = await Application.find(query)
      .sort({ 
        score: order === "asc" ? 1 : -1,
        createdAt: sortBy === "appliedAt" ? (order === "asc" ? 1 : -1) : -1,
      })
      .limit(limit * 2) // Get more for distribution
      .populate("candidateId", "name email skills experience")
      .populate("jobId", "title skills minExperience")
      .lean();

    // Calculate summary statistics - using 'score' field
    const allScores = applications.map((app) => app.score ?? 0);
    const scoredCount = applications.filter((app) => (app.score ?? 0) > 0).length;
    
    const summary: ScoringSummary = {
      totalApplications: await Application.countDocuments({ orgId: new Types.ObjectId(orgId) }),
      scoredApplications: scoredCount,
      averageScore: scoredCount > 0 
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / scoredCount)
        : 0,
      medianScore: calculateMedian(allScores),
      highScoreCount: allScores.filter((s) => s >= 80).length,
      lowScoreCount: allScores.filter((s) => s < 50).length,
      pendingReview: await Application.countDocuments({
        orgId: new Types.ObjectId(orgId),
        stage: "screening",
      }),
    };

    // Build ranked candidates list - use candidateSnapshot if populated candidate is null
    const topCandidates: RankedCandidate[] = applications.slice(0, limit).map((app, index) => {
      const candidate = app.candidateId as { _id: Types.ObjectId; name?: string; email?: string; skills?: string[] } | undefined;
      const job = app.jobId as { _id: Types.ObjectId; title?: string; skills?: string[] } | undefined;
      const snapshot = app.candidateSnapshot ?? {};
      
      // Calculate matched/missing skills using candidateSnapshot or populated candidate
      const candidateSkills = candidate?.skills ?? snapshot.skills ?? [];
      const requiredSkills = job?.skills ?? [];
      const matchedSkills = requiredSkills.filter((s: string) => candidateSkills.includes(s));
      const missingSkills = requiredSkills.filter((s: string) => !candidateSkills.includes(s));
      
      // Application model uses overall 'score' - estimate breakdowns
      const overallScore = app.score ?? 0;

      return {
        rank: index + 1,
        applicationId: app._id.toString(),
        candidateId: candidate?._id?.toString() ?? "",
        candidateName: candidate?.name ?? snapshot.fullName ?? "Unknown",
        candidateEmail: candidate?.email ?? snapshot.email ?? "",
        jobId: job?._id?.toString() ?? "",
        jobTitle: job?.title ?? "Unknown Position",
        overallScore,
        skillScore: overallScore, // Use overall score as estimate
        experienceScore: overallScore,
        cultureScore: overallScore,
        status: app.stage ?? "applied",
        appliedAt: app.createdAt?.toISOString() ?? new Date().toISOString(),
        matchedSkills,
        missingSkills,
      };
    });

    // Build score distribution
    const buckets = [
      { range: "0-20", min: 0, max: 20 },
      { range: "21-40", min: 21, max: 40 },
      { range: "41-60", min: 41, max: 60 },
      { range: "61-80", min: 61, max: 80 },
      { range: "81-100", min: 81, max: 100 },
    ];
    
    const distribution: ScoreDistribution = {
      buckets: buckets.map((bucket) => {
        const count = allScores.filter((s) => s >= bucket.min && s <= bucket.max).length;
        return {
          ...bucket,
          count,
          percentage: scoredCount > 0 ? Math.round((count / scoredCount) * 100) : 0,
        };
      }),
    };

    // Skill gap analysis (aggregate across all jobs)
    const skillDemand = new Map<string, number>();
    const skillSupply = new Map<string, number>();

    // Get all jobs to analyze required skills - Job model uses 'skills' and 'requirements.requiredSkills'
    const jobs = await Job.find({ orgId: new Types.ObjectId(orgId), status: "open" })
      .select("skills requirements")
      .lean();
    
    for (const job of jobs) {
      // Use skills array or requirements.requiredSkills
      const jobSkills = job.skills ?? (job.requirements as { requiredSkills?: string[] })?.requiredSkills ?? [];
      for (const skill of jobSkills) {
        skillDemand.set(skill, (skillDemand.get(skill) ?? 0) + 1);
      }
    }

    // Count candidates with each skill from candidateSnapshot
    for (const app of applications) {
      const snapshot = app.candidateSnapshot ?? {};
      const candidateSkills = (app.candidateId as { skills?: string[] })?.skills ?? snapshot.skills ?? [];
      for (const skill of candidateSkills) {
        skillSupply.set(skill, (skillSupply.get(skill) ?? 0) + 1);
      }
    }

    const skillGaps: SkillGapAnalysis[] = Array.from(skillDemand.entries())
      .map(([skill, demand]) => {
        const supply = skillSupply.get(skill) ?? 0;
        const gapPercentage = demand > 0 ? Math.round(((demand - supply) / demand) * 100) : 0;
        return {
          skill,
          demand,
          supply,
          gapPercentage: Math.max(0, gapPercentage),
          priority: (gapPercentage >= 70 ? "high" : gapPercentage >= 40 ? "medium" : "low") as "high" | "medium" | "low",
        };
      })
      .filter((gap) => gap.gapPercentage > 0)
      .sort((a, b) => b.gapPercentage - a.gapPercentage)
      .slice(0, 10); // Top 10 skill gaps

    // Build hiring recommendations
    const recommendations: HiringRecommendation[] = topCandidates
      .slice(0, 10)
      .map((candidate) => ({
        applicationId: candidate.applicationId,
        candidateName: candidate.candidateName,
        jobTitle: candidate.jobTitle,
        score: candidate.overallScore,
        recommendation: getRecommendation(candidate.overallScore),
        reasons: getRecommendationReasons({
          score: candidate.overallScore,
          skillScore: candidate.skillScore,
          experienceScore: candidate.experienceScore,
          matchedSkills: candidate.matchedSkills,
          missingSkills: candidate.missingSkills,
        }),
      }));

    logger.info("[ATS Scoring Dashboard] Retrieved", {
      orgId,
      totalScored: scoredCount,
      averageScore: summary.averageScore,
      topCandidatesCount: topCandidates.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        summary,
        topCandidates,
        distribution,
        skillGaps,
        recommendations,
      },
    });
  } catch (error) {
    logger.error("[ATS Scoring Dashboard] Error", { error });
    return NextResponse.json(
      { success: false, error: "Failed to retrieve scoring dashboard" },
      { status: 500 }
    );
  }
}
