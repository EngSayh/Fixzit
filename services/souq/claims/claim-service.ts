import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { addJob, QUEUE_NAMES } from '@/lib/queues/setup';

// Claim Types
export type ClaimType =
  | 'item_not_received' // INR - Item never delivered
  | 'defective_item' // Item damaged or doesn't work
  | 'not_as_described' // Item doesn't match listing
  | 'wrong_item' // Received different product
  | 'missing_parts' // Incomplete item
  | 'counterfeit'; // Suspected fake product

// Claim Status Lifecycle
export type ClaimStatus =
  | 'pending_review' // Initial state
  | 'pending_seller_response' // Waiting for seller to respond
  | 'under_review' // Manual investigation in progress
  | 'under_investigation' // Admin reviewing evidence
  | 'pending_evidence' // Waiting for more evidence
  | 'escalated' // Requires manual admin review
  | 'resolved_refund_full' // Full refund issued
  | 'resolved_refund_partial' // Partial refund issued
  | 'resolved_replacement' // Replacement sent
  | 'rejected' // Claim denied
  | 'withdrawn' // Buyer withdrew claim
  | 'approved' // Seller accepted buyer resolution
  | 'closed' // Claim fully closed
  | 'appealed' // Seller appealed decision
  | 'under_appeal'; // Appeal awaiting review

// Decision Outcomes
export type DecisionOutcome =
  | 'refund_full'
  | 'refund_partial'
  | 'replacement'
  | 'reject'
  | 'needs_more_info';

export interface Claim {
  _id?: ObjectId;
  claimId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  productId: string; // FSIN
  type: ClaimType;
  status: ClaimStatus;
  
  // Claim Details
  reason: string;
  description: string;
  evidence: Evidence[];
  
  // Timeline
  filedAt: Date;
  responseDeadline: Date;
  investigationDeadline?: Date;
  resolvedAt?: Date;
  
  // Responses
  sellerResponse?: SellerResponse;
  adminNotes?: AdminNote[];
  
  // Decision
  decision?: ClaimDecision;
  appeal?: Appeal;
  
  // Amounts
  orderAmount: number;
  requestedAmount?: number;
  requestType?: string;
  refundAmount?: number;
  
  // Flags
  isAutoResolvable: boolean;
  isFraudulent: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Evidence {
  evidenceId: string;
  uploadedBy: 'buyer' | 'seller' | 'admin';
  type: 'image' | 'photo' | 'video' | 'document' | 'tracking_info' | 'message_screenshot';
  url: string;
  description?: string;
  uploadedAt: Date;
}

export interface SellerResponse {
  action?: 'accept' | 'dispute';
  message?: string;
  responseText?: string;
  proposedSolution?: 'refund_full' | 'refund_partial' | 'replacement' | 'dispute';
  partialRefundAmount?: number;
  evidence?: Evidence[];
  counterEvidence?: Evidence[];
  respondedAt: Date;
}

export interface AdminNote {
  noteId: string;
  adminId: string;
  note: string;
  createdAt: Date;
}

export interface ClaimDecision {
  decisionId: string;
  decidedBy: 'system' | 'admin';
  decidedByUserId?: string;
  outcome: DecisionOutcome;
  reason: string;
  refundAmount?: number;
  decidedAt: Date;
  notifiedAt?: Date;
}

export interface Appeal {
  appealId: string;
  appealedBy: 'buyer' | 'seller';
  reason: string;
  evidence: Evidence[];
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  appealedAt: Date;
}

export interface CreateClaimInput {
  orderId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  type: ClaimType;
  reason: string;
  description: string;
  evidence?: { type: string; url: string; description?: string }[];
  orderAmount: number;
  requestedAmount?: number;
  requestType?: string;
}

export interface AddEvidenceInput {
  claimId: string;
  uploadedBy: 'buyer' | 'seller' | 'admin';
  type: string;
  url: string;
  description?: string;
}

export interface SellerResponseInput {
  claimId: string;
  sellerId: string;
  responseText: string;
  proposedSolution: 'refund_full' | 'refund_partial' | 'replacement' | 'dispute';
  partialRefundAmount?: number;
  evidence?: { type: string; url: string; description?: string }[];
}

export interface MakeDecisionInput {
  claimId: string;
  decidedBy: 'system' | 'admin';
  decidedByUserId?: string;
  outcome: DecisionOutcome;
  reason: string;
  refundAmount?: number;
}

export class ClaimService {
  private static COLLECTION = 'claims';
  private static SELLER_RESPONSE_DEADLINE_HOURS = 48;
  private static INVESTIGATION_DEADLINE_HOURS = 72;
  private static AUTO_RESOLVE_THRESHOLD = 50; // SAR

