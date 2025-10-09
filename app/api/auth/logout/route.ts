import { NextRequest} from 'next/server';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logs out the current user by clearing the authentication cookie. No body required.
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Rate limit exceeded - Maximum 20 requests per 1 minute"
 */
export async function POST(req: NextRequest) {
  // Rate limiting: 20 req/min for logout
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`auth-logout:${clientIp}`, 20, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const response = createSecureResponse({ ok: true, message: 'Logged out successfully' }, 200, req);
  
  // Clear the auth cookie
  response.cookies.set('fixzit_auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'});
  
  return response;
}
