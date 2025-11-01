import { NextRequest} from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

// ✅ FIX: Use the same robust LoginSchema from the primary login route
// Build one normalized payload: { loginIdentifier, loginType, password, rememberMe }
const LoginSchema = z
  .object({
    email: z.string().email().optional(),
    employeeNumber: z.string().optional(),
    identifier: z.string().trim().min(1).optional(),
    password: z.string().min(1, 'Password is required'),
    loginType: z.enum(['personal', 'corporate']).optional(),
    rememberMe: z.boolean().optional().default(false), // This field will be ignored by this route, but keeps payload consistent
  })
  .transform((data, ctx) => {
    // If identifier present, auto-detect. Else honor legacy fields.
    const idRaw = data.identifier?.trim();
    const emailOk = idRaw ? z.string().email().safeParse(idRaw).success : false;
    const empUpper = idRaw?.toUpperCase();
    const empOk = !!empUpper && /^EMP\d+$/.test(empUpper);

    let loginIdentifier = '';
    let loginType: 'personal' | 'corporate';

    if (idRaw) {
      if (emailOk) {
        loginIdentifier = idRaw.toLowerCase();
        loginType = 'personal';
      } else if (empOk) {
        loginIdentifier = empUpper!;
        loginType = 'corporate';
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['identifier'],
          message: 'Enter a valid email address or employee number (e.g., EMP001)',
        });
        return z.NEVER;
      }
    } else {
      // Legacy path (keep for compatibility if needed)
      const legacyType =
        data.loginType ?? (data.employeeNumber ? 'corporate' : 'personal');
      if (legacyType === 'personal') {
        if (!data.email) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Email is required' });
          return z.NEVER;
        }
        loginIdentifier = data.email.toLowerCase();
      } else {
        if (!data.employeeNumber) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['employeeNumber'], message: 'Employee number is required' });
          return z.NEVER;
        }
        loginIdentifier = data.employeeNumber.toUpperCase();
      }
      loginType = legacyType;
    }

    return {
      loginIdentifier,
      loginType,
      password: data.password,
      rememberMe: data.rememberMe === true,
    };
  });

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
    const clientIp = getClientIP(req);

    // ----- Safe JSON parse -----
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return createSecureResponse(
        { ok: false, error: 'Invalid JSON payload' },
        400,
        req
      );
    }

    // ----- Validate & normalize -----
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return zodValidationError(parsed.error);
    }
    // Note: We ignore 'rememberMe' as this is a session-only route
    const { loginIdentifier, loginType, password } = parsed.data;

    // ----- ✅ FIX: Dual Rate limit: per-IP AND per-identifier -----
    const ipGate = rateLimit(`auth-login:ip:${clientIp}`, 5, 15 * 60 * 1000);
    if (!ipGate.allowed) return rateLimitError();

    const idGate = rateLimit(`auth-login:id:${loginType}:${loginIdentifier}`, 5, 15 * 60 * 1000);
    if (!idGate.allowed) return rateLimitError();

    // ----- Authenticate -----
    const result = await authenticateUser(
      loginIdentifier, password, loginType
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
