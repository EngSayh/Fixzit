import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import User from "@/modules/users/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { rateLimit } from '@/server/security/rateLimit';
import { zodValidationError, rateLimitError, duplicateKeyError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  fullName: z.string(),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  companyName: z.string().optional(),
  userType: z.enum(["personal", "corporate", "vendor"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
  newsletter: z.boolean().optional(),
  preferredLanguage: z.string().default("en"),
  preferredCurrency: z.string().default("SAR"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

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
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`auth-signup:${clientIp}`, 5, 900);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await connectToDatabase();
    const body = signupSchema.parse(await req.json());

    let role = "TENANT";
    switch (body.userType) {
      case "corporate":
        role = "CORPORATE_ADMIN";
        break;
      case "vendor":
        role = "VENDOR";
        break;
      default:
        role = "TENANT";
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);
    const existingUser = await User.findOne({ email: body.email });
    
    if (existingUser) {
      return duplicateKeyError();
    }

    const newUser = await User.create({
      firstName: body.firstName,
      lastName: body.lastName,
      fullName: body.fullName || `${body.firstName} ${body.lastName}`,
      email: body.email,
      phone: body.phone,
      companyName: body.companyName,
      role,
      password: hashedPassword,
      termsAccepted: body.termsAccepted,
      newsletter: body.newsletter || false,
      preferredLanguage: body.preferredLanguage,
      preferredCurrency: body.preferredCurrency,
    });

    return createSecureResponse({
      ok: true,
      message: "User created successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
    }, 201, req);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return zodValidationError(error);
    }
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  return createSecureResponse({ ok: true, message: "Signup endpoint is active" }, 200, req);
}
