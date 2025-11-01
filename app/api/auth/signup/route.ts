import { NextRequest} from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import User from "@/modules/users/schema";
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
    const body = signupSchema.parse(await req.json());

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
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return duplicateKeyError("An account with this email already exists.");
    }

    // ✅ FIX: Add try/catch around the 'create' to handle race conditions
    let newUser;
    try {
      newUser = await User.create({
        firstName: body.firstName,
        lastName: body.lastName,
        fullName: body.fullName || `${body.firstName} ${body.lastName}`,
        email: normalizedEmail,
        phone: body.phone,
        companyName: companyName,
        role,
        password: hashedPassword,
        termsAccepted: body.termsAccepted,
        newsletter: body.newsletter || false,
        preferredLanguage: body.preferredLanguage,
        preferredCurrency: body.preferredCurrency
      });
    } catch (dbError: any) {
      // Handle database-level unique index violation (catches race condition)
      if (dbError.code === 11000) { 
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
        role: newUser.role}}, 201, req);
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
