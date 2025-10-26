import { NextRequest} from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

const LoginSchema = z.object({
  // Support both legacy fields and new unified identifier
  email: z.string().email().optional(),
  employeeNumber: z.string().optional(),
  identifier: z.string().min(1).optional(),
  password: z.string().min(1, 'Password is required'),
  loginType: z.enum(['personal', 'corporate']).optional(),
  rememberMe: z.boolean().optional().default(false)
}).refine(
  (data) => {
    // New unified identifier flow
    if (data.identifier) {
      return true;
    }
    // Legacy flow: require email or employeeNumber based on loginType
    return data.loginType === 'personal' ? !!data.email : !!data.employeeNumber;
  },
  { message: 'Email, employee number, or identifier is required' }
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: User authentication
 *     description: Authenticates users via unified identifier (email or employee number) or legacy email/employeeNumber fields. Auto-detects login type. Returns JWT token and sets secure HTTP-only cookie.
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
 *               identifier:
 *                 type: string
 *                 description: Unified field accepting email or employee number (auto-detected)
 *                 example: "user@example.com or EMP001"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Legacy field for personal login
 *                 example: "user@example.com"
 *               employeeNumber:
 *                 type: string
 *                 description: Legacy field for corporate login
 *                 example: "EMP001"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass123!"
 *               loginType:
 *                 type: string
 *                 enum: [personal, corporate]
 *                 description: Legacy field, auto-detected if using identifier
 *               rememberMe:
 *                 type: boolean
 *                 description: Extend session to 30 days instead of 24 hours
 *                 default: false
 *     responses:
 *       200:
 *         description: Authentication successful
 *       400:
 *         description: Invalid identifier format or validation error
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIP(req);
    const rl = rateLimit(`auth-login:${clientIp}`, 5, 900000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const body = await req.json();
    const validatedData = LoginSchema.parse(body);

    // Auto-detect login type from identifier
    let loginIdentifier: string;
    let loginType: 'personal' | 'corporate';

    if (validatedData.identifier) {
      // New unified flow: auto-detect based on format
      const trimmedIdentifier = validatedData.identifier.trim();
      const isEmail = trimmedIdentifier.includes('@');
      const isEmployeeNumber = /^EMP\d+$/i.test(trimmedIdentifier);

      if (isEmail) {
        loginIdentifier = trimmedIdentifier;
        loginType = 'personal';
      } else if (isEmployeeNumber) {
        loginIdentifier = trimmedIdentifier.toUpperCase();
        loginType = 'corporate';
      } else {
        // Return field-specific error
        return createSecureResponse({
          ok: false,
          error: 'Invalid identifier format',
          fieldErrors: {
            identifier: 'Enter a valid email address or employee number (e.g., EMP001)'
          }
        }, 400, req);
      }
    } else {
      // Legacy flow: use email or employeeNumber based on loginType
      loginType = validatedData.loginType || 'personal';
      loginIdentifier = loginType === 'corporate' 
        ? validatedData.employeeNumber! 
        : validatedData.email!;
    }

    const result = await authenticateUser(
      loginIdentifier,
      validatedData.password,
      loginType
    );

    if (!('token' in result) || !result.token) {
      return unauthorizedError('Invalid credentials');
    }

    const response = createSecureResponse({
      ok: true,
      token: result.token,
      user: result.user
    }, 200, req);

    // Get session duration from request (rememberMe flag) or use environment defaults
    const rememberMe = body.rememberMe === true;
    const defaultDuration = parseInt(process.env.SESSION_DURATION || '86400', 10); // 24 hours default
    const rememberDuration = parseInt(process.env.SESSION_REMEMBER_DURATION || '2592000', 10); // 30 days default
    const sessionDuration = rememberMe ? rememberDuration : defaultDuration;

    response.cookies.set('fixzit_auth', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionDuration,
      path: '/'});

    return response;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error);
    }
    return handleApiError(error);
  }
}
