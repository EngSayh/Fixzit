/**
 * @description Admin interface for reviewing A-to-Z claims queue.
 * Provides claim dashboard with filtering, sorting, and claim prioritization.
 * Returns claims pending decision with evidence and timeline.
 * @route GET /api/souq/claims/admin/review
 * @access Private - Admin only
 * @query {string} status - Filter: pending-decision, under-investigation, under-appeal
 * @query {string} priority - Filter by priority: high, medium, low
 * @query {string} sort - Sort order: newest, oldest, amount
 * @query {number} page - Page number
 * @query {number} limit - Items per page
 * @returns {Object} claims: array with evidence summary, pagination, stats
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not admin
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDb } from "@/lib/mongo";
import { logger } from "@/lib/logger";
import { SouqClaim } from "@/server/models/souq/Claim";
import { User } from "@/server/models/User";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

type ClaimLean = {
  buyerEvidence?: unknown[];
  sellerEvidence?: unknown[];
  buyerMetadata?: { totalClaims?: number };
  requestedAmount?: unknown;
  claimAmount?: unknown;
  orderAmount?: unknown;
  createdAt?: Date | string;
  orderDate?: Date | string;
  buyerDescription?: string;
  description?: string;
  sellerRespondedAt?: unknown;
  sellerResponse?: unknown;
  priority?: string;
  status?: string;
  claimId?: string;
  orderNumber?: string;
  orderId?: string;
  buyerId?: { _id?: unknown; name?: string; email?: string } | string;
  sellerId?: { _id?: unknown; name?: string; email?: string } | string;
  buyerName?: string;
  sellerName?: string;
  claimNumber?: string;
  type?: string;
  claimType?: string;
  _id?: { toString?: () => string };
  updatedAt?: Date | string;
} & Record<string, unknown>;

const STATUS_MAP: Record<string, string[]> = {
  // UI-friendly filters mapped to persisted statuses
  "pending-decision": [
    "pending_investigation",
    "pending_seller_response",
    "under_review",
  ],
  "under-investigation": ["pending_investigation", "under_review"],
  "under-appeal": ["escalated"],
};

const normalizeAmount = (amount: unknown): number => {
  if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractEvidenceCounts = (claim: ClaimLean) => {
  const buyerEvidenceCount = Array.isArray(claim.buyerEvidence)
    ? claim.buyerEvidence.length
    : 0;
  const sellerEvidenceCount = Array.isArray(claim.sellerEvidence)
    ? claim.sellerEvidence.length
    : 0;
  const totalEvidence = buyerEvidenceCount + sellerEvidenceCount;
  return { buyerEvidenceCount, sellerEvidenceCount, totalEvidence };
};

/**
 * Fraud Detection Scoring Engine
 *
 * Analyzes claim patterns and calculates fraud risk score (0-100)
 */
