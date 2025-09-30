import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/src/lib/mongodb-unified";
import { User } from "@/src/server/models/User";
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

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = signupSchema.parse(await req.json());

    // Determine role based on user type
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

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Create user in MongoDB
    const user = await User.create({
      email: body.email,
      name: body.fullName,
      role,
      tenantId: 'demo-tenant', // Default tenant for now
      password: hashedPassword,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      companyName: body.companyName,
      userType: body.userType,
      newsletter: body.newsletter || false,
      preferredLanguage: body.preferredLanguage || 'en',
      preferredCurrency: body.preferredCurrency || 'SAR',
      termsAccepted: body.termsAccepted,
      isActive: true,
      emailVerified: false,
    });

    // Remove password from response
    const { password: _pw, ...userWithoutPassword } = user.toObject();

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

