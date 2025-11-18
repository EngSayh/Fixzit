import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ClaimService } from '@/services/souq/claims/claim-service';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';

/**
 * POST /api/souq/claims
 * File a new A-to-Z claim
 */
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    keyPrefix: 'souq-claims:create',
    requests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      orderId,
      sellerId,
      productId,
      type,
      reason,
      description,
      evidence,
      orderAmount,
    } = body;

    // Validate required fields
    if (!orderId || !sellerId || !productId || !type || !reason || !description || !orderAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate claim type
    const validTypes = [
      'item_not_received',
      'defective_item',
      'not_as_described',
      'wrong_item',
      'missing_parts',
      'counterfeit',
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid claim type' }, { status: 400 });
    }

    const claim = await ClaimService.createClaim({
      orderId,
      buyerId: session.user.id,
      sellerId,
      productId,
      type,
      reason,
      description,
      evidence,
      orderAmount: parseFloat(orderAmount),
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    console.error('[Claims API] Create claim failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to create claim',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/souq/claims
 * List claims (buyer or seller view)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view'); // 'buyer' or 'seller'
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    
    // Robust parsing with validation and bounds
    const pageRaw = searchParams.get('page');
    const limitRaw = searchParams.get('limit');
    const pageParsed = pageRaw ? parseInt(pageRaw, 10) : 1;
    const limitParsed = limitRaw ? parseInt(limitRaw, 10) : 20;
    const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;
    const limit = Number.isFinite(limitParsed) ? Math.min(Math.max(1, limitParsed), 100) : 20;

    const filters: Record<string, unknown> = {
      limit,
      offset: (page - 1) * limit,
    };

    if (view === 'buyer') {
      filters.buyerId = session.user.id;
    } else if (view === 'seller') {
      filters.sellerId = session.user.id;
    } else if (view === 'admin') {
      // Admin view: no buyer/seller filtering
      // TODO: Add role-based access control when auth.ts supports roles
      // For now, admin view shows all claims
    } else {
      // Default to buyer view
      filters.buyerId = session.user.id;
    }

    if (status) filters.status = status;
    if (type) filters.type = type;
    if (priority) filters.priority = priority;

    const result = await ClaimService.listClaims(filters);

    return NextResponse.json({
      claims: result.claims,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    console.error('[Claims API] List claims failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to list claims',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
