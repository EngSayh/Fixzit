import { cookies, headers, type UnsafeUnwrappedCookies, type UnsafeUnwrappedHeaders } from 'next/headers';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { objectIdFrom } from '@/lib/marketplace/objectIds';

export interface MarketplaceRequestContext {
  tenantKey: string;
  orgId: Types.ObjectId;
  userId?: Types.ObjectId;
  role?: string;
  correlationId?: string;
}

async function decodeToken(token?: string | null) {
  if (!token || !process.env.JWT_SECRET) {
    return undefined;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    const correlationId = randomUUID();
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.warn('Failed to decode marketplace JWT payload', { correlationId, message });
    return undefined;
  }
}

function readHeaderValue(req: NextRequest | Request | null | undefined, key: string) {
  if (req) {
    const value = req.headers.get(key);
    if (value) return value;
  }

  try {
    const serverHeaders = (headers() as unknown as UnsafeUnwrappedHeaders);
    return serverHeaders.get(key) ?? undefined;
  } catch (error) {
    const correlationId = randomUUID();
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.debug('Marketplace context header fallback failed', { key, correlationId, message });
    return undefined;
  }
}

function readCookieValue(req: NextRequest | null | undefined, key: string) {
  if (req) {
    const cookie = req.cookies.get(key)?.value;
    if (cookie) return cookie;
  }

  try {
    return (cookies() as unknown as UnsafeUnwrappedCookies).get(key)?.value;
  } catch (error) {
    const correlationId = randomUUID();
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.debug('Marketplace context cookie fallback failed', { key, correlationId, message });
    return undefined;
  }
}

export async function resolveMarketplaceContext(req?: NextRequest | Request | null): Promise<MarketplaceRequestContext> {
  const headerOrg = readHeaderValue(req ?? null, 'x-org-id') || readHeaderValue(req ?? null, 'x-tenant-id');
  const cookieOrg = readCookieValue(req instanceof NextRequest ? req : null, 'fixzit_org')
    || readCookieValue(req instanceof NextRequest ? req : null, 'fixzit_tenant');

  const token = readCookieValue(req instanceof NextRequest ? req : null, 'fixzit_auth');
  const payload: any = await decodeToken(token);

  const tenantKey = (headerOrg || cookieOrg || payload?.tenantId || process.env.MARKETPLACE_DEFAULT_TENANT || 'demo-tenant') as string;
  const orgId = objectIdFrom((payload?.orgId as string | undefined) || tenantKey);
  const userId = payload?.id ? objectIdFrom(payload.id as string) : undefined;
  const role = (payload?.role as string | undefined) || payload?.professional?.role || 'BUYER';

  return {
    tenantKey,
    orgId,
    userId,
    role,
    correlationId: randomUUID(),
  };
}
