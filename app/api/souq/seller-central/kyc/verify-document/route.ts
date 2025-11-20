import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { sellerKYCService } from '@/services/souq/seller-kyc-service';

/**
 * POST /api/souq/seller-central/kyc/verify-document
 * Verify a specific KYC document (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin only
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { sellerId, documentType, approved, rejectionReason } = body;

    // Validation
    if (!sellerId || !documentType || approved === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: sellerId, documentType, approved' 
      }, { status: 400 });
    }

    if (!approved && !rejectionReason) {
      return NextResponse.json({ 
        error: 'Rejection reason required when approved is false' 
      }, { status: 400 });
    }

    // Verify document
    await sellerKYCService.verifyDocument({
      sellerId,
      documentType,
      approved,
      verifiedBy: session.user.id,
      rejectionReason
    });

    return NextResponse.json({ 
      success: true,
      message: `Document ${approved ? 'approved' : 'rejected'} successfully`
    });

  } catch (error) {
    logger.error('Verify document error', { error });
    return NextResponse.json({ 
      error: 'Failed to verify document',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
