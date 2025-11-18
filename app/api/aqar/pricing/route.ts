import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { computePricingInsight } from '@/src/lib/aqar/pricingInsights';
import { ListingIntent, PropertyType } from '@/models/aqar/Listing';
import { rateLimit } from '@/server/security/rateLimit';
import { getClientIP } from '@/server/security/headers';

export const runtime = 'nodejs';

const sanitizeEnum = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

export async function GET(req: NextRequest) {
  try {
    // Rate limit based on IP for public endpoint
    const ip = getClientIP(req);
    const rl = rateLimit(`aqar:pricing:${ip}`, 30, 60_000); // 30 requests per minute
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('cityId');
    if (!cityId) {
      return NextResponse.json({ ok: false, error: 'cityId is required' }, { status: 400 });
    }
    const neighborhoodId = searchParams.get('neighborhoodId') || undefined;
    const propertyType = sanitizeEnum<PropertyType>(
      searchParams.get('propertyType'),
      Object.values(PropertyType)
    );
    const intent =
      sanitizeEnum<ListingIntent>(searchParams.get('intent'), Object.values(ListingIntent)) || ListingIntent.BUY;

    const insight = await computePricingInsight({
      cityId,
      neighborhoodId,
      propertyType,
      intent,
    });

    return NextResponse.json({ ok: true, insight });
  } catch (err) {
    console.error('GET /api/aqar/pricing error', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
