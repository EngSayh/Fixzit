/**
 * CORS Helper for Fixzit API Routes
 * 
 * Runtime-only CORS handling (no global Next.js config conflicts)
 * Supports credentials, dynamic origins, and proper preflight responses
 * 
 * @example
 * import { cors, preflight } from '@/lib/cors';
 * 
 * export async function OPTIONS(req: Request) {
 *   return preflight(req) ?? new NextResponse(null, { status: 204 });
 * }
 * 
 * export async function GET(req: Request) {
 *   const res = NextResponse.json({ data: 'example' });
 *   cors(req, res);
 *   return res;
 * }
 */

import { NextResponse } from 'next/server';

const DEFAULT_ORIGINS = process.env.NODE_ENV !== 'production'
  ? ['http://localhost:3000', 'http://127.0.0.1:3000']
  : [];

const ALLOWED_ORIGINS = [
  ...DEFAULT_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []),
].filter(Boolean);

/**
 * Apply CORS headers to a response
 * Only sets headers if origin is in the allowlist
 * 
 * @param req - Incoming request (to check origin)
 * @param res - Response to modify
 */
export function cors(req: Request, res: NextResponse): void {
  const origin = req.headers.get('origin') ?? '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  
  if (allow) {
    res.headers.set('Access-Control-Allow-Origin', allow);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, X-Requested-With, Cookie'
    );
    res.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
}

/**
 * Handle OPTIONS preflight requests
 * Returns a 204 response with CORS headers if method is OPTIONS
 * Returns null otherwise (let route handler continue)
 * 
 * @param req - Incoming request
 * @returns NextResponse for OPTIONS, null otherwise
 */
export function preflight(req: Request): NextResponse | null {
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    cors(req, res);
    return res;
  }
  return null;
}
