// app/api/session/me/route.ts - minimal session endpoint for tests (reads fxz_role, fxz_lang)
import { NextResponse } from 'next/server';

function readCookie(name: string, cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(/;\s*/);
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return undefined;
}

// Lightweight cookie-based session for tests and guest
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