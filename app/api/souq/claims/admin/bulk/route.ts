import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDb } from '@/lib/mongo';
import { logger } from '@/lib/logger';
import { SouqClaim } from '@/server/models/souq/Claim';

const ELIGIBLE_STATUSES = [
  'submitted',
  'under_review',
  'pending_seller_response',
  'pending_investigation',
  'escalated',
] as const;

/**
 * POST /api/souq/claims/admin/bulk
 * 
 * Bulk approve or reject multiple claims at once
 * 
 * Body: {
 *   action: 'approve' | 'reject',
 *   claimIds: string[],
 *   reason: string
 * }
 * 
 * @security Requires admin role
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const userRole = session.user.role;
    const isSuperAdmin = session.user.isSuperAdmin;
    
    if (!isSuperAdmin && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, claimIds, reason } = body;

    // Validate input
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return NextResponse.json(
        { error: 'claimIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (claimIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 claims can be processed at once' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 20) {
      return NextResponse.json(
        { error: 'Reason must be at least 20 characters' },
        { status: 400 }
      );
    }

    await connectDb();

    // Fetch all claims to validate they exist and can be bulk processed
    const claims = await SouqClaim.find({
      _id: { $in: claimIds },
      status: { $in: ELIGIBLE_STATUSES }
    });

    if (claims.length === 0) {
      return NextResponse.json(
        { error: 'No valid claims found for bulk action' },
        { status: 404 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { claimId: string; error: string }[],
    };

    // Process each claim
    for (const claim of claims) {
      try {
        const newStatus = action === 'approve' ? 'resolved' : 'closed';
        const refundAmount = action === 'approve' ? claim.requestedAmount : 0;

        claim.status = newStatus;
        claim.decision = {
          decidedBy: session.user.id,
          decidedAt: new Date(),
          outcome: action === 'approve' ? 'approved' : 'denied',
          reasoning: reason.trim(),
          refundAmount,
          evidence: [],
        };

        // Add timeline event
        if (!claim.timeline) {
          claim.timeline = [];
        }
        claim.timeline.push({
          status: `admin_decision_${newStatus}`,
          performedBy: session.user.id,
          timestamp: new Date(),
          note: `Bulk action: ${reason.trim()}`,
        });

        await claim.save();
        results.success++;

        // TODO: Send notification to buyer and seller
        // TODO: Process refund if approved
      } catch (error) {
        results.failed++;
        results.errors.push({
          claimId: String(claim._id),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error('Bulk action failed for claim', error as Error, {
          claimId: String(claim._id),
          action,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.success} claims successfully`,
      results: {
        total: claimIds.length,
        processed: claims.length,
        success: results.success,
        failed: results.failed,
        notFound: claimIds.length - claims.length,
        errors: results.errors,
      },
    });
  } catch (error) {
    logger.error('Bulk claims action error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
