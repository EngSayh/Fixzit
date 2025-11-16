// @ts-nocheck
import { getDatabase } from '@/lib/mongodb-unified';
import { ClaimService, Claim, ClaimType, DecisionOutcome } from './claim-service';

export interface InvestigationResult {
  claimId: string;
  recommendedOutcome: DecisionOutcome;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string[];
  requiresManualReview: boolean;
  fraudScore: number; // 0-100
  evidenceQuality: 'poor' | 'fair' | 'good' | 'excellent';
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
  private static FRAUD_THRESHOLD = 70; // Score above 70 requires manual review
  private static HIGH_VALUE_THRESHOLD = 500; // SAR
  private static MULTIPLE_CLAIMS_PERIOD = 30; // days
  private static LATE_REPORTING_DAYS = 14; // days after delivery

  /**
   * Investigate claim and recommend decision
   */
  static async investigateClaim(claimId: string): Promise<InvestigationResult> {
    const claim = await ClaimService.getClaim(claimId);
    if (!claim) throw new Error('Claim not found');

    // Collect investigation data
    const [fraudIndicators, trackingInfo, sellerHistory, buyerHistory] = await Promise.all([
      this.detectFraudIndicators(claim),
      this.getTrackingInfo(claim.orderId),
      this.getSellerHistory(claim.sellerId),
      this.getBuyerHistory(claim.buyerId),
    ]);

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
      evidenceQuality
    );

