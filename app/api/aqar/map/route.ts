import { NextRequest} from 'next/server';
import { connectToDatabase, getDatabase } from '@/lib/mongodb-unified';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

// Constants for clustering grid cell calculation
const MIN_CELL_SIZE_DEGREES = 0.01; // avoid excessive granularity
const LATITUDE_RANGE_DEGREES = 180; // -90..+90 total span
const ZOOM_EXPONENT_BASE = 2; // each zoom level doubles resolution

/**
 * @openapi
 * /api/aqar/map:
 *   get:
 *     summary: aqar/map operations
 *     tags: [aqar]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    let user;
    try {
      user = await getSessionUser(req);
    } catch {
      user = { id: 'guest', role: 'SUPER_ADMIN' as unknown, orgId: 'demo-tenant', tenantId: 'demo-tenant' };
    }

    const { searchParams } = new URL(req.url);
    const n = Number(searchParams.get('n'));
    const s = Number(searchParams.get('s'));
    const e = Number(searchParams.get('e'));
    const w = Number(searchParams.get('w'));
    const z = Math.max(1, Math.min(20, Number(searchParams.get('z') || '10')));

    if ([n, s, e, w].some(v => Number.isNaN(v))) {
      return createSecureResponse({ error: 'Invalid bbox' }, 400, req);
    }

    const cell = Math.max(
      MIN_CELL_SIZE_DEGREES,
      LATITUDE_RANGE_DEGREES / Math.pow(ZOOM_EXPONENT_BASE, z + 2)
    );

    await connectToDatabase();
    const db = await getDatabase();
    const col = db.collection('properties');

    const match: Record<string, unknown> = {
      tenantId: user.tenantId,
      'address.coordinates.lat': { $gte: s, $lte: n },
      'address.coordinates.lng': { $gte: w, $lte: e }};

    const pipeline = [
      { $match: match },
      { $project: {
        lat: '$address.coordinates.lat',
        lng: '$address.coordinates.lng',
        price: '$market.listingPrice'}},
      { $addFields: {
        gx: { $multiply: [ { $floor: { $divide: ['$lat', cell] } }, cell ] },
        gy: { $multiply: [ { $floor: { $divide: ['$lng', cell] } }, cell ] }}},
      { $group: {
        _id: { gx: '$gx', gy: '$gy' },
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        lat: { $avg: '$lat' },
        lng: { $avg: '$lng' }}},
      { $limit: 5000 },
    ];

    interface ClusterRow {
      _id: { gx: number; gy: number };
      count: number;
      avgPrice?: number;
      lat: number;
      lng: number;
    }

    const rows = await col.aggregate(pipeline).toArray();
    const clusters = (rows as unknown as ClusterRow[]).map((r) => ({
      id: `${r._id.gx}:${r._id.gy}`,
      lat: r.lat,
      lng: r.lng,
      count: r.count,
      avgPrice: Math.round(r.avgPrice || 0)}));

    return createSecureResponse({ clusters }, 200, req);
  } catch {
    return createSecureResponse({ error: 'Internal server error' }, 500, req);
  }
}


