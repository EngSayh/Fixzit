import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "@/server/models/User";
import { db } from "@/lib/mongo";
import { getJWTSecret as getJWTSecretService } from "@/lib/secrets";

// Type definition for User document - used as documentation reference

interface _UserDocument {
  _id: { toString(): string }; // MongoDB native _id field
  email: string;
  password: string; // Changed from passwordHash
  isActive?: boolean;
  status?: string;
  role?: string;
  orgId?: { toString(): string } | string;
  name?: string;
  personal?: {
    // Changed from personalInfo
    firstName?: string;
    lastName?: string;
  };
  professional?: {
    // Changed from professionalInfo
    role?: string;
  };
  [key: string]: unknown; // Allow additional fields
}

/**
 * SECURITY IMPROVEMENT: JWT secret management with AWS Secrets Manager
 *
 * Priority order:
 * 1. AWS Secrets Manager (production, cached for 5 minutes)
 * 2. JWT_SECRET environment variable (all environments)
 * 3. Ephemeral secret (development only)
 *
 * This ensures:
 * - Production secrets are never hardcoded
 * - Secrets can be rotated without code changes
 * - Development doesn't require AWS credentials
 * - Secrets are cached to avoid repeated AWS API calls (5-min TTL in secrets.ts)
 * - Secret rotation propagates within 5 minutes (no indefinite process cache)
 */
async function getJWTSecret(): Promise<string> {
  // Delegate to secrets service - full priority logic encapsulated there:
  // 1. AWS Secrets Manager (production, 5-min TTL cache)
  // 2. JWT_SECRET environment variable
  // 3. Ephemeral secret (development only)
  return await getJWTSecretService();
}

export interface AuthToken {
  id: string;
  email: string;
  role: string;
  orgId: string;
  tenantId?: string;
  name?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function generateToken(payload: AuthToken): Promise<string> {
  const secret = await getJWTSecret();
  return jwt.sign(payload, secret, { expiresIn: "24h", algorithm: "HS256" });
}

export async function verifyToken(token: string): Promise<AuthToken | null> {
  try {
    const secret = await getJWTSecret();
    return jwt.verify(token, secret) as AuthToken;
  } catch {
    return null;
  }
}

export async function authenticateUser(
  emailOrEmployeeNumber: string,
  password: string,
  loginType: "personal" | "corporate" = "personal",
) {
  // Ensure database connection is established
  await db;

  let user;
  if (loginType === "personal") {
    user = await User.findOne({ email: emailOrEmployeeNumber });
  } else {
    // For corporate login, search by employee number (username field)
    user = await User.findOne({ username: emailOrEmployeeNumber });
  }

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // Check if user is active (handle both status and isActive fields)
  type UserDoc = {
    isActive?: boolean;
    status?: string;
    _id: unknown;
    email: string;
    professional?: { role?: string };
    role?: string;
    orgId?: unknown;
    personal?: { firstName?: string; lastName?: string };
  };
  const userDoc: UserDoc =
    typeof user.toObject === "function"
      ? (user.toObject() as UserDoc)
      : (user as unknown as UserDoc);
  const isUserActive =
    userDoc.isActive !== undefined
      ? userDoc.isActive
      : userDoc.status === "ACTIVE";
  if (!isUserActive) {
    throw new Error("Account is not active");
  }

  const token = await generateToken({
    id: user._id.toString(),
    email: user.email,
    role: userDoc.professional?.role || userDoc.role || "USER",
    orgId:
      typeof userDoc.orgId === "string"
        ? userDoc.orgId
        : userDoc.orgId?.toString() || "",
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: `${userDoc.personal?.firstName || ""} ${userDoc.personal?.lastName || ""}`.trim(),
      role: userDoc.professional?.role || userDoc.role || "USER",
      orgId:
        typeof userDoc.orgId === "string"
          ? userDoc.orgId
          : userDoc.orgId?.toString() || "",
    },
  };
}

export async function getUserFromToken(token: string) {
  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  // Database connection handled by model layer
  const user = await User.findById(payload.id);

  if (!user) {
    return null;
  }

  type UserDoc = {
    status?: string;
    _id: unknown;
    email: string;
    professional?: { role?: string };
    role?: string;
    orgId?: unknown;
    personal?: { firstName?: string; lastName?: string };
  };
  const userDoc: UserDoc =
    typeof user.toObject === "function"
      ? (user.toObject() as UserDoc)
      : (user as unknown as UserDoc);

  if (userDoc.status !== "ACTIVE") {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: `${userDoc.personal?.firstName || ""} ${userDoc.personal?.lastName || ""}`.trim(),
    role: userDoc.professional?.role || userDoc.role || "USER",
    orgId:
      typeof userDoc.orgId === "string"
        ? userDoc.orgId
        : userDoc.orgId?.toString() || "",
  };
}
