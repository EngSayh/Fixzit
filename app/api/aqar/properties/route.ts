import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// GET /api/aqar/properties?city=Riyadh&district=Al%20Olaya&type=RESIDENTIAL&bedsMin=2&priceMin=500000&priceMax=3000000&page=1&pageSize=24&sort=newest
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || undefined;
    const district = searchParams.get('district') || undefined;
    const type = searchParams.get('type') || undefined; // aligns to Property.type or subtype
    const bedsMin = Number(searchParams.get('bedsMin') || '') || undefined;
    const bathsMin = Number(searchParams.get('bathsMin') || '') || undefined;
    const areaMin = Number(searchParams.get('areaMin') || '') || undefined;
    const areaMax = Number(searchParams.get('areaMax') || '') || undefined;
    const priceMin = Number(searchParams.get('priceMin') || '') || undefined; // market.listingPrice
    const priceMax = Number(searchParams.get('priceMax') || '') || undefined;
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSize = Math.min(60, Math.max(1, Number(searchParams.get('pageSize') || '24')));
    const sort = searchParams.get('sort') || 'newest'; // newest|price_asc|price_desc|area_desc

    const db = await getDatabase();
    const col = db.collection('properties');

    const filter: any = {};
    if (city) filter['address.city'] = city;
    if (district) filter['address.district'] = district;
    if (type) {
      // Match either top-level type or subtype
      filter.$or = [
        { type },
        { subtype: type }
      ];
    }
    if (bedsMin) filter['details.bedrooms'] = { $gte: bedsMin };
    if (bathsMin) filter['details.bathrooms'] = { $gte: bathsMin };
    if (areaMin || areaMax) {
      filter['details.totalArea'] = {
        ...(areaMin ? { $gte: areaMin } : {}),
        ...(areaMax ? { $lte: areaMax } : {})
      };
    }
    if (priceMin || priceMax) {
      filter['market.listingPrice'] = {
        ...(priceMin ? { $gte: priceMin } : {}),
        ...(priceMax ? { $lte: priceMax } : {})
      };
    }

    const sortStage =
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
      createdAt: 1
    } as const;

    const skip = (page - 1) * pageSize;
    const cursor = col.find(filter, { projection }).sort(sortStage).skip(skip).limit(pageSize);
    const [items, total] = await Promise.all([
      cursor.toArray(),
      col.countDocuments(filter)
    ]);

    return NextResponse.json({ page, pageSize, total, items });
  } catch (err: any) {
    console.error('Aqar properties API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

