import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  tapPayments,
  buildTapCustomer,
  buildRedirectUrls,
  buildWebhookConfig,
  type TapChargeRequest,
} from '@/lib/finance/tap-payments';
import { getSessionUser } from '@/lib/auth';

/**
 * POST /api/payments/tap/checkout
 * 
 * Create a Tap payment checkout session
 * 
 * Body:
 * {
 *   amount: number;        // Amount in SAR (will be converted to halalas)
 *   description?: string;  // Payment description
 *   orderId?: string;      // Your internal order ID
 *   metadata?: object;     // Additional metadata
 * }
 * 
 * Returns:
 * {
 *   chargeId: string;      // Tap charge ID
 *   transactionUrl: string; // Redirect user to this URL to complete payment
 *   status: string;        // Charge status
 * }
 */
export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();

  try {
    // Authenticate user
    const session = await getSessionUser();
    if (!session || !session.user) {
      logger.warn('[POST /api/payments/tap/checkout] Unauthenticated request', { correlationId });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user;

    // Parse request body
    const body = await req.json();
    const {
      amount,
      description,
      orderId,
      metadata = {},
    } = body;

    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount - must be a positive number' },
        { status: 400 }
      );
    }

    logger.info('[POST /api/payments/tap/checkout] Creating checkout session', {
      correlationId,
      userId: user.id,
      email: user.email,
      amount,
      orderId,
    });

    // Convert amount to halalas (smallest currency unit)
    const amountInHalalas = tapPayments.sarToHalalas(amount);

    // Build customer object
    const tapCustomer = buildTapCustomer({
      firstName: user.firstName || user.name?.split(' ')[0] || 'User',
      lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      email: user.email,
      phone: user.phone,
    });

    // Build redirect URLs (user will be sent here after payment)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUrls = buildRedirectUrls(baseUrl, '/payments/success', '/payments/error');

    // Build webhook config (Tap will send payment events here)
    const webhookConfig = buildWebhookConfig(baseUrl);

    // Create Tap charge request
    const chargeRequest: TapChargeRequest = {
      amount: amountInHalalas,
      currency: 'SAR',
      customer: tapCustomer,
      redirect: redirectUrls,
      post: webhookConfig,
      description: description || 'FixZit Payment',
      metadata: {
        ...metadata,
        userId: user.id,
        userEmail: user.email,
        organizationId: user.orgId || '',
        orderId: orderId || '',
      },
      reference: {
        transaction: correlationId,
        order: orderId || undefined,
      },
      receipt: {
        email: true,
        sms: Boolean(user.phone),
      },
    };

    // Create charge with Tap API
    const charge = await tapPayments.createCharge(chargeRequest);

    logger.info('[POST /api/payments/tap/checkout] Charge created successfully', {
      correlationId,
      chargeId: charge.id,
      status: charge.status,
      transactionUrl: charge.transaction.url,
    });

    // Return checkout URL to frontend
    return NextResponse.json({
      success: true,
      chargeId: charge.id,
      transactionUrl: charge.transaction.url,
      status: charge.status,
      expiresAt: charge.transaction.expiry ? 
        new Date(Date.now() + charge.transaction.expiry.period * 60000).toISOString() : 
        null,
    });

  } catch (error) {
    logger.error('[POST /api/payments/tap/checkout] Error creating checkout session', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to create payment session',
        message: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/tap/checkout/:chargeId
 * 
 * Retrieve charge status
 */
export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID();

  try {
    // Authenticate user
    const session = await getSessionUser();
    if (!session || !session.user) {
      logger.warn('[GET /api/payments/tap/checkout] Unauthenticated request', { correlationId });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract charge ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const chargeId = pathParts[pathParts.length - 1];

    if (!chargeId || !chargeId.startsWith('chg_')) {
      return NextResponse.json(
        { error: 'Invalid charge ID' },
        { status: 400 }
      );
    }

    logger.info('[GET /api/payments/tap/checkout] Retrieving charge', {
      correlationId,
      chargeId,
      userId: session.user.id,
    });

    // Retrieve charge from Tap
    const charge = await tapPayments.getCharge(chargeId);

    logger.info('[GET /api/payments/tap/checkout] Charge retrieved', {
      correlationId,
      chargeId,
      status: charge.status,
    });

    return NextResponse.json({
      success: true,
      charge: {
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        customer: charge.customer,
        metadata: charge.metadata,
        reference: charge.reference,
        createdAt: charge.transaction.created,
      },
    });

  } catch (error) {
    logger.error('[GET /api/payments/tap/checkout] Error retrieving charge', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve charge',
        message: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
      },
      { status: 500 }
    );
  }
}
