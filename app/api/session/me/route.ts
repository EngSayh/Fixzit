// app/api/session/me/route.ts - minimal session endpoint for tests (reads fxz_role, fxz_lang)
import { NextResponse } from 'next/server';

/**
 * Retrieves the value of a named cookie from a raw Cookie header string.
 *
 * @param name - The cookie name to look up.
 * @param cookieHeader - The raw "Cookie" header value (e.g., `"a=1; b=2"`). If omitted or empty, the function returns `undefined`.
 * @returns The decoded cookie value if present, otherwise `undefined`.
 */
function readCookie(name: string, cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(/;\s*/);
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return undefined;
}

/**
 * Minimal GET handler that returns a demo session profile based on cookie values.
 *
 * Reads `fxz_role` (defaults to `GUEST`) and `fxz_lang` (defaults to `en`) from the request cookie header,
 * normalizes them, derives `locale` (`ar` or `en`) and text direction (`rtl` or `ltr`), and maps a human-friendly
 * display name for common demo roles. Intended for tests and guest/demo usage.
 *
 * @param request - Incoming Request whose `cookie` header may contain `fxz_role` and `fxz_lang`.
 * @returns A JSON response with the demo session payload:
 * - userId: `'demo-user'`
 * - orgId: `'demo-tenant'`
 * - name: display name derived from role
 * - role: normalized role string
 * - modules: empty array
 * - orgOverrides: empty object
 * - locale: `'ar' | 'en'`
 * - dir: `'rtl' | 'ltr'`
 */
export async function GET(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const fxzRole = (readCookie('fxz_role', cookie) || 'GUEST').toUpperCase();
  const fxzLang = (readCookie('fxz_lang', cookie) || 'en').toLowerCase();

  // Map basic demo users (may be overridden by login page setting cookies)
  let role = fxzRole;
  if (!role) role = 'GUEST';

  const locale = fxzLang === 'ar' ? 'ar' : 'en';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  // Demo name mapping for nicer UI
  const name = role === 'TENANT' ? 'Tenant User' : role === 'TECHNICIAN' ? 'Technician' : role === 'PROPERTY_OWNER' || role === 'MANAGEMENT' ? 'Property Manager' : 'Guest User';

  return NextResponse.json({
    userId: 'demo-user',
    orgId: 'demo-tenant',
    name,
    role,
    modules: [],
    orgOverrides: {},
    locale,
    dir,
  });
}