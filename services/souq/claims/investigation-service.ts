import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collection-names"; // TD-001
import { ClaimService, Claim, DecisionOutcome } from "./claim-service";
import { logger } from "@/lib/logger";
import { ObjectId as MongoObjectId, type Filter } from "mongodb";
import { getSouqRuleConfig, type SouqRuleConfig } from "@/services/souq/rules-config";

export interface InvestigationResult {
  claimId: string;
  recommendedOutcome: DecisionOutcome;
  confidence: "low" | "medium" | "high";
  reasoning: string[];
  requiresManualReview: boolean;
  fraudScore: number; // 0-100
  evidenceQuality: "poor" | "fair" | "good" | "excellent";
}

export interface FraudIndicators {
  multipleClaimsInShortPeriod: boolean;
  highValueClaim: boolean;
  inconsistentEvidence: boolean;
  sellerHistoryGood: boolean;
  buyerHistoryPoor: boolean;
  trackingShowsDelivered: boolean;
  lateReporting: boolean;
}

export class InvestigationService {
  private static async claimsCollection() {
    // Use ClaimService.ensureIndexes to guarantee index bootstrap before heavy queries
    return ClaimService.ensureIndexes();
  }

  /**
   * Investigate claim and recommend decision
   */
  static async investigateClaim(claimId: string, orgId: string): Promise<InvestigationResult> {
    if (!orgId) {
      throw new Error("orgId is required for investigation (tenant isolation)");
    }
    const ruleConfig = getSouqRuleConfig(orgId);
    const claim = await ClaimService.getClaim(claimId, orgId);
    if (!claim) throw new Error("Claim not found");

    // Collect investigation data
    const [trackingInfo, sellerHistory, buyerHistory] = await Promise.all([
      this.getTrackingInfo({ orderId: claim.orderId, orgId }),
      this.getSellerHistory({ sellerId: claim.sellerId, orgId }),
      this.getBuyerHistory({ buyerId: claim.buyerId, orgId }),
    ]);
    const fraudIndicators = await this.detectFraudIndicators({
      claim,
      orgId,
      trackingInfo,
      sellerHistory,
      buyerHistory,
      ruleConfig,
    });

    // Calculate fraud score
    const fraudScore = this.calculateFraudScore(fraudIndicators, claim);

    // Assess evidence quality
    const evidenceQuality = this.assessEvidenceQuality(claim);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      claim,
      fraudIndicators,
      trackingInfo,
      sellerHistory,
      buyerHistory,
      fraudScore,
      evidenceQuality,
      ruleConfig.fraudThreshold,
    );

