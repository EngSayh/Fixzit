import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { getClientIP } from '@/server/security/headers';
import { Config } from '@/lib/config/constants';

type ScanStatus = 'pending' | 'clean' | 'infected' | 'error';

type ScanDocument = {
  _id: ObjectId;
  key: string;
  status: ScanStatus;
  engine?: string;
  findings?: string[];
  sizeBytes?: number;
  scannedAt?: Date;
  receivedAt?: Date;
};

const COLLECTION = 'upload_scans';

function normalizeStatus(value: unknown): ScanStatus {
  if (value === 'clean') return 'clean';
  if (value === 'infected') return 'infected';
  if (value === 'pending') return 'pending';
  if (value === 'error') return 'error';
  return 'pending';
}

async function getStatusForKey(key: string) {
  const db = await getDatabase();
  const collection = db.collection<ScanDocument>(COLLECTION);
  const doc = await collection
    .find({ key })
    .sort({ scannedAt: -1, receivedAt: -1, _id: -1 })
    .limit(1)
    .next();

  return {
    key,
    status: normalizeStatus(doc?.status ?? 'pending'),
    findings: doc?.findings,
    engine: doc?.engine,
    sizeBytes: doc?.sizeBytes,
    scannedAt: doc?.scannedAt ?? doc?.receivedAt,
    receivedAt: doc?.receivedAt,
  } as const;
}

function getTokenConfig() {
  const token = process.env.SCAN_STATUS_TOKEN || Config.aws.scan.statusToken;
  const tokenRequiredEnv = process.env.SCAN_STATUS_TOKEN_REQUIRED;
  const tokenRequired = tokenRequiredEnv !== undefined ? tokenRequiredEnv === 'true' : Config.aws.scan.statusTokenRequired;
  return { token, tokenRequired };
}

function isTokenAuthorized(req: NextRequest) {
  const token = req.headers.get('x-scan-token');
  const { token: expected } = getTokenConfig();
  return Boolean(expected && token && token === expected);
}

function cacheHeaders() {
  return {
    'Cache-Control': 'public, max-age=5',
    'CDN-Cache-Control': 'max-age=5',
  };
}

export async function GET(req: NextRequest) {
  const tokenAuthorized = isTokenAuthorized(req);
  const { tokenRequired } = getTokenConfig();
  let userId: string | undefined;

  if (tokenRequired && !tokenAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!tokenRequired && !tokenAuthorized) {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = user.id;
  }

  const rl = rateLimit(buildRateLimitKey(req, userId ?? getClientIP(req)), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  }

  try {
    const result = await getStatusForKey(key);
    // Cache for 5 seconds to reduce DB load from polling (7s interval client-side)
    return NextResponse.json(result, { status: 200, headers: cacheHeaders() });
  } catch (error) {
    logger.error('[ScanStatus] Failed to read status', { error: error as Error, key });
    return NextResponse.json({ error: 'Failed to read status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tokenAuthorized = isTokenAuthorized(req);
  const { tokenRequired } = getTokenConfig();
  let userId: string | undefined;

  if (tokenRequired && !tokenAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!tokenRequired && !tokenAuthorized) {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = user.id;
  }

  const rl = rateLimit(buildRateLimitKey(req, userId ?? getClientIP(req)), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  let key = '';
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    key = typeof body.key === 'string' ? body.key : '';
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }
    const result = await getStatusForKey(key);
    logger.info('[ScanStatus] Read status', { key, status: result.status });
    // Cache for 5 seconds to reduce DB load from polling
    return NextResponse.json(result, { status: 200, headers: cacheHeaders() });
  } catch (error) {
    logger.error('[ScanStatus] Failed to read status', { error: error as Error, key });
    return NextResponse.json({ error: 'Failed to read status' }, { status: 500 });
  }
}