function calculateFraudScore(claim: ClaimLean): {
  score: number;
  riskLevel: "low" | "medium" | "high";
  flags: string[];
} {
  let score = 0;
  const flags: string[] = [];

  // 1. Check buyer history (if available)
  const buyerClaimCount = claim.buyerMetadata?.totalClaims || 0;
  if (buyerClaimCount > 5) {
    score += 20;
    flags.push("high-claim-frequency");
  } else if (buyerClaimCount > 2) {
    score += 10;
    flags.push("moderate-claim-frequency");
  }

  // 2. Check claim amount relative to order (fallback to requested amount when order total is unknown)
  const claimAmount = normalizeAmount(
    claim.requestedAmount ?? claim.claimAmount,
  );
  const orderAmount = normalizeAmount(
    claim.orderAmount ?? claim.requestedAmount ?? claimAmount,
  );
  const claimToOrderRatio = orderAmount > 0 ? claimAmount / orderAmount : 1;
  if (claimToOrderRatio > 0.9) {
    score += 15;
    flags.push("high-claim-amount");
  }

  // 3. Check evidence quality (use buyer + seller evidence arrays from the schema)
  const { buyerEvidenceCount, sellerEvidenceCount, totalEvidence } =
    extractEvidenceCounts(claim);
  if (totalEvidence === 0) {
    score += 25;
    flags.push("no-evidence");
  } else if (totalEvidence < 2) {
    score += 10;
    flags.push("insufficient-evidence");
  }

  // 4. Check time since order (only when order date is available)
  const filedAt = claim.createdAt ? new Date(claim.createdAt) : null;
  const orderDate = claim.orderDate ? new Date(claim.orderDate) : null;
  const daysSinceOrder =
    filedAt && orderDate
      ? Math.floor(
          (filedAt.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;
  if (daysSinceOrder > 60) {
    score += 15;
    flags.push("late-filing");
  }

  // 5. Check seller defense strength (e.g., more seller evidence than buyer evidence)
  if (sellerEvidenceCount > buyerEvidenceCount) {
    score += 10;
    flags.push("strong-seller-defense");
  }

  // 6. Pattern matching for common fraud indicators
  const description = (
    claim.buyerDescription ||
    claim.description ||
    ""
  ).toLowerCase();
  const fraudKeywords = [
    "never received",
    "never arrived",
    "empty box",
    "wrong item",
    "damaged",
  ];
  const matchedKeywords = fraudKeywords.filter((keyword) =>
    description.includes(keyword),
  );
  if (matchedKeywords.length > 2) {
    score += 10;
    flags.push("generic-description");
  }

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" = "low";
  if (score >= 70) {
    riskLevel = "high";
  } else if (score >= 40) {
    riskLevel = "medium";
  }

  return { score: Math.min(100, score), riskLevel, flags };
}

/**
 * AI-based Recommendation Engine
 *
 * Provides recommended action based on claim analysis
 */
function generateRecommendation(
  claim: ClaimLean,
  fraudAnalysis: ReturnType<typeof calculateFraudScore>,
): {
  action: "approve-full" | "approve-partial" | "reject" | "pending-review";
  confidence: number;
  reasoning: string;
} {
  const { score } = fraudAnalysis;

  // High fraud risk - recommend rejection
  if (score >= 70) {
    return {
      action: "reject",
      confidence: 85,
      reasoning: "High fraud risk detected. Multiple red flags identified.",
    };
  }

  // Medium fraud risk - require manual review
  if (score >= 40) {
    return {
      action: "pending-review",
      confidence: 60,
      reasoning: "Medium risk. Manual review recommended before decision.",
    };
  }

  // Low fraud risk - check evidence quality
  const { totalEvidence, sellerEvidenceCount } = extractEvidenceCounts(claim);
  const hasSellerResponse =
    Boolean(claim.sellerRespondedAt || claim.sellerResponse) ||
    sellerEvidenceCount > 0;
  const evidenceCount = totalEvidence;

  if (evidenceCount >= 3 && !hasSellerResponse) {
    return {
      action: "approve-full",
      confidence: 90,
      reasoning: "Strong evidence provided and no seller defense.",
    };
  }

  if (evidenceCount >= 2 && !hasSellerResponse) {
    return {
      action: "approve-partial",
      confidence: 75,
      reasoning: "Good evidence but consider partial refund.",
    };
  }

  if (hasSellerResponse && evidenceCount < 2) {
    return {
      action: "reject",
      confidence: 70,
      reasoning: "Insufficient buyer evidence vs strong seller defense.",
    };
  }

  // Default to manual review
  return {
    action: "pending-review",
    confidence: 50,
    reasoning: "Requires manual assessment of evidence quality.",
  };
}

/**
 * GET /api/souq/claims/admin/review
 *
 * Enhanced admin endpoint with fraud detection and AI recommendations
 *
 * Query params:
 * - status: filter by status
 * - priority: filter by priority (high/medium/low)
 * - riskLevel: filter by fraud risk (high/medium/low)
 * - search: search by claim number or order ID
 * - page: page number
 * - limit: items per page
 *
 * @security Requires admin role
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for claims review listing
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-claims:admin-review",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const userRole = session.user.role;
    const isSuperAdmin = session.user.isSuperAdmin;

    // 🔒 SECURITY FIX: Include CORPORATE_ADMIN per 14-role matrix
    if (!isSuperAdmin && !["ADMIN", "CORPORATE_ADMIN"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status") || "pending-decision";
    const priority = searchParams.get("priority");
    const riskLevel = searchParams.get("riskLevel");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    await connectDb();

    // Build query with $and for combining multiple $or filters safely
    const andConditions: Record<string, unknown>[] = [];

    // 🔒 SECURITY FIX: CORPORATE_ADMIN can only see claims involving their org's users
    // Platform admins (isSuperAdmin or ADMIN role) see all claims
    const isPlatformAdmin = isSuperAdmin || userRole === "ADMIN";
    
    if (!isPlatformAdmin && userRole === "CORPORATE_ADMIN") {
      // Get user IDs belonging to this corporate admin's org
      const orgId = session.user.orgId;
      if (!orgId) {
        return NextResponse.json(
          { error: "Organization context required for CORPORATE_ADMIN" },
          { status: 403 },
        );
      }
      
      const orgUserIds = await User.find({ orgId }, { _id: 1 }).lean();
      const userIdStrings = orgUserIds.map((u) => String(u._id));
      
      // Ensure org-scoped queries for tenant isolation and index use
      andConditions.push({ orgId });

      // Only show claims where buyer OR seller belongs to this org
      andConditions.push({
        $or: [
          { buyerId: { $in: userIdStrings } },
          { sellerId: { $in: userIdStrings } },
        ],
      });
    }

    if (statusParam && statusParam !== "all") {
      const mapped = STATUS_MAP[statusParam];
      andConditions.push({ status: mapped ? { $in: mapped } : statusParam });
    }

    if (priority && priority !== "all") {
      andConditions.push({ priority });
    }

    if (search) {
      // Escape special regex characters to prevent injection
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andConditions.push({
        $or: [
          { claimId: { $regex: escapedSearch, $options: "i" } },
          { orderNumber: { $regex: escapedSearch, $options: "i" } },
          { orderId: { $regex: escapedSearch, $options: "i" } },
        ],
      });
    }

    // Combine all conditions with $and, or use empty filter if no conditions
    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    // Fetch claims with pagination
    const skip = (page - 1) * limit;
    const claims: ClaimLean[] = await SouqClaim.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .lean();

    const totalClaims = await SouqClaim.countDocuments(query);

    // Enrich claims with fraud detection and recommendations
    const enrichedClaims = claims.map((claim: ClaimLean) => {
      const claimAmount = normalizeAmount(
        claim.requestedAmount ?? claim.orderAmount ?? claim.claimAmount ?? 0,
      );
      // Calculate fraud score
      const fraudAnalysis = calculateFraudScore(claim);

      // Generate recommendation
      const recommendation = generateRecommendation(claim, fraudAnalysis);

      // Determine priority based on fraud score and claim amount
      const evidenceCounts = extractEvidenceCounts(claim);

      let priority: "high" | "medium" | "low" = "medium";
      if (fraudAnalysis.score >= 70 || claimAmount > 5000) {
        priority = "high";
      } else if (fraudAnalysis.score < 40 && claimAmount < 500) {
        priority = "low";
      }

      const claimNumber =
        claim.claimNumber || claim.claimId || claim.orderNumber;

      const claimType = claim.claimType || claim.type;

      return {
        claimId: claim._id?.toString?.() ?? claim.claimId,
        claimNumber,
        orderId: claim.orderId,
        claimType,
        status: claim.status,
        claimAmount,
        buyerName:
          (typeof claim.buyerId === "object" && claim.buyerId?.name) ||
          claim.buyerName ||
          "Unknown",
        sellerName:
          (typeof claim.sellerId === "object" && claim.sellerId?.name) ||
          claim.sellerName ||
          "Unknown",

        // Fraud detection data
        fraudScore: fraudAnalysis.score,
        riskLevel: fraudAnalysis.riskLevel,
        fraudFlags: fraudAnalysis.flags,

        // AI recommendation
        recommendedAction: recommendation.action,
        confidence: recommendation.confidence,
        reasoning: recommendation.reasoning,

        // Metadata
        evidenceCount: evidenceCounts.totalEvidence,
        priority,
        createdAt: claim.createdAt,
        updatedAt: claim.updatedAt,
      };
    });

    // Apply risk level filter after enrichment if specified
    let filteredClaims = enrichedClaims;
    if (riskLevel && riskLevel !== "all") {
      filteredClaims = enrichedClaims.filter((c) => c.riskLevel === riskLevel);
    }

    // Calculate statistics
    const pendingStatuses = STATUS_MAP["pending-decision"];
    const stats = {
      total: totalClaims,
      pendingReview: await SouqClaim.countDocuments(
        pendingStatuses ? { status: { $in: pendingStatuses } } : {},
      ),
      highPriority: filteredClaims.filter((c) => c.priority === "high").length,
      highRisk: filteredClaims.filter((c) => c.fraudScore >= 70).length,
      totalAmount: filteredClaims.reduce(
        (sum, c) => sum + (c.claimAmount || 0),
        0,
      ),
    };

    const totalForPagination =
      riskLevel && riskLevel !== "all" ? filteredClaims.length : totalClaims;
    const totalPages =
      totalForPagination > 0 ? Math.ceil(totalForPagination / limit) : 1;

    return NextResponse.json({
      success: true,
      claims: filteredClaims,
      pagination: {
        page,
        limit,
        total: totalForPagination,
        totalPages,
      },
      stats,
    });
  } catch (error) {
    logger.error("Admin claims review endpoint error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
