import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ClaimService } from '@/services/souq/claims/claim-service';

/**
 * POST /api/souq/claims/[id]/evidence
 * Upload evidence to claim
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, url, description } = body;

    if (!type || !url) {
      return NextResponse.json(
        { error: 'Missing required fields: type, url' },
        { status: 400 }
      );
    }

    const claim = await ClaimService.getClaim(params.id);
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Determine who is uploading
    let uploadedBy: 'buyer' | 'seller' | 'admin';
    if (claim.buyerId === session.user.id) {
      uploadedBy = 'buyer';
    } else if (claim.sellerId === session.user.id) {
      uploadedBy = 'seller';
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ClaimService.addEvidence({
      claimId: params.id,
      uploadedBy,
      type,
      url,
      description,
    });

    return NextResponse.json({
      success: true,
      message: 'Evidence uploaded successfully',
    });
  } catch (error) {
    console.error('[Claims API] Upload evidence failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload evidence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
