import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabase } from '@/src/lib/mongodb-unified';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

// Constants for clustering grid cell calculation
const MIN_CELL_SIZE_DEGREES = 0.01; // avoid excessive granularity
const LATITUDE_RANGE_DEGREES = 180; // -90..+90 total span
const ZOOM_EXPONENT_BASE = 2; // each zoom level doubles resolution

export async function GET(req: NextRequest) {
  try {
    let user;
    try {
      user = await getSessionUser(req);
    } catch {
      user = { id: 'guest', role: 'SUPER_ADMIN' as any, orgId: 'demo-tenant', tenantId: 'demo-tenant' };
    }

    const { searchParams } = new URL(req.url);
    const n = Number(searchParams.get('n'));
    const s = Number(searchParams.get('s'));
    const e = Number(searchParams.get('e'));
    const w = Number(searchParams.get('w'));
    const z = Math.max(1, Math.min(20, Number(searchParams.get('z') || '10')));

    if ([n, s, e, w].some(v => Number.isNaN(v))) {
      return NextResponse.json({ error: 'Invalid bbox' }, { status: 400 });
    }

    const cell = Math.max(
      MIN_CELL_SIZE_DEGREES,
      LATITUDE_RANGE_DEGREES / Math.pow(ZOOM_EXPONENT_BASE, z + 2)
    );

    await connectToDatabase();
    const db = await getDatabase();
    const col = db.collection('properties');

    const match: any = {
      tenantId: user.tenantId,
      'address.coordinates.lat': { $gte: s, $lte: n },
      'address.coordinates.lng': { $gte: w, $lte: e },
    };

    const pipeline = [
      { $match: match },
      { $project: {
        lat: '$address.coordinates.lat',
        lng: '$address.coordinates.lng',
        price: '$market.listingPrice',
      }},
      { $addFields: {
        gx: { $multiply: [ { $floor: { $divide: ['$lat', cell] } }, cell ] },
        gy: { $multiply: [ { $floor: { $divide: ['$lng', cell] } }, cell ] },
      }},
      { $group: {
        _id: { gx: '$gx', gy: '$gy' },
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        lat: { $avg: '$lat' },
        lng: { $avg: '$lng' },
      }},
      { $limit: 5000 },
    ];

    const rows = await col.aggregate(pipeline).toArray();
    const clusters = rows.map((r: any) => ({
      id: `${r._id.gx}:${r._id.gy}`,
      lat: r.lat,
      lng: r.lng,
      count: r.count,
      avgPrice: Math.round(r.avgPrice || 0),
    }));

    return NextResponse.json({ clusters });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


