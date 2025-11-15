import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { User } from '@/server/models/User';
import { getNextAtomicUserCode } from '@/lib/mongoUtils.server';
import { z } from "zod";
import bcrypt from "bcryptjs";
import { rateLimit } from '@/server/security/rateLimit';
import { zodValidationError, rateLimitError, duplicateKeyError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  fullName: z.string().optional(), // ✅ FIX: Mark fullName as optional
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  companyName: z.string().optional(),
  userType: z.enum(["personal", "corporate", "vendor"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
  newsletter: z.boolean().optional(),
  preferredLanguage: z.string().default("en"),
  preferredCurrency: z.string().default("SAR")}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]});

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: User registration
 *     description: Creates new user account for personal, corporate, or vendor types
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - userType
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               userType:
 *                 type: string
 *                 enum: [personal, corporate, vendor]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error or duplicate user
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIP(req);
    const rl = rateLimit(`auth-signup:${clientIp}`, 5, 900000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await connectToDatabase();
    
    // Parse and validate JSON body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (_jsonError) {
      return zodValidationError({
        issues: [{ path: ['body'], message: 'Invalid JSON in request body' }]
      } as z.ZodError);
    }
    
    const body = signupSchema.parse(requestBody);

    // 🛑 SECURITY FIX: Public signup MUST NOT be able to set admin roles.
    // The 'userType' from the client is only a hint for data categorization.
    // The 'role' assigned is ALWAYS the lowest-privilege personal user.
    // Admin/Vendor accounts must be created via an internal, authenticated admin endpoint.
    const role = "TENANT";

    // Only store companyName if the user self-identifies as corporate/vendor
    const companyName = (body.userType === 'corporate' || body.userType === 'vendor')
      ? body.companyName
      : undefined;

    const normalizedEmail = body.email.toLowerCase();
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // ✅ FIX: Pre-check for existing user (good for a fast, clean error)
    // @ts-expect-error - Mongoose 8.x type resolution issue with conditional model export
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return duplicateKeyError("An account with this email already exists.");
    }

    // Generate unique user code atomically (race-condition safe)
    const code = await getNextAtomicUserCode();
    const fullName = body.fullName || `${body.firstName} ${body.lastName}`;
    
    // Get or create organization for new user
    // For public signups, use default PUBLIC org or create personal org
    const defaultOrgId = process.env.PUBLIC_ORG_ID || 'ORG-00000001'; // Default public org

    // ✅ FIX: Add try/catch around the 'create' to handle race conditions
    let newUser;
    try {
      // Use nested User model schema from @/server/models/User
      // @ts-expect-error - Mongoose 8.x type resolution issue with conditional model export
      newUser = await User.create({
        orgId: defaultOrgId, // Required by tenant isolation plugin
        code,
        username: code, // Use unique code as username (no more conflicts)
        email: normalizedEmail,
        password: hashedPassword,
        phone: body.phone,
        personal: {
          firstName: body.firstName,
          lastName: body.lastName,
          fullName: fullName,
        },
        professional: {
          role,
        },
        security: {
          lastLogin: new Date(),
          accessLevel: 'READ',
          permissions: [],
        },
        preferences: {
          language: body.preferredLanguage || 'ar',
          timezone: 'Asia/Riyadh',
          notifications: {
            email: true,
            sms: false,
            app: true,
          },
        },
        status: 'ACTIVE',
        customFields: {
          companyName,
          termsAccepted: body.termsAccepted,
          newsletter: body.newsletter || false,
          preferredCurrency: body.preferredCurrency || 'SAR',
          authProvider: 'credentials',
        },
      });
    } catch (dbError: unknown) {
      // 🔒 TYPE SAFETY: Handle MongoDB duplicate key error with type guard
      if (dbError && typeof dbError === 'object' && 'code' in dbError && (dbError as { code: number }).code === 11000) { 
        return duplicateKeyError("An account with this email already exists.");
      }
      // Re-throw other unexpected database errors
      throw dbError;
    }

    return createSecureResponse({
      ok: true,
      message: "User created successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.professional.role,
      }
    }, 201, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error);
    }
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  return createSecureResponse({ ok: true, message: "Signup endpoint is active" }, 200, req);
}
