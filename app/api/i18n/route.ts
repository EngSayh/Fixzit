import { NextResponse } from 'next/server';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/config';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = body?.locale as Locale | undefined;

  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Persist the locale choice in a cookie so the middleware and layout can read it
  const response = NextResponse.json({ ok: true });
  response.cookies.set('locale', locale, {
    path: '/',
    sameSite: 'lax',
  });
  response.cookies.set('fxz.lang', locale, {
    path: '/',
    sameSite: 'lax',
  });
  response.cookies.set('fxz.locale', locale === 'ar' ? 'ar-SA' : 'en-GB', {
    path: '/',
    sameSite: 'lax',
  });
  return response;
}

