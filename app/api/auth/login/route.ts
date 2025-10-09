import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const LoginSchema = z.object({
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
 * /api/auth/login:
 *   post:
 *     summary: User authentication
 *     description: Authenticates users via email (personal) or employee number (corporate). Returns JWT token and sets secure HTTP-only cookie.
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
 *         description: Authentication successful
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`auth-login:${clientIp}`, 5, 900);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const body = await req.json();
    const validatedData = LoginSchema.parse(body);

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

    response.cookies.set('fixzit_auth', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return zodValidationError(error);
    }
    return handleApiError(error);
  }
}
