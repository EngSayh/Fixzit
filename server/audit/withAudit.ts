'use server';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AuditLogModel } from '@/server/models/AuditLog';
import { logger } from '@/lib/logger';

export interface AuditConfig {
  enabled: boolean;
  excludePaths?: string[];
  excludeMethods?: string[];
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  maxBodyBytes?: number; // default 64kb
  maskFields?: string[]; // default mask list
  source?: 'WEB' | 'API' | 'SYSTEM';
}

/** Sensible defaults */
const defaultConfig: AuditConfig = {
  enabled: true,
  excludePaths: [
    '/api/health',
    '/api/ping',
    '/_next',
    '/static',
    '/favicon',
    '/api/_next',
  ],
  excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
  logRequestBody: false,
  logResponseBody: false,
  maxBodyBytes: 64 * 1024,
  maskFields: [
    'password',
    'pass',
    'currentPassword',
    'newPassword',
    'token',
    'auth',
    'secret',
    'authorization',
  ],
  source: 'WEB',
};

/** Core: audit wrapper around any Next Route Handler */
export function withAudit<
  // eslint-disable-next-line no-unused-vars
  H extends (req: NextRequest, ...args: unknown[]) => Promise<NextResponse> | NextResponse,
>(handler: H, cfg?: Partial<AuditConfig>) {
  const finalCfg = { ...defaultConfig, ...cfg };

  return (async function auditedHandler(req: NextRequest, ...args: unknown[]) {
    // Early exits by config
    if (!finalCfg.enabled) return handler(req, ...args);

    const method = req.method.toUpperCase();
    const pathname = req.nextUrl.pathname || '/';

    if (finalCfg.excludeMethods?.includes(method)) {
      return handler(req, ...args);
    }
    if (finalCfg.excludePaths?.some(p => pathname.startsWith(p))) {
      return handler(req, ...args);
    }

    // Auth context (do not block request if auth fails)
    let session: { user: Record<string, unknown> } | null = null;
    try {
      const authResult = await auth();
      if (authResult && 'user' in authResult) {
        session = authResult as { user: Record<string, unknown> };
      }
    } catch {
      /* ignore */
    }

    // Skip auditing if anonymous (adjust if you want to log anonymous)
    if (!session?.user) {
      return handler(req, ...args);
    }

    // Build base audit payload
    const started = performance.now?.() ?? Date.now();
    const userAgent = req.headers.get('user-agent') || '';
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const requestId =
      req.headers.get('x-request-id') ||
      crypto.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const action = getActionType(method, pathname);
    const entityType = getEntityType(pathname);
    const entityId = extractEntityId(pathname);

    // Optionally capture the request body safely (cloned)
    let requestBody: unknown | undefined = undefined;
    if (finalCfg.logRequestBody && shouldLogBody(req)) {
      try {
        requestBody = await readAndMaskRequestBody(
          req,
          finalCfg.maxBodyBytes!,
          finalCfg.maskFields!,
        );
      } catch {
        requestBody = '[unavailable]';
      }
    }

    let res: NextResponse | undefined;
    try {
      res = await handler(req, ...args);
      return res;
    } finally {
      // Optional response body (cloned)
      let responseBody: unknown | undefined = undefined;
      if (res && finalCfg.logResponseBody && shouldLogResponse(res)) {
        try {
          responseBody = await readResponseText(res, finalCfg.maxBodyBytes!);
        } catch {
          responseBody = '[unavailable]';
        }
      }

      // Assemble and fire audit log
      try {
        const duration = (performance.now?.() ?? Date.now()) - started;
        const status = res?.status ?? 0;
        const success = status >= 200 && status < 400;

        const auditData = {
          orgId: (session!.user.orgId as string) || 'default',
          action,
          entityType,
          entityId,
          userId: (session!.user.id as string) || (session!.user.email as string) || 'unknown',
          userName: (session!.user.name as string) || 'Unknown User',
          userEmail: (session!.user.email as string) || '',
          userRole: (session!.user.role as string) || 'USER',
          correlationId: requestId,
          context: {
            method,
            endpoint: pathname,
            userAgent,
            ipAddress,
            sessionId: session!.user.sessionId as string,
            browser: extractBrowser(userAgent),
            os: extractOS(userAgent),
            device: extractDevice(userAgent),
            requestId,
          },
          metadata: {
            source: finalCfg.source,
            requestBody,
            responseBody, // keep small!
          },
          result: {
            success,
            duration: Math.round(duration),
            errorCode: success ? undefined : String(status),
          },
        };

        await AuditLogModel.log(auditData);
      } catch (err) {
        // never break the API
        logger.error('Failed to log audit entry', { error: err });
      }
    }
  }) as H;
}

/* ----------------------- Helpers ----------------------- */

