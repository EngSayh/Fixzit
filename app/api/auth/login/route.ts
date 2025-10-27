import { NextRequest } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/server/security/rateLimit';
import {
  unauthorizedError,
  zodValidationError,
  rateLimitError,
  handleApiError,
} from '@/server/utils/errorResponses';
import { createSecureResponse, getClientIP } from '@/server/security/headers';

// Build one normalized payload: { loginIdentifier, loginType, password, rememberMe }
const LoginSchema = z
  .object({
    email: z.string().email().optional(),
    employeeNumber: z.string().optional(),
    identifier: z.string().trim().min(1).optional(),
    password: z.string().min(1, 'Password is required'),
    loginType: z.enum(['personal', 'corporate']).optional(),
    rememberMe: z.boolean().optional().default(false),
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
      // Legacy path
      const legacyType =
        data.loginType ?? (data.employeeNumber ? 'corporate' : 'personal');
      if (legacyType === 'personal') {
        if (!data.email) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'Email is required',
          });
          return z.NEVER;
        }
        loginIdentifier = data.email.toLowerCase();
      } else {
        if (!data.employeeNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['employeeNumber'],
            message: 'Employee number is required',
          });
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
 * /api/auth/login:
 *   post:
 *     summary: User authentication
 *     description: Authenticates users via unified identifier (email or employee number) or legacy fields. Auto-detects login type. Returns JWT token and sets secure HTTP-only cookie.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               identifier: { type: string, example: "user@example.com or EMP001" }
 *               email: { type: string, format: email }
 *               employeeNumber: { type: string, example: "EMP001" }
 *               password: { type: string, format: password, example: "SecurePass123!" }
 *               loginType: { type: string, enum: [personal, corporate] }
 *               rememberMe: { type: boolean, default: false }
 *     responses:
 *       200: { description: Authentication successful }
 *       400: { description: Validation error }
 *       401: { description: Invalid credentials }
 *       429: { description: Rate limit exceeded }
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
    const { loginIdentifier, loginType, password, rememberMe } = parsed.data;

    // ----- Rate limit: per-IP AND per-identifier -----
    const ipGate = rateLimit(`auth-login:ip:${clientIp}`, 5, 15 * 60 * 1000);
    if (!ipGate.allowed) return rateLimitError();

    const idGate = rateLimit(
      `auth-login:id:${loginType}:${loginIdentifier}`,
      5,
      15 * 60 * 1000
    );
    if (!idGate.allowed) return rateLimitError();

    // ----- Authenticate -----
    const result = await authenticateUser(loginIdentifier, password, loginType);

    // Uniform failure (no user enumeration)
    if (!('token' in result) || !result.token) {
      return unauthorizedError('Invalid credentials');
    }

    // ----- Success -----
    const res = createSecureResponse(
      { ok: true, token: result.token, user: result.user },
      200,
      req
    );

    // Session duration
    const defaultDuration = parseInt(process.env.SESSION_DURATION || '86400', 10); // 24h
    const rememberDuration = parseInt(
      process.env.SESSION_REMEMBER_DURATION || '2592000',
      10
    ); // 30d
    const maxAge = rememberMe ? rememberDuration : defaultDuration;

    res.cookies.set('fixzit_auth', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return res;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error);
    }
    return handleApiError(error);
  }
}
