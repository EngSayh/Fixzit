import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { connectMongoDB } from "@/lib/database";
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

    let user;

    try {
      // Check if user already exists in PostgreSQL
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email }
      });
      
      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }

      // Create user in PostgreSQL
      user = await prisma.user.create({
        data: {
          email: body.email,
          name: body.fullName,
          role: role as any,
          tenantId: 'demo-tenant', // Default tenant for now
          password: hashedPassword
        }
      });
    } catch (error) {
      console.log('PostgreSQL not available, trying MongoDB...');
      // Fallback to MongoDB
      const mongoDb = await connectMongoDB();
      const usersCollection = mongoDb.collection('users');
      
      // Check if user already exists in MongoDB
      const existingUser = await usersCollection.findOne({ email: body.email });
      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }

      // Create user in MongoDB
      const now = new Date();
      const result = await usersCollection.insertOne({
        email: body.email,
        name: body.fullName,
        role,
        tenantId: 'demo-tenant',
        password: hashedPassword,
        createdAt: now,
        updatedAt: now
      });
      
      // Normalize created user for response (omit password)
      user = {
        _id: result.insertedId,
        email: body.email,
        name: body.fullName,
        role,
        tenantId: 'demo-tenant',
        createdAt: now,
        updatedAt: now
      };
    }

    // Remove password from response
    const { password: _pw, ...userWithoutPassword } = (user || {}) as any;

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
