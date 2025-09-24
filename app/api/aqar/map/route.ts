import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// Clusters properties roughly by grid cells based on zoom & bbox
// GET /api/aqar/map?n=...&s=...&e=...&w=...&z=10
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const n = Number(searchParams.get('n'));
    const s = Number(searchParams.get('s'));
    const e = Number(searchParams.get('e'));
    const w = Number(searchParams.get('w'));
    const z = Math.max(1, Math.min(20, Number(searchParams.get('z') || '10')));

    if ([n, s, e, w].some(v => Number.isNaN(v))) {
      return NextResponse.json({ error: 'Invalid bbox' }, { status: 400 });
    }

    // grid size (degrees) shrinks as zoom increases
    const cell = Math.max(0.01, 180 / Math.pow(2, z + 2));

    const db = await getDatabase();
    const col = db.collection('properties');
    const match = {
      'address.coordinates.lat': { $gte: s, $lte: n },
      'address.coordinates.lng': { $gte: w, $lte: e },
    } as any;

    const pipeline = [
      { $match: match },
      { $project: {
        lat: '$address.coordinates.lat',
        lng: '$address.coordinates.lng',
        price: '$market.listingPrice'
      }},
      { $addFields: {
        gx: { $multiply: [ { $floor: { $divide: ['$lat', cell] } }, cell ] },
        gy: { $multiply: [ { $floor: { $divide: ['$lng', cell] } }, cell ] }
      }},
      { $group: {
        _id: { gx: '$gx', gy: '$gy' },
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        lat: { $avg: '$lat' },
        lng: { $avg: '$lng' }
      }},
      { $limit: 5000 }
    ];

    const rows = await col.aggregate(pipeline).toArray();
    const clusters = rows.map(r => ({
      id: `${r._id.gx}:${r._id.gy}`,
      lat: r.lat,
      lng: r.lng,
      count: r.count,
      avgPrice: Math.round(r.avgPrice || 0)
    }));

    return NextResponse.json({ clusters });
  } catch (err) {
    console.error('Aqar map clusters error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

