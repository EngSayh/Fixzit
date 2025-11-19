import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { getRecommendedListings } from '@/src/lib/aqar/recommendation';
import { ListingIntent, PropertyType } from '@/models/aqar/Listing';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { rateLimit } from '@/server/security/rateLimit';
import { createSecureResponse } from '@/server/security/headers';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';

export const runtime = 'nodejs';

const sanitizeEnum = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getSessionUser(req).catch(() => null);
    if (!session) {
      return createSecureResponse({ ok: false, error: 'Authentication required' }, 401, req);
    }

    // Rate limit per user/tenant
    const rl = rateLimit(buildRateLimitKey(req, session.id), 60, 60_000); // 60 requests per minute
    if (!rl.allowed) {
      return createSecureResponse({ ok: false, error: 'Rate limit exceeded' }, 429, req);
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get('listingId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const city = searchParams.get('city') || undefined;
    const intent = sanitizeEnum<ListingIntent>(searchParams.get('intent'), Object.values(ListingIntent));
    const propertyType = sanitizeEnum<PropertyType>(
      searchParams.get('propertyType'),
      Object.values(PropertyType)
    );
    const limitParam = Number(searchParams.get('limit') || '');
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, limitParam), 12) : 8;

    const items = await getRecommendedListings({ listingId, userId, city, intent, propertyType, limit });

    return createSecureResponse({ ok: true, items }, 200, req);
  } catch (err) {
    console.error('GET /api/aqar/recommendations error', err);
    return createSecureResponse({ ok: false, error: 'Server error' }, 500, req);
  }
}
