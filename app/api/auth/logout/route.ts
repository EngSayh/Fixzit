import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  // Build a response and clear all relevant cookies
  const res = NextResponse.json({ ok: true, message: 'Logged out successfully' });

  // Legacy/demo cookies
  res.cookies.set('fxz_role', '', { path: '/', maxAge: 0 });
  res.cookies.set('fxz_lang', '', { path: '/', maxAge: 0 });
  // NextAuth cookies (safe to clear even if not present)
  res.cookies.set('next-auth.session-token', '', { path: '/', maxAge: 0 });
  res.cookies.set('__Secure-next-auth.session-token', '', { path: '/', maxAge: 0 });
  // App auth cookie
  res.cookies.set('fixzit_auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return res;
}
