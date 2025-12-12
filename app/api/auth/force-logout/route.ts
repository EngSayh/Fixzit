/**
 * @description Forces logout by expiring all authentication cookies.
 * Complements NextAuth's signOut handler and ensures httpOnly cookies
 * minted by test helpers are also cleared.
 * @route POST /api/auth/force-logout
 * @access Public - No authentication required
 * @returns {Object} ok: true confirming cookies have been cleared
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Helper function for domain detection (reserved for future secure cookie handling)
function _isIp(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}
export async function POST(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const host = url.hostname;
    const isHttps = url.protocol === 'https:';

    const cookieNames = [
      'authjs.session-token',
      '__Secure-authjs.session-token',
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'authjs.callback-url',
      'next-auth.callback-url',
      'authjs.csrf-token',
      'next-auth.csrf-token',
      'fxz.access',
      'fxz.refresh',
      'fxz.otp',
    ];

    const response = NextResponse.json({ ok: true });
    const expires = new Date(0);

    const domains = [undefined, host].filter(Boolean) as (string | undefined)[];

    for (const name of cookieNames) {
      const secure = name.startsWith('__Secure-') || isHttps;
      const baseOptions = {
        path: '/',
        httpOnly: true,
        sameSite: 'lax' as const,
        secure,
        expires,
      };

      for (const domain of domains) {
        response.cookies.set(name, '', {
          ...baseOptions,
          ...(domain ? { domain } : {}),
        });
      }
    }

    return response;
  } catch (_error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
