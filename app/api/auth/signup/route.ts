import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import User from "@/src/server/models/User";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

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
 * Handle POST requests to create a new user account.
 *
 * Validates the request JSON against the signup schema, ensures the email is unique,
 * maps `userType` to an internal role, hashes the password, stores the new user in
 * the database, and returns the created user object with the password removed.
 *
 * The response payloads:
 * - 201: { ok: true, message: "Account created successfully", user: <user without password> }
 * - 400: { error: "An account with this email already exists" } (email taken)
 * - 400: { error: "Invalid input data", details: [...] } (validation errors)
 * - 500: { error: "Internal server error" } (unexpected errors)
 *
 * @param req - Incoming NextRequest whose JSON body must conform to the signup schema
 *               (includes firstName, lastName, email, phone, userType, password,
 *               confirmPassword, termsAccepted, and optional preferences).
 * @returns A NextResponse with the appropriate status and JSON payload described above.
 */
export async function POST(req: NextRequest) {
  try {
    await db();

    const body = signupSchema.parse(await req.json());

    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Determine role based on user type
    let role = "CUSTOMER";
    switch (body.userType) {
      case "corporate":
        role = "CORPORATE_ADMIN";
        break;
      case "vendor":
        role = "VENDOR";
        break;
      default:
        role = "CUSTOMER";
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // Create user
    const userId = nanoid();
    const user = await User.create({
      id: userId,
      firstName: body.firstName,
      lastName: body.lastName,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      companyName: body.companyName || null,
      userType: body.userType,
      role: role,
      password: hashedPassword,
      isActive: true,
      isEmailVerified: false,
      preferences: {
        language: body.preferredLanguage,
        currency: body.preferredCurrency,
        newsletter: body.newsletter || false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Remove password from response
    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;

    return NextResponse.json({
      ok: true,
      message: "Account created successfully",
      user: userWithoutPassword
    }, { status: 201 });

  } catch (error) {
    console.error("Signup error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: "Signup endpoint is working",
    timestamp: new Date().toISOString()
  });
}
