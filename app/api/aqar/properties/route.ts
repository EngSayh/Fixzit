import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabase } from '@/lib/mongodb-unified';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';

// Query: /api/aqar/properties?city=&district=&type=&bedsMin=&bathsMin=&areaMin=&areaMax=&priceMin=&priceMax=&sort=&page=&pageSize=
// sort: newest|price_asc|price_desc|area_desc

/**
 * @openapi
 * /api/aqar/properties:
 *   get:
 *     summary: aqar/properties operations
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
  try {
    let user;
    try {
      user = await getSessionUser(req);
    } catch {
      // Fallback for dev/guest exploration: restrict to demo tenant
      user = { id: 'guest', role: 'SUPER_ADMIN' as unknown, orgId: 'demo-tenant', tenantId: 'demo-tenant' };
    }
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await connectToDatabase();
    const db = await getDatabase();
    const col = db.collection('properties');

    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || undefined;
    const district = searchParams.get('district') || undefined;
    const type = searchParams.get('type') || undefined; // matches either type or subtype
    const bedsMin = Number(searchParams.get('bedsMin') || '') || undefined;
    const bathsMin = Number(searchParams.get('bathsMin') || '') || undefined;
    const areaMin = Number(searchParams.get('areaMin') || '') || undefined;
    const areaMax = Number(searchParams.get('areaMax') || '') || undefined;
    const priceMin = Number(searchParams.get('priceMin') || '') || undefined;
    const priceMax = Number(searchParams.get('priceMax') || '') || undefined;
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSize = Math.min(60, Math.max(1, Number(searchParams.get('pageSize') || '24')));

    const filter: Record<string, unknown> = { tenantId: user.tenantId };
    if (city) filter['address.city'] = city;
    if (district) filter['address.district'] = district;
    if (type) filter.$or = [{ type }, { subtype: type }];
    if (bedsMin) filter['details.bedrooms'] = { $gte: bedsMin };
    if (bathsMin) filter['details.bathrooms'] = { $gte: bathsMin };
    if (areaMin || areaMax) {
      filter['details.totalArea'] = {
        ...(areaMin ? { $gte: areaMin } : {}),
        ...(areaMax ? { $lte: areaMax } : {})};
    }
    if (priceMin || priceMax) {
      filter['market.listingPrice'] = {
        ...(priceMin ? { $gte: priceMin } : {}),
        ...(priceMax ? { $lte: priceMax } : {})};
    }

    const sortStage: Record<string, 1 | -1> =
      sort === 'price_asc' ? { 'market.listingPrice': 1 } :
      sort === 'price_desc' ? { 'market.listingPrice': -1 } :
      sort === 'area_desc' ? { 'details.totalArea': -1 } :
      { createdAt: -1 };

    const projection = {
      code: 1,
      name: 1,
      type: 1,
      subtype: 1,
      address: 1,
      details: 1,
      market: 1,
      photos: 1,
      createdAt: 1} as const;

    const skip = (page - 1) * pageSize;
    const cursor = col.find(filter, { projection }).sort(sortStage).skip(skip).limit(pageSize);
    const [items, total] = await Promise.all([
      cursor.toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({ page, pageSize, total, items });
  } catch {
    return createSecureResponse({ error: 'Internal server error' }, 500, req);
  }
}

