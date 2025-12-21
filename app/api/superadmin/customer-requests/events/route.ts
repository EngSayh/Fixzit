/**
 * @fileoverview Customer Request Events API - Audit trail for customer requests
 *
 * @security Requires superadmin session (getSuperadminSession)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminSession } from '@/lib/superadmin/auth';
import { connectMongo } from '@/lib/db/mongoose';
import CustomerRequestEvent from '@/server/models/CustomerRequestEvent';

/**
 * GET /api/superadmin/customer-requests/events - Get events for a request
 *
 * @param {string} req.searchParams.requestId - Request ID to get events for
 */
export async function GET(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  const url = new URL(req.url);
  const requestId = url.searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json({ error: 'Missing required parameter: requestId' }, { status: 400 });
  }

  const events = await CustomerRequestEvent.find({ requestId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({ events });
}
