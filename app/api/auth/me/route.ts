import { NextRequest} from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, rateLimitError, internalServerError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the profile information of the currently authenticated user. Requires valid JWT token in cookie or Authorization header.
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "user@example.com"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     role:
 *                       type: string
 *                       enum: [SUPER_ADMIN, ADMIN, MANAGER, USER, TENANT, VENDOR]
 *                       example: "USER"
 *                     tenantId:
 *                       type: string
 *                       example: "tenant-123"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting: 60 req/min for read operations
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`auth-me:${clientIp}`, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Get token from cookie or header
    const cookieToken = req.cookies.get('fixzit_auth')?.value;
    const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (!token) {
      return unauthorizedError('Missing authentication token');
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return unauthorizedError('Invalid or expired token');
    }

    return createSecureResponse({ ok: true, user }, 200, req);
  } catch (error: unknown) {
    // Distinguish authentication errors from other errors
    if (
      error &&
      typeof error === 'object' &&
      ('status' in error && error.status === 401 ||
       'code' in error && error.code === 'UNAUTHORIZED' ||
       'type' in error && error.type === 'auth')
    ) {
      return unauthorizedError('Invalid or expired token');
    }
    // For all other errors, log and return internal server error
    console.error('Get current user error:', error);
    return internalServerError('Internal server error', error);
  }
}