    return recommendation;
  }

  /**
   * Detect fraud indicators
   */
  private static async detectFraudIndicators(params: {
    claim: Claim;
    orgId: string;
    trackingInfo: { status: string; deliveredAt?: Date };
    sellerHistory: {
      claimRate: number;
      rating: number;
      totalOrders: number;
      totalClaims: number;
    };
    buyerHistory: { claimCount: number; claimRate: number; totalOrders: number };
    ruleConfig: SouqRuleConfig;
  }): Promise<FraudIndicators> {
    const { claim, orgId, trackingInfo, sellerHistory, buyerHistory, ruleConfig } = params;
    const orgCandidates = MongoObjectId.isValid(orgId)
      ? [orgId, new MongoObjectId(orgId)]
      : [orgId];
    // Cast to Filter<Claim> to handle mixed string/ObjectId candidates
    const orgScope = {
      $or: [
        { orgId: { $in: orgCandidates } },
        { org_id: { $in: orgCandidates } },
      ],
    } as Filter<Claim>;

    // Check for multiple claims from same buyer in short period
    const claimsCollection = await this.claimsCollection();
    const recentClaims = await claimsCollection.countDocuments({
      buyerId: claim.buyerId,
      ...orgScope,
      filedAt: {
        $gte: new Date(
          Date.now() -
            ruleConfig.multipleClaimsPeriodDays * 24 * 60 * 60 * 1000,
        ),
      },
    } as Filter<Claim>);

    const trackingShowsDelivered =
      trackingInfo.status === "delivered" && trackingInfo.deliveredAt !== undefined;

    // Check reporting timeline
    const daysSinceDelivery = trackingInfo.deliveredAt
      ? (Date.now() - new Date(trackingInfo.deliveredAt).getTime()) /
        (1000 * 60 * 60 * 24)
      : 0;
    const lateReporting = daysSinceDelivery > ruleConfig.lateReportingDays;

    const sellerHistoryGood =
      sellerHistory.claimRate < 0.05 && sellerHistory.rating >= 4.0; // <5% claim rate, 4+ stars
    const buyerHistoryPoor =
      buyerHistory.claimCount > 10 && buyerHistory.claimRate > 0.15; // >10 claims, >15% rate

    return {
      multipleClaimsInShortPeriod: recentClaims >= 3,
      highValueClaim: claim.orderAmount > ruleConfig.highValueThreshold,
      inconsistentEvidence: this.checkEvidenceConsistency(claim),
      sellerHistoryGood,
      buyerHistoryPoor,
      trackingShowsDelivered:
        trackingShowsDelivered && claim.type === "item_not_received",
      lateReporting,
    };
  }

  /**
   * Calculate fraud score (0-100)
   */
  private static calculateFraudScore(
    indicators: FraudIndicators,
    claim: Claim,
  ): number {
    let score = 0;

    if (indicators.multipleClaimsInShortPeriod) score += 30;
    if (indicators.buyerHistoryPoor) score += 25;
    if (indicators.trackingShowsDelivered) score += 20;
    if (indicators.lateReporting) score += 15;
    if (indicators.inconsistentEvidence) score += 10;

    // Reduce score for positive indicators
    if (indicators.sellerHistoryGood) score -= 15;
    if (claim.evidence.length >= 3) score -= 10; // Good evidence provided

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Assess evidence quality
   */
  private static assessEvidenceQuality(
    claim: Claim,
  ): "poor" | "fair" | "good" | "excellent" {
    const evidenceCount = claim.evidence.length;
    const hasPhotos = claim.evidence.some((e) => e.type === "photo");
    const hasTracking = claim.evidence.some((e) => e.type === "tracking_info");
    const hasVideo = claim.evidence.some((e) => e.type === "video");

    if (evidenceCount === 0) return "poor";
    if (evidenceCount === 1 && !hasPhotos) return "poor";
    if (evidenceCount >= 2 && hasPhotos) return "fair";
    if (evidenceCount >= 3 && hasPhotos && (hasTracking || hasVideo))
      return "good";
    if (evidenceCount >= 4 && hasPhotos && hasVideo && hasTracking)
      return "excellent";

    return "fair";
  }

  /**
   * Check evidence consistency
   */
  private static checkEvidenceConsistency(claim: Claim): boolean {
    // Simple heuristic: if buyer claims item not received but provides photos of item, inconsistent
    if (claim.type === "item_not_received") {
      const hasProductPhotos = claim.evidence.some(
        (e) => e.type === "photo" && e.uploadedBy === "buyer",
      );
      return hasProductPhotos; // Inconsistent if photos provided for INR claim
    }

    // More sophisticated checks could be added
    return false;
  }

  /**
   * Get tracking information
   */
  private static async getTrackingInfo(params: {
    orderId: string;
    orgId: string;
  }): Promise<{ status: string; deliveredAt?: Date }> {
    const { orderId, orgId } = params;
    if (!orgId) {
      throw new Error("orgId is required to fetch tracking info (STRICT v4.1 tenant isolation)");
    }
    const db = await getDatabase();
    const orgCandidates = MongoObjectId.isValid(orgId)
      ? [orgId, new MongoObjectId(orgId)]
      : [orgId];
    const order = await db
      .collection(COLLECTIONS.SOUQ_ORDERS)
      .findOne({
        orderId,
        $or: [{ orgId: { $in: orgCandidates } }, { org_id: { $in: orgCandidates } }],
      });

    if (!order) return { status: "unknown" };

    return {
      status: order.deliveryStatus || "unknown",
      deliveredAt: order.deliveredAt,
    };
  }

  /**
   * Get seller history
   */
  private static async getSellerHistory(params: {
    sellerId: string;
    orgId: string;
  }): Promise<{
    claimRate: number;
    rating: number;
    totalOrders: number;
    totalClaims: number;
  }> {
    const { sellerId, orgId } = params;
    if (!orgId) {
      throw new Error("orgId is required to fetch seller history (STRICT v4.1 tenant isolation)");
    }
    const db = await getDatabase();

    // 🔐 STRICT v4.1: souq_sellers.orgId is ObjectId; orgId param may be string.
    // Use dual-type candidates to match both legacy string and ObjectId storage.
    const { ObjectId } = await import("mongodb");
    const orgCandidates = ObjectId.isValid(orgId)
      ? [orgId, new ObjectId(orgId)]
      : [orgId];
    const orgFilter = { $in: orgCandidates };

    const [totalOrders, totalClaims, seller] = await Promise.all([
      db.collection(COLLECTIONS.SOUQ_ORDERS).countDocuments({
        sellerId,
        $or: [{ orgId: orgFilter }, { org_id: orgFilter }],
      }),
      db.collection(COLLECTIONS.CLAIMS).countDocuments({
        sellerId,
        $or: [{ orgId: orgFilter }, { org_id: orgFilter }],
      }),
      db.collection(COLLECTIONS.SOUQ_SELLERS).findOne({
        sellerId,
        $or: [{ orgId: orgFilter }, { org_id: orgFilter }],
      }),
    ]);

    return {
      claimRate: totalOrders > 0 ? totalClaims / totalOrders : 0,
      rating: seller?.rating || 0,
      totalOrders,
      totalClaims,
    };
  }

  /**
   * Get buyer history
   */
  private static async getBuyerHistory(params: {
    buyerId: string;
    orgId: string;
  }): Promise<{ claimCount: number; claimRate: number; totalOrders: number }> {
    const { buyerId, orgId } = params;
    if (!orgId) {
      throw new Error("orgId is required to fetch buyer history (STRICT v4.1 tenant isolation)");
    }
    const db = await getDatabase();

    // 🔐 STRICT v4.1: souq_orders.orgId is ObjectId; orgId param may be string.
    // Use dual-type candidates to match both legacy string and ObjectId storage.
    const { ObjectId } = await import("mongodb");
    const orgCandidates = ObjectId.isValid(orgId)
      ? [orgId, new ObjectId(orgId)]
      : [orgId];
    const orgFilter = { $in: orgCandidates };

    const [totalOrders, claimCount] = await Promise.all([
      db.collection(COLLECTIONS.SOUQ_ORDERS).countDocuments({
        buyerId,
        $or: [{ orgId: orgFilter }, { org_id: orgFilter }],
      }),
      db.collection(COLLECTIONS.CLAIMS).countDocuments({
        buyerId,
        $or: [{ orgId: orgFilter }, { org_id: orgFilter }],
      }),
    ]);

    return {
      claimCount,
      claimRate: totalOrders > 0 ? claimCount / totalOrders : 0,
      totalOrders,
    };
  }

  /**
   * Generate recommendation based on investigation
   */
  private static generateRecommendation(
    claim: Claim,
    fraudIndicators: FraudIndicators,
    trackingInfo: { status: string; deliveredAt?: Date },
    sellerHistory: {
      claimRate: number;
      rating: number;
      totalOrders: number;
      totalClaims: number;
    },
    buyerHistory: {
      claimCount: number;
      claimRate: number;
      totalOrders: number;
    },
    fraudScore: number,
    evidenceQuality: "poor" | "fair" | "good" | "excellent",
    fraudThreshold: number,
  ): InvestigationResult {
    const reasoning: string[] = [];
    let recommendedOutcome: DecisionOutcome = "needs_more_info";
    let confidence: "low" | "medium" | "high" = "medium";
    let requiresManualReview = false;

    // High fraud score always requires manual review
    if (fraudScore >= fraudThreshold) {
      requiresManualReview = true;
      reasoning.push(
        `High fraud score (${fraudScore}/100) requires manual review`,
      );
    }

    // High value claims require manual review
    if (fraudIndicators.highValueClaim) {
      requiresManualReview = true;
      reasoning.push(
        `High value claim (${claim.orderAmount} SAR) requires manual review`,
      );
    }

    // Item Not Received logic
    if (claim.type === "item_not_received") {
      if (trackingInfo.status === "delivered" && trackingInfo.deliveredAt) {
        recommendedOutcome = "reject";
        confidence = "high";
        reasoning.push("Tracking shows item was delivered");
        reasoning.push(
          `Delivered on ${trackingInfo.deliveredAt.toLocaleDateString()}`,
        );
      } else if (
        trackingInfo.status === "lost" ||
        trackingInfo.status === "returned"
      ) {
        recommendedOutcome = "refund_full";
        confidence = "high";
        reasoning.push(`Tracking shows ${trackingInfo.status} status`);
      } else if (claim.sellerResponse?.proposedSolution === "refund_full") {
        recommendedOutcome = "refund_full";
        confidence = "high";
        reasoning.push("Seller agrees to full refund");
      } else {
        recommendedOutcome = "needs_more_info";
        confidence = "low";
        reasoning.push("Need carrier confirmation of delivery status");
        requiresManualReview = true;
      }
    }

    // Defective Item logic
    if (claim.type === "defective_item") {
      if (evidenceQuality === "poor") {
        recommendedOutcome = "needs_more_info";
        confidence = "low";
        reasoning.push(
          "Insufficient evidence of defect - photos/video required",
        );
      } else if (
        evidenceQuality === "excellent" &&
        !fraudIndicators.buyerHistoryPoor
      ) {
        if (claim.sellerResponse?.proposedSolution === "replacement") {
          recommendedOutcome = "replacement";
          confidence = "high";
          reasoning.push(
            "Seller offers replacement, strong evidence of defect",
          );
        } else {
          recommendedOutcome = "refund_full";
          confidence = "high";
          reasoning.push("Strong evidence of defect, buyer has good history");
        }
      } else {
        recommendedOutcome = "refund_partial";
        confidence = "medium";
        reasoning.push("Evidence suggests defect, partial refund appropriate");
        requiresManualReview = true;
      }
    }

    // Not As Described logic
    if (claim.type === "not_as_described") {
      if (evidenceQuality === "poor") {
        recommendedOutcome = "needs_more_info";
        confidence = "low";
        reasoning.push("Need photos comparing item to listing description");
      } else if (
        evidenceQuality === "good" ||
        (evidenceQuality === "excellent" && sellerHistory.claimRate > 0.1)
      ) {
        recommendedOutcome = "refund_full";
        confidence = "high";
        reasoning.push("Evidence shows significant discrepancy from listing");
        if (sellerHistory.claimRate > 0.1) {
          reasoning.push(
            `Seller has high claim rate (${(sellerHistory.claimRate * 100).toFixed(1)}%)`,
          );
        }
      } else {
        recommendedOutcome = "refund_partial";
        confidence = "medium";
        reasoning.push("Minor discrepancy from listing");
        requiresManualReview = true;
      }
    }

    // Counterfeit always requires manual review
    if (claim.type === "counterfeit") {
      requiresManualReview = true;
      recommendedOutcome = "needs_more_info";
      reasoning.push("Counterfeit claims require expert verification");
      reasoning.push("Escalating to legal/compliance team");
    }

    // Consider seller response
    if (claim.sellerResponse) {
      reasoning.push(
        `Seller proposed: ${claim.sellerResponse.proposedSolution}`,
      );

      if (
        claim.sellerResponse.proposedSolution === "refund_full" &&
        recommendedOutcome !== "reject"
      ) {
        recommendedOutcome = "refund_full";
        confidence = "high";
        reasoning.push("Seller agrees to full refund");
      }

      if (claim.sellerResponse.proposedSolution === "dispute") {
        requiresManualReview = true;
        reasoning.push("Seller disputes claim - manual review required");
      }
    }

    // Buyer/seller history context
    if (buyerHistory.claimRate > 0.2) {
      reasoning.push(
        `Buyer has high claim rate (${(buyerHistory.claimRate * 100).toFixed(1)}%)`,
      );
      confidence = "low";
      requiresManualReview = true;
    }

    if (sellerHistory.rating >= 4.5 && sellerHistory.claimRate < 0.02) {
      reasoning.push(
        `Seller has excellent history (${sellerHistory.rating.toFixed(1)}★, ${(sellerHistory.claimRate * 100).toFixed(1)}% claim rate)`,
      );
    }

    return {
      claimId: claim.claimId,
      recommendedOutcome,
      confidence,
      reasoning,
      requiresManualReview,
      fraudScore,
      evidenceQuality,
    };
  }

  /**
   * Auto-resolve eligible claims
   */
  static async autoResolveClaims(orgId: string): Promise<number> {
    if (!orgId) {
      throw new Error("orgId is required for auto-resolve (STRICT v4.1 tenant isolation)");
    }
    // Dual-type candidates to support legacy string/ObjectId orgId storage
    const orgCandidates: (string | MongoObjectId)[] = MongoObjectId.isValid(orgId)
      ? [orgId, new MongoObjectId(orgId)]
      : [orgId];
    const orgScope: Filter<Claim> = {
      $or: [
        { orgId: { $in: orgCandidates as unknown as string[] } },
        { org_id: { $in: orgCandidates as unknown as string[] } },
      ],
    };

    // Get claims eligible for auto-resolution
    // 🔐 LIMIT: Process in batches to prevent unbounded memory usage
    const BATCH_LIMIT = 200;
    const claimsCollection = await this.claimsCollection();
    const eligibleClaims = await claimsCollection
      .find({
        ...orgScope,
        status: "under_investigation",
        isAutoResolvable: true,
      })
      .sort({ filedAt: 1 })
      .limit(BATCH_LIMIT)
      .toArray();

    let resolvedCount = 0;

    for (const claim of eligibleClaims) {
      try {
        const orgId =
          (claim as { orgId?: string | MongoObjectId }).orgId?.toString?.() ??
          (claim as { org_id?: string | MongoObjectId }).org_id?.toString?.() ??
          "";
        if (!orgId) continue;
        const investigation = await this.investigateClaim(claim.claimId, orgId);

        // Only auto-resolve if high confidence and no manual review required
        if (
          investigation.confidence === "high" &&
          !investigation.requiresManualReview &&
          investigation.fraudScore < 50 &&
          investigation.recommendedOutcome !== "needs_more_info"
        ) {
          await ClaimService.makeDecision({
            claimId: claim.claimId,
            decidedBy: "system",
            outcome: investigation.recommendedOutcome,
            reason: `Auto-resolved: ${investigation.reasoning.join("; ")}`,
            refundAmount:
              investigation.recommendedOutcome === "refund_full"
                ? claim.orderAmount
                : investigation.recommendedOutcome === "refund_partial"
                  ? claim.orderAmount * 0.5
                  : undefined,
            orgId,
          });

          resolvedCount++;
        }
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error(`Failed to auto-resolve claim ${claim.claimId}:`, error);
      }
    }

    return resolvedCount;
  }

  /**
   * Get claims requiring manual review
   */
  static async getClaimsRequiringReview(orgId: string): Promise<
    Array<Claim & { investigation: InvestigationResult }>
  > {
    if (!orgId) {
      throw new Error("orgId is required to fetch claims for review (STRICT v4.1 tenant isolation)");
    }
    // Dual-type candidates to support legacy string/ObjectId orgId storage
    const orgCandidates: (string | MongoObjectId)[] = MongoObjectId.isValid(orgId)
      ? [orgId, new MongoObjectId(orgId)]
      : [orgId];
    const orgScope: Filter<Claim> = {
      $or: [
        { orgId: { $in: orgCandidates as unknown as string[] } },
        { org_id: { $in: orgCandidates as unknown as string[] } },
      ],
    };
    // 🔐 LIMIT: Cap results to prevent unbounded memory usage for large tenants
    const REVIEW_LIMIT = 100;
    const claimsCollection = await this.claimsCollection();
    const claims = await claimsCollection
      .find({
        ...orgScope,
        status: { $in: ["under_investigation", "escalated"] },
      })
      .sort({ priority: -1, filedAt: 1 })
      .limit(REVIEW_LIMIT)
      .toArray();

    const claimsWithInvestigation = await Promise.all(
      claims.map(async (claim) => {
        const orgId =
          (claim as { orgId?: string | MongoObjectId }).orgId?.toString?.() ??
          (claim as { org_id?: string | MongoObjectId }).org_id?.toString?.() ??
          "";
        if (!orgId) return null;
        const investigation = await this.investigateClaim(claim.claimId, orgId);
        return { ...claim, investigation };
      }),
    );

    const hydrated = claimsWithInvestigation.filter(Boolean) as Array<
      Claim & { investigation: InvestigationResult }
    >;

    return hydrated.filter((c) => c.investigation.requiresManualReview);
  }

  /**
   * Validate evidence upload
   */
  static validateEvidence(file: { size: number; type: string }): {
    valid: boolean;
    error?: string;
  } {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "application/pdf",
    ];

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: "File size exceeds 10MB limit" };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: "Invalid file type. Allowed: JPEG, PNG, WebP, MP4, MOV, PDF",
      };
    }

    return { valid: true };
  }
}