    return recommendation;
  }

  /**
   * Detect fraud indicators
   */
  private static async detectFraudIndicators(claim: Claim): Promise<FraudIndicators> {
    const db = await getDatabase();

    // Check for multiple claims from same buyer in short period
    const recentClaims = await db
      .collection('souq_claims')
      .countDocuments({
        buyerId: claim.buyerId,
        filedAt: {
          $gte: new Date(Date.now() - this.MULTIPLE_CLAIMS_PERIOD * 24 * 60 * 60 * 1000),
        },
      });

    // Check order delivery status
    const order = await db.collection('souq_orders').findOne({ orderId: claim.orderId });
    const trackingShowsDelivered =
      order?.deliveryStatus === 'delivered' && order?.deliveredAt !== undefined;

    // Check reporting timeline
    const daysSinceDelivery = order?.deliveredAt
      ? (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    const lateReporting = daysSinceDelivery > this.LATE_REPORTING_DAYS;

    // Check seller history
    const sellerStats = await this.getSellerHistory(claim.sellerId);
    const sellerHistoryGood =
      sellerStats.claimRate < 0.05 && sellerStats.rating >= 4.0; // <5% claim rate, 4+ stars

    // Check buyer history
    const buyerStats = await this.getBuyerHistory(claim.buyerId);
    const buyerHistoryPoor =
      buyerStats.claimCount > 10 && buyerStats.claimRate > 0.15; // >10 claims, >15% rate

    return {
      multipleClaimsInShortPeriod: recentClaims >= 3,
      highValueClaim: claim.orderAmount > this.HIGH_VALUE_THRESHOLD,
      inconsistentEvidence: this.checkEvidenceConsistency(claim),
      sellerHistoryGood,
      buyerHistoryPoor,
      trackingShowsDelivered: trackingShowsDelivered && claim.type === 'item_not_received',
      lateReporting,
    };
  }

  /**
   * Calculate fraud score (0-100)
   */
  private static calculateFraudScore(
    indicators: FraudIndicators,
    claim: Claim
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
  private static assessEvidenceQuality(claim: Claim): 'poor' | 'fair' | 'good' | 'excellent' {
    const evidenceCount = claim.evidence.length;
    const hasPhotos = claim.evidence.some((e) => e.type === 'photo');
    const hasTracking = claim.evidence.some((e) => e.type === 'tracking_info');
    const hasVideo = claim.evidence.some((e) => e.type === 'video');

    if (evidenceCount === 0) return 'poor';
    if (evidenceCount === 1 && !hasPhotos) return 'poor';
    if (evidenceCount >= 2 && hasPhotos) return 'fair';
    if (evidenceCount >= 3 && hasPhotos && (hasTracking || hasVideo)) return 'good';
    if (evidenceCount >= 4 && hasPhotos && hasVideo && hasTracking) return 'excellent';

    return 'fair';
  }

  /**
   * Check evidence consistency
   */
  private static checkEvidenceConsistency(claim: Claim): boolean {
    // Simple heuristic: if buyer claims item not received but provides photos of item, inconsistent
    if (claim.type === 'item_not_received') {
      const hasProductPhotos = claim.evidence.some(
        (e) => e.type === 'photo' && e.uploadedBy === 'buyer'
      );
      return hasProductPhotos; // Inconsistent if photos provided for INR claim
    }

    // More sophisticated checks could be added
    return false;
  }

  /**
   * Get tracking information
   */
  private static async getTrackingInfo(
    orderId: string
  ): Promise<{ status: string; deliveredAt?: Date }> {
    const db = await getDatabase();
    const order = await db.collection('souq_orders').findOne({ orderId });

    if (!order) return { status: 'unknown' };

    return {
      status: order.deliveryStatus || 'unknown',
      deliveredAt: order.deliveredAt,
    };
  }

  /**
   * Get seller history
   */
  private static async getSellerHistory(
    sellerId: string
  ): Promise<{ claimRate: number; rating: number; totalOrders: number; totalClaims: number }> {
    const db = await getDatabase();

    const [totalOrders, totalClaims, seller] = await Promise.all([
      db.collection('souq_orders').countDocuments({ sellerId }),
      db.collection('souq_claims').countDocuments({ sellerId }),
      db.collection('souq_sellers').findOne({ sellerId }),
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
  private static async getBuyerHistory(
    buyerId: string
  ): Promise<{ claimCount: number; claimRate: number; totalOrders: number }> {
    const db = await getDatabase();

    const [totalOrders, claimCount] = await Promise.all([
      db.collection('souq_orders').countDocuments({ buyerId }),
      db.collection('souq_claims').countDocuments({ buyerId }),
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
    sellerHistory: { claimRate: number; rating: number; totalOrders: number; totalClaims: number },
    buyerHistory: { claimCount: number; claimRate: number; totalOrders: number },
    fraudScore: number,
    evidenceQuality: 'poor' | 'fair' | 'good' | 'excellent'
  ): InvestigationResult {
    const reasoning: string[] = [];
    let recommendedOutcome: DecisionOutcome = 'needs_more_info';
    let confidence: 'low' | 'medium' | 'high' = 'medium';
    let requiresManualReview = false;

    // High fraud score always requires manual review
    if (fraudScore >= this.FRAUD_THRESHOLD) {
      requiresManualReview = true;
      reasoning.push(`High fraud score (${fraudScore}/100) requires manual review`);
    }

    // High value claims require manual review
    if (fraudIndicators.highValueClaim) {
      requiresManualReview = true;
      reasoning.push(`High value claim (${claim.orderAmount} SAR) requires manual review`);
    }

    // Item Not Received logic
    if (claim.type === 'item_not_received') {
      if (trackingInfo.status === 'delivered' && trackingInfo.deliveredAt) {
        recommendedOutcome = 'reject';
        confidence = 'high';
        reasoning.push('Tracking shows item was delivered');
        reasoning.push(`Delivered on ${trackingInfo.deliveredAt.toLocaleDateString()}`);
      } else if (trackingInfo.status === 'lost' || trackingInfo.status === 'returned') {
        recommendedOutcome = 'refund_full';
        confidence = 'high';
        reasoning.push(`Tracking shows ${trackingInfo.status} status`);
      } else if (claim.sellerResponse?.proposedSolution === 'refund_full') {
        recommendedOutcome = 'refund_full';
        confidence = 'high';
        reasoning.push('Seller agrees to full refund');
      } else {
        recommendedOutcome = 'needs_more_info';
        confidence = 'low';
        reasoning.push('Need carrier confirmation of delivery status');
        requiresManualReview = true;
      }
    }

    // Defective Item logic
    if (claim.type === 'defective_item') {
      if (evidenceQuality === 'poor') {
        recommendedOutcome = 'needs_more_info';
        confidence = 'low';
        reasoning.push('Insufficient evidence of defect - photos/video required');
      } else if (evidenceQuality === 'excellent' && !fraudIndicators.buyerHistoryPoor) {
        if (claim.sellerResponse?.proposedSolution === 'replacement') {
          recommendedOutcome = 'replacement';
          confidence = 'high';
          reasoning.push('Seller offers replacement, strong evidence of defect');
        } else {
          recommendedOutcome = 'refund_full';
          confidence = 'high';
          reasoning.push('Strong evidence of defect, buyer has good history');
        }
      } else {
        recommendedOutcome = 'refund_partial';
        confidence = 'medium';
        reasoning.push('Evidence suggests defect, partial refund appropriate');
        requiresManualReview = true;
      }
    }

    // Not As Described logic
    if (claim.type === 'not_as_described') {
      if (evidenceQuality === 'poor') {
        recommendedOutcome = 'needs_more_info';
        confidence = 'low';
        reasoning.push('Need photos comparing item to listing description');
      } else if (
        evidenceQuality === 'good' ||
        (evidenceQuality === 'excellent' && sellerHistory.claimRate > 0.1)
      ) {
        recommendedOutcome = 'refund_full';
        confidence = 'high';
        reasoning.push('Evidence shows significant discrepancy from listing');
        if (sellerHistory.claimRate > 0.1) {
          reasoning.push(`Seller has high claim rate (${(sellerHistory.claimRate * 100).toFixed(1)}%)`);
        }
      } else {
        recommendedOutcome = 'refund_partial';
        confidence = 'medium';
        reasoning.push('Minor discrepancy from listing');
        requiresManualReview = true;
      }
    }

    // Counterfeit always requires manual review
    if (claim.type === 'counterfeit') {
      requiresManualReview = true;
      recommendedOutcome = 'needs_more_info';
      reasoning.push('Counterfeit claims require expert verification');
      reasoning.push('Escalating to legal/compliance team');
    }

    // Consider seller response
    if (claim.sellerResponse) {
      reasoning.push(`Seller proposed: ${claim.sellerResponse.proposedSolution}`);
      
      if (
        claim.sellerResponse.proposedSolution === 'refund_full' &&
        recommendedOutcome !== 'reject'
      ) {
        recommendedOutcome = 'refund_full';
        confidence = 'high';
        reasoning.push('Seller agrees to full refund');
      }

      if (claim.sellerResponse.proposedSolution === 'dispute') {
        requiresManualReview = true;
        reasoning.push('Seller disputes claim - manual review required');
      }
    }

    // Buyer/seller history context
    if (buyerHistory.claimRate > 0.2) {
      reasoning.push(`Buyer has high claim rate (${(buyerHistory.claimRate * 100).toFixed(1)}%)`);
      confidence = 'low';
      requiresManualReview = true;
    }

    if (sellerHistory.rating >= 4.5 && sellerHistory.claimRate < 0.02) {
      reasoning.push(`Seller has excellent history (${sellerHistory.rating.toFixed(1)}★, ${(sellerHistory.claimRate * 100).toFixed(1)}% claim rate)`);
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
  static async autoResolveClaims(): Promise<number> {
    const db = await getDatabase();

    // Get claims eligible for auto-resolution
    const eligibleClaims = await db
      .collection('souq_claims')
      .find({
        status: 'under_investigation',
        isAutoResolvable: true,
      })
      .toArray() as Claim[];

    let resolvedCount = 0;

    for (const claim of eligibleClaims) {
      try {
        const investigation = await this.investigateClaim(claim.claimId);

        // Only auto-resolve if high confidence and no manual review required
        if (
          investigation.confidence === 'high' &&
          !investigation.requiresManualReview &&
          investigation.fraudScore < 50 &&
          investigation.recommendedOutcome !== 'needs_more_info'
        ) {
          await ClaimService.makeDecision({
            claimId: claim.claimId,
            decidedBy: 'system',
            outcome: investigation.recommendedOutcome,
            reason: `Auto-resolved: ${investigation.reasoning.join('; ')}`,
            refundAmount:
              investigation.recommendedOutcome === 'refund_full'
                ? claim.orderAmount
                : investigation.recommendedOutcome === 'refund_partial'
                ? claim.orderAmount * 0.5
                : undefined,
          });

          resolvedCount++;
        }
      } catch (error) {
        logger.error(`Failed to auto-resolve claim ${claim.claimId}:`, error);
      }
    }

    return resolvedCount;
  }

  /**
   * Get claims requiring manual review
   */
  static async getClaimsRequiringReview(): Promise<
    Array<Claim & { investigation: InvestigationResult }>
  > {
    const db = await getDatabase();

    const claims = await db
      .collection('souq_claims')
      .find({
        status: { $in: ['under_investigation', 'escalated'] },
      })
      .sort({ priority: -1, filedAt: 1 })
      .toArray() as Claim[];

    const claimsWithInvestigation = await Promise.all(
      claims.map(async (claim) => {
        const investigation = await this.investigateClaim(claim.claimId);
        return { ...claim, investigation };
      })
    );

    return claimsWithInvestigation.filter((c) => c.investigation.requiresManualReview);
  }

  /**
   * Validate evidence upload
   */
  static validateEvidence(file: {
    size: number;
    type: string;
  }): { valid: boolean; error?: string } {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'application/pdf',
    ];

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, MP4, MOV, PDF',
      };
    }

    return { valid: true };
  }
}
