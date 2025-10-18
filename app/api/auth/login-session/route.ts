import { NextRequest} from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const SessionLoginSchema = z.object({
  email: z.string().email().optional(),
  employeeNumber: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
  loginType: z.enum(['personal', 'corporate']).default('personal')
}).refine(
  (data) => data.loginType === 'personal' ? !!data.email : !!data.employeeNumber,
  { message: 'Email required for personal login or employee number for corporate login' }
);

/**
 * @openapi
 * /api/auth/login-session:
 *   post:
 *     summary: Session-only user authentication
 *     description: |
 *       Authenticates users and creates a session cookie that expires when the browser closes.
 *       Use this endpoint for temporary sessions where persistence is not desired.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               employeeNumber:
 *                 type: string
 *                 example: "EMP001"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass123!"
 *               loginType:
 *                 type: string
 *                 enum: [personal, corporate]
 *                 default: personal
 *     responses:
 *       200:
 *         description: Authentication successful (session cookie set)
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`auth-login-session:${clientIp}`, 5, 900);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const body = await req.json();
    const validatedData = SessionLoginSchema.parse(body);

    const result = await authenticateUser(
      validatedData.loginType === 'corporate' ? validatedData.employeeNumber! : validatedData.email!,
      validatedData.password,
      validatedData.loginType
    );

    if (!('token' in result) || !result.token) {
      return unauthorizedError('Invalid credentials');
    }

    const response = createSecureResponse({
      ok: true,
      token: result.token,
      user: result.user
    }, 200, req);

    // Session cookie - expires when browser closes (no maxAge specified)
    response.cookies.set('fixzit_auth', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
      // Note: No maxAge = session cookie (expires when browser closes)
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error);
    }
    return handleApiError(error);
  }
}
