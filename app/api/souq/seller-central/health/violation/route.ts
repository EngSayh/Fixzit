import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { accountHealthService } from '@/services/souq/account-health-service';

/**
 * POST /api/souq/seller-central/health/violation
 * Record a policy violation (Admin only)
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
    const { sellerId, type, severity, description, action } = body;

    // Validation
    if (!sellerId || !type || !severity || !description || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: sellerId, type, severity, description, action' 
      }, { status: 400 });
    }

    // Record violation
    await accountHealthService.recordViolation(sellerId, {
      type,
      severity,
      description,
      action
    });

    return NextResponse.json({ 
      success: true,
      message: 'Policy violation recorded successfully'
    });

  } catch (error) {
    console.error('Record violation error:', error);
    return NextResponse.json({ 
      error: 'Failed to record violation',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
