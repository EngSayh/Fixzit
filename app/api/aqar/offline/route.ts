import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { ListingIntent } from '@/models/aqar/Listing';
import { AqarOfflineCacheService } from '@/services/aqar/offline-cache-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  try {
    const { searchParams } = new URL(request.url);
    let user: { orgId?: string } | undefined;
    try {
      user = await getSessionUser(request);
    } catch (error) {
      if (error instanceof Error && error.message !== 'Unauthorized') {
        logger.warn('AQAR_OFFLINE_SESSION_WARN', { error: error.message, correlationId });
      }
    }

    const city = searchParams.get('city') || undefined;
    const intent = searchParams.get('intent') as ListingIntent | null;
    const limitRaw = searchParams.get('limit');
    const limitParsed = limitRaw ? Number(limitRaw) : undefined;
    const limit = limitParsed !== undefined && Number.isFinite(limitParsed) && limitParsed > 0 
      ? Math.floor(limitParsed) 
      : undefined;
    const includeAuctions = searchParams.get('includeAuctions') === 'true';
    const hint = searchParams.get('hint') || undefined;

    const bundle = await AqarOfflineCacheService.getOrBuildBundle({
      city,
      intent: intent || undefined,
      limit,
      includeAuctions,
      cacheHint: hint,
      orgId: user?.orgId,
    });

    return NextResponse.json({ ...bundle, correlationId });
  } catch (error) {
    logger.error('AQAR_OFFLINE_API_FAILED', {
      correlationId,
      error: (error as Error)?.message ?? String(error),
    });
    return NextResponse.json({ error: 'Failed to build offline bundle', correlationId }, { status: 500 });
  }
}