  private static async collection() {
    return (await getDatabase()).collection<Claim>(this.COLLECTION);
  }

  private static buildIdMatch(value: string) {
    const conditions: (string | ObjectId)[] = [value];
    if (ObjectId.isValid(value)) {
      conditions.push(new ObjectId(value));
    }
    return { $in: conditions };
  }

  /**
   * File a new A-to-Z claim
   */
  static async createClaim(input: CreateClaimInput): Promise<Claim> {
    const collection = await this.collection();
    
    const claimId = `CLM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const _id = new ObjectId();
    
    // Calculate deadlines
    const filedAt = new Date();
    const responseDeadline = new Date(filedAt.getTime() + this.SELLER_RESPONSE_DEADLINE_HOURS * 60 * 60 * 1000);
    
    // Determine if auto-resolvable (low value claims)
    const isAutoResolvable = input.orderAmount <= this.AUTO_RESOLVE_THRESHOLD;
    
    // Determine priority
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    if (input.type === 'counterfeit') priority = 'urgent';
    else if (input.orderAmount > 500) priority = 'high';
    else if (input.orderAmount < 50) priority = 'low';
    
    const evidence: Evidence[] = (input.evidence || []).map((e, index) => ({
      evidenceId: `EV-${claimId}-${index + 1}`,
      uploadedBy: 'buyer' as const,
      type: e.type as Evidence['type'],
      url: e.url,
      description: e.description,
      uploadedAt: new Date(),
    }));
    
    const claim: Claim = {
      _id,
      claimId,
      orderId: input.orderId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      productId: input.productId,
      type: input.type,
      status: 'pending_review',
      reason: input.reason,
      description: input.description,
      evidence,
      filedAt,
      responseDeadline,
      orderAmount: input.orderAmount,
      requestedAmount: input.requestedAmount ?? input.orderAmount,
      requestType: input.requestType ?? 'refund',
      isAutoResolvable,
      isFraudulent: false,
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await collection.insertOne(claim);
    
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'souq-claim-filed', {
      claimId,
      sellerId: input.sellerId,
      buyerId: input.buyerId,
      orderId: input.orderId,
      priority,
    });
    
    return claim;
  }

  /**
   * Get claim by ID
   */
  static async getClaim(claimId: string): Promise<Claim | null> {
    const collection = await this.collection();
    if (ObjectId.isValid(claimId)) {
      const byObjectId = await collection.findOne({ _id: new ObjectId(claimId) });
      if (byObjectId) {
        return byObjectId;
      }
    }
    return collection.findOne({ claimId });
  }

  /**
   * List claims with filters
   */
  static async listClaims(filters: {
    buyerId?: string;
    sellerId?: string;
    status?: ClaimStatus;
    type?: ClaimType;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ claims: Claim[]; total: number }> {
    const collection = await this.collection();
    
    const query: Record<string, unknown> = {};
    if (filters.buyerId) query.buyerId = this.buildIdMatch(filters.buyerId);
    if (filters.sellerId) query.sellerId = this.buildIdMatch(filters.sellerId);
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.priority) query.priority = filters.priority;
    
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    
    const [claims, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);
    
    return {
      claims,
      total,
    };
  }

  /**
   * Add evidence to claim
   */
  static async addEvidence(input: AddEvidenceInput): Promise<void> {
    const collection = await this.collection();
    
    const claim = await this.getClaim(input.claimId);
    if (!claim) throw new Error('Claim not found');
    
    const evidence: Evidence = {
      evidenceId: `EV-${input.claimId}-${claim.evidence.length + 1}`,
      uploadedBy: input.uploadedBy,
      type: input.type as Evidence['type'],
      url: input.url,
      description: input.description,
      uploadedAt: new Date(),
    };
    
    await collection.updateOne(
      ObjectId.isValid(input.claimId) ? { _id: new ObjectId(input.claimId) } : { claimId: input.claimId },
      {
        $push: { evidence },
        $set: { updatedAt: new Date() },
      }
    );
  }

  /**
   * Seller responds to claim
   */
  static async addSellerResponse(input: SellerResponseInput): Promise<void> {
    const collection = await this.collection();
    
    const claim = await this.getClaim(input.claimId);
    if (!claim) throw new Error('Claim not found');
    if (claim.sellerId !== input.sellerId) throw new Error('Unauthorized');
    if (claim.status !== 'pending_review' && claim.status !== 'pending_seller_response') {
      throw new Error('Claim is not in a state that accepts seller response');
    }
    
    const evidence: Evidence[] = (input.evidence || []).map((e, index) => ({
      evidenceId: `EV-${input.claimId}-${claim.evidence.length + index + 1}`,
      uploadedBy: 'seller' as const,
      type: e.type as Evidence['type'],
      url: e.url,
      description: e.description,
      uploadedAt: new Date(),
    }));
    
    const sellerResponse: SellerResponse = {
      responseText: input.responseText,
      proposedSolution: input.proposedSolution,
      partialRefundAmount: input.partialRefundAmount,
      evidence,
      respondedAt: new Date(),
    };
    
    // Determine next status and whether we should attempt auto-resolution
    const newStatus: ClaimStatus = 'under_investigation';
    const shouldAttemptAutoResolve =
      input.proposedSolution === 'refund_full' && claim.isAutoResolvable;

    const investigationDeadline = new Date(Date.now() + this.INVESTIGATION_DEADLINE_HOURS * 60 * 60 * 1000);

    await collection.updateOne(
      ObjectId.isValid(input.claimId) ? { _id: new ObjectId(input.claimId) } : { claimId: input.claimId },
      {
        $set: {
          sellerResponse,
          status: newStatus,
          investigationDeadline,
          updatedAt: new Date(),
        },
        $push: { evidence: { $each: evidence } },
      }
    );

    if (shouldAttemptAutoResolve) {
      await this.tryAutoResolveClaim(input.claimId);
    }
  }

  /**
   * Make decision on claim
   */
  static async makeDecision(input: MakeDecisionInput): Promise<void> {
    const collection = await this.collection();
    
    const claim = await this.getClaim(input.claimId);
    if (!claim) throw new Error('Claim not found');
    
    const decision: ClaimDecision = {
      decisionId: `DEC-${input.claimId}-${Date.now()}`,
      decidedBy: input.decidedBy,
      decidedByUserId: input.decidedByUserId,
      outcome: input.outcome,
      reason: input.reason,
      refundAmount: input.refundAmount,
      decidedAt: new Date(),
    };
    
    // Map outcome to status
    const statusMap: Record<DecisionOutcome, ClaimStatus> = {
      refund_full: 'resolved_refund_full',
      refund_partial: 'resolved_refund_partial',
      replacement: 'resolved_replacement',
      reject: 'rejected',
      needs_more_info: 'pending_evidence',
    };
    
    await collection.updateOne(
      { claimId: input.claimId },
      {
        $set: {
          decision,
          status: statusMap[input.outcome],
          refundAmount: input.refundAmount,
          resolvedAt: input.outcome !== 'needs_more_info' ? new Date() : undefined,
          updatedAt: new Date(),
        },
      }
    );
    
      await addJob(QUEUE_NAMES.NOTIFICATIONS, 'souq-claim-decision', {
        claimId: input.claimId,
        buyerId: claim.buyerId,
        sellerId: claim.sellerId,
        outcome: input.outcome,
        refundAmount: input.refundAmount,
      });
    }

  /**
   * File an appeal
   */
  static async fileAppeal(
    claimId: string,
    appealedBy: 'buyer' | 'seller',
    reason: string,
    evidence: { type: string; url: string; description?: string }[]
  ): Promise<void> {
    const collection = await this.collection();
    
    const claim = await this.getClaim(claimId);
    if (!claim) throw new Error('Claim not found');
    if (!claim.decision) throw new Error('Cannot appeal claim without decision');
    
    const appealEvidence: Evidence[] = evidence.map((e, index) => ({
      evidenceId: `EV-${claimId}-APPEAL-${index + 1}`,
      uploadedBy: appealedBy === 'buyer' ? 'buyer' : 'seller',
      type: e.type as Evidence['type'],
      url: e.url,
      description: e.description,
      uploadedAt: new Date(),
    }));
    
    const appeal: Appeal = {
      appealId: `APP-${claimId}-${Date.now()}`,
      appealedBy,
      reason,
      evidence: appealEvidence,
      status: 'pending',
      appealedAt: new Date(),
    };
    
    await collection.updateOne(
      ObjectId.isValid(claimId) ? { _id: new ObjectId(claimId) } : { claimId },
      {
        $set: {
          appeal,
          status: 'appealed',
          updatedAt: new Date(),
        },
        $push: { evidence: { $each: appealEvidence } },
      }
    );

    // Notify admin team for manual review
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'internal-notification', {
      to: 'souq-claims-admins',
      priority: 'high',
      message: `Claim ${claimId} was appealed by the ${appealedBy}.`,
      metadata: {
        claimId,
        appealedBy,
        sellerId: claim.sellerId,
        buyerId: claim.buyerId,
        reason,
      },
    });
  }

  /**
   * Add admin note
   */
  static async addAdminNote(claimId: string, adminId: string, note: string): Promise<void> {
    const collection = await this.collection();
    
    const adminNote: AdminNote = {
      noteId: `NOTE-${claimId}-${Date.now()}`,
      adminId,
      note,
      createdAt: new Date(),
    };
    
    await collection.updateOne(
      ObjectId.isValid(claimId) ? { _id: new ObjectId(claimId) } : { claimId },
      {
        $push: { adminNotes: adminNote },
        $set: { updatedAt: new Date() },
      }
    );
  }

  /**
   * Update claim status
   */
  static async updateStatus(claimId: string, status: ClaimStatus): Promise<void> {
    const collection = await this.collection();
    
    await collection.updateOne(
      ObjectId.isValid(claimId) ? { _id: new ObjectId(claimId) } : { claimId },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Check for overdue responses
   */
  static async getOverdueClaims(): Promise<Claim[]> {
    const collection = await this.collection();
    
    const now = new Date();
    
    const overdueClaims = await collection
      .find({
        status: { $in: ['pending_review', 'pending_seller_response'] },
        responseDeadline: { $lt: now },
      })
      .toArray();
    
    return overdueClaims;
  }

  /**
   * Auto-escalate overdue claims
   */
  static async escalateOverdueClaims(): Promise<number> {
    const overdueClaims = await this.getOverdueClaims();
    const collection = await this.collection();
    
    for (const claim of overdueClaims) {
      await collection.updateOne(
        { claimId: claim.claimId },
        {
          $set: {
            status: 'escalated',
            priority: 'high',
            updatedAt: new Date(),
          },
        }
      );
    }
    
    return overdueClaims.length;
  }

  /**
   * Get claim statistics
   */
  static async getClaimStats(filters: { sellerId?: string; buyerId?: string }): Promise<{
    total: number;
    byStatus: Record<ClaimStatus, number>;
    byType: Record<ClaimType, number>;
    avgResolutionTime: number;
    refundTotal: number;
  }> {
    const collection = await this.collection();
    
    const query: Record<string, unknown> = {};
    if (filters.sellerId) query.sellerId = filters.sellerId;
    if (filters.buyerId) query.buyerId = filters.buyerId;
    
    const claims = await collection.find(query).toArray();
    
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let refundTotal = 0;
    
    claims.forEach((claim) => {
      byStatus[claim.status] = (byStatus[claim.status] || 0) + 1;
      byType[claim.type] = (byType[claim.type] || 0) + 1;
      
      if (claim.resolvedAt) {
        const resolutionTime = claim.resolvedAt.getTime() - claim.filedAt.getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
      
      if (claim.refundAmount) {
        refundTotal += claim.refundAmount;
      }
    });
    
    return {
      total: claims.length,
      byStatus: byStatus as Record<ClaimStatus, number>,
      byType: byType as Record<ClaimType, number>,
      avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      refundTotal,
    };
  }

  /**
   * Run auto-resolution checks after seller agrees to refund
   */
  private static async tryAutoResolveClaim(claimId: string): Promise<void> {
    const claim = await this.getClaim(claimId);
    if (!claim || !claim.isAutoResolvable) {
      return;
    }

    const { InvestigationService } = await import('./investigation-service');
    const investigation = await InvestigationService.investigateClaim(claimId);

    const canAutoResolve =
      investigation.confidence === 'high' &&
      !investigation.requiresManualReview &&
      investigation.fraudScore < 50 &&
      investigation.recommendedOutcome === 'refund_full' &&
      claim.sellerResponse?.proposedSolution === 'refund_full';

    if (!canAutoResolve) {
      return;
    }

    await this.makeDecision({
      claimId,
      decidedBy: 'system',
      outcome: 'refund_full',
      reason: `Auto-resolved after seller agreement: ${investigation.reasoning.join('; ')}`,
      refundAmount: claim.orderAmount,
    });
  }
}
