import { NextResponse } from 'next/server';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/config';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/i18n:
 *   get:
 *     summary: i18n operations
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = body?.locale as Locale | undefined;

  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
    return createSecureResponse({ ok: false }, 400, req);
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