function getActionType(method: string, path: string): string {
  if (method === 'GET') return 'READ';
  if (method === 'POST') {
    const p = path.toLowerCase();
    if (p.includes('/login')) return 'LOGIN';
    if (p.includes('/logout')) return 'LOGOUT';
    if (p.includes('/upload')) return 'UPLOAD';
    if (p.includes('/export')) return 'EXPORT';
    if (p.includes('/import')) return 'IMPORT';
    return 'CREATE';
  }
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  return 'CUSTOM';
}

function getEntityType(path: string): string {
  const segs = path.split('/').filter(Boolean);
  const i = segs.indexOf('api');
  const entity = i >= 0 && segs.length > i + 1 ? segs[i + 1].toUpperCase() : '';
  const map: Record<string, string> = {
    PROPERTIES: 'PROPERTY',
    TENANTS: 'TENANT',
    OWNERS: 'OWNER',
    CONTRACTS: 'CONTRACT',
    PAYMENTS: 'PAYMENT',
    INVOICES: 'INVOICE',
    WORKORDERS: 'WORKORDER',
    WORK_ORDERS: 'WORKORDER',
    TICKETS: 'TICKET',
    PROJECTS: 'PROJECT',
    BIDS: 'BID',
    VENDORS: 'VENDOR',
    USERS: 'USER',
    DOCUMENTS: 'DOCUMENT',
    SETTINGS: 'SETTING',
    AUTH: 'AUTH',
  };
  return map[entity] || (entity || 'OTHER');
}

function extractEntityId(path: string): string | undefined {
  const segs = path.split('/').filter(Boolean);
  const i = segs.indexOf('api');
  if (i >= 0 && segs.length > i + 2) {
    const id = segs[i + 2];
    // ObjectId, UUID v4, numeric
    if (/^[0-9a-fA-F]{24}$/.test(id)) return id;
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    )
      return id;
    if (/^\d+$/.test(id)) return id;
    if (id.length > 8 && !id.includes('.')) return id;
  }
  return undefined;
}

function extractBrowser(ua: string): string {
  const s = ua || '';
  if (s.includes('Edg/')) return 'Edge';
  if (s.includes('Chrome/')) return 'Chrome';
  if (s.includes('Firefox/')) return 'Firefox';
  if (s.includes('Safari/') && !s.includes('Chrome/')) return 'Safari';
  if (s.includes('Opera') || s.includes('OPR/')) return 'Opera';
  return 'Unknown';
}

function extractOS(ua: string): string {
  const s = ua || '';
  if (s.includes('Windows')) return 'Windows';
  if (s.includes('Mac OS X') || s.includes('Macintosh')) return 'macOS';
  if (s.includes('Linux')) return 'Linux';
  if (s.includes('Android')) return 'Android';
  if (s.includes('like Mac OS X') || s.includes('iPhone') || s.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function extractDevice(ua: string): string {
  const s = ua || '';
  if (/Mobile|iPhone|Android/.test(s)) return 'Mobile';
  if (/iPad|Tablet/.test(s)) return 'Tablet';
  return 'Desktop';
}

/* ----- Body helpers (safe) ----- */

function shouldLogBody(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  if (!ct) return false;
  // avoid binary/multipart
  if (/multipart\/form-data/i.test(ct) || /octet-stream/i.test(ct)) return false;
  // optionally skip auth bodies regardless
  if (req.nextUrl.pathname.toLowerCase().includes('/api/auth/login')) return false;
  return true;
}

function shouldLogResponse(res: NextResponse) {
  const ct = res.headers.get('content-type') || '';
  if (!ct) return false;
  if (/application\/json/i.test(ct) || /text\//i.test(ct)) return true;
  return false;
}

async function readAndMaskRequestBody(
  req: NextRequest,
  maxBytes: number,
  maskFields: string[],
): Promise<unknown> {
  try {
    const cloned = req.clone();
    const text = await cloned.text();
    if (!text) return undefined;
    const slice = text.length > maxBytes ? text.slice(0, maxBytes) + '…[truncated]' : text;
    try {
      const json = JSON.parse(slice);
      return maskObject(json, new Set(maskFields.map(k => k.toLowerCase())));
    } catch {
      // non-JSON body
      return slice;
    }
  } catch {
    return undefined;
  }
}

async function readResponseText(res: NextResponse, maxBytes: number): Promise<string | undefined> {
  try {
    const cloned = res.clone();
    const text = await cloned.text();
    if (!text) return undefined;
    return text.length > maxBytes ? text.slice(0, maxBytes) + '…[truncated]' : text;
  } catch {
    return undefined;
  }
}

function maskObject(obj: unknown, maskKeys: Set<string>): unknown {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => maskObject(v, maskKeys));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (maskKeys.has(k.toLowerCase())) {
      out[k] = '***';
    } else {
      out[k] = typeof v === 'object' ? maskObject(v, maskKeys) : v;
    }
  }
  return out;
}
