/**
 * @fileoverview Authentication Module for Fixzit
 *
 * This module provides core authentication functionality including:
 * - Password hashing and verification (bcrypt)
 * - JWT token generation and verification
 * - User authentication with multi-tenant isolation
 * - Token-based user retrieval
 *
 * @module lib/auth
 * @version 2.0.26
 * @since 1.0.0
 *
 * @example
 * // Authenticate a user
 * const { token, user } = await authenticateUser('user@example.com', 'password');
 *
 * @example
 * // Verify a token
 * const payload = await verifyToken(token);
 * if (payload) {
 *   console.log('User ID:', payload.id);
 * }
 *
 * @see {@link docs/AUTH_FLOW.md} for authentication flow
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "@/server/models/User";
import { db } from "@/lib/mongo";
import { getJWTSecret as getJWTSecretService } from "@/lib/secrets";

/**
 * Internal type definition for User document structure
 * Used for type-safe access to user properties from MongoDB
 *
 * @internal
 * @interface _UserDocument
 */
interface _UserDocument {
  /** MongoDB native ObjectId */
  _id: { toString(): string };
  /** User's email address (unique identifier for personal login) */
  email: string;
  /** Bcrypt-hashed password */
  password: string;
  /** Account active status (legacy field) */
  isActive?: boolean;
  /** Account status string (preferred: 'ACTIVE', 'INACTIVE', 'SUSPENDED') */
  status?: string;
  /** User role (legacy field, prefer professional.role) */
  role?: string;
  /** Organization ID for multi-tenant isolation (REQUIRED) */
  orgId?: { toString(): string } | string;
  /** Display name */
  name?: string;
  /** Personal information container */
  personal?: {
    firstName?: string;
    lastName?: string;
  };
  /** Professional information container */
  professional?: {
    role?: string;
  };
  /** Allow additional fields for extensibility */
  [key: string]: unknown;
}

/**
 * Retrieves the JWT secret key for token operations.
 *
 * Uses a priority-based secret resolution:
 * 1. **AWS Secrets Manager** (production) - cached for 5 minutes
 * 2. **JWT_SECRET** environment variable - all environments
 * 3. **Ephemeral secret** - development only, regenerated on restart
 *
 * @async
 * @function getJWTSecret
 * @returns {Promise<string>} The JWT secret key
 * @throws {Error} If no secret can be resolved in production
 *
 * @security This function never logs or exposes the actual secret value.
 * @performance Secrets are cached for 5 minutes to minimize AWS API calls.
 *
 * @example
 * const secret = await getJWTSecret();
 * // Use with jwt.sign() or jwt.verify()
 *
 * @internal This is an internal function. Use generateToken/verifyToken instead.
 */
async function getJWTSecret(): Promise<string> {
  return await getJWTSecretService();
}

/**
 * Payload structure for JWT authentication tokens.
 *
 * @interface AuthToken
 * @property {string} id - User's MongoDB ObjectId as string
 * @property {string} email - User's email address
 * @property {string} role - User's role (e.g., 'ADMIN', 'EMPLOYEE', 'TECHNICIAN')
 * @property {string} orgId - Organization ID for multi-tenant isolation
 * @property {string} [tenantId] - Optional tenant ID (deprecated, use orgId)
 * @property {string} [name] - Optional display name
 */
export interface AuthToken {
  id: string;
  email: string;
  role: string;
  orgId: string;
  tenantId?: string;
  name?: string;
}

/**
 * Hashes a plaintext password using bcrypt.
 *
 * Uses a cost factor of 10, which provides a good balance between
 * security and performance (~100ms on modern hardware).
 *
 * @async
 * @function hashPassword
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} The bcrypt-hashed password
 *
 * @security Never log or store the plaintext password.
 * @security Always hash passwords before storing in database.
 *
 * @example
 * const hashedPassword = await hashPassword('userPass!234');
 * // Store hashedPassword in database
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 *
 * @async
 * @function verifyPassword
 * @param {string} password - The plaintext password to verify
 * @param {string} hashedPassword - The bcrypt hash to compare against
 * @returns {Promise<boolean>} True if password matches, false otherwise
 *
 * @security Uses constant-time comparison to prevent timing attacks.
 *
 * @example
 * const isValid = await verifyPassword('userPass!234', user.password);
 * if (!isValid) {
 *   throw new Error('Invalid credentials');
 * }
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generates a signed JWT token for authenticated sessions.
 *
 * Token characteristics:
 * - Algorithm: HS256 (HMAC-SHA256)
 * - Expiration: 24 hours
 * - Payload: User ID, email, role, orgId
 *
 * @async
 * @function generateToken
 * @param {AuthToken} payload - The token payload containing user data
 * @returns {Promise<string>} Signed JWT token string
 *
 * @security Token contains orgId for multi-tenant isolation.
 * @security Never include sensitive data (passwords, secrets) in payload.
 *
 * @example
 * const token = await generateToken({
 *   id: user._id.toString(),
 *   email: user.email,
 *   role: 'EMPLOYEE',
 *   orgId: user.orgId,
 * });
 * // Send token to client in response
 */
export async function generateToken(payload: AuthToken): Promise<string> {
  const secret = await getJWTSecret();
  return jwt.sign(payload, secret, { expiresIn: "24h", algorithm: "HS256" });
}

/**
 * Verifies and decodes a JWT token.
 *
 * @async
 * @function verifyToken
 * @param {string} token - The JWT token to verify
 * @returns {Promise<AuthToken | null>} Decoded payload if valid, null otherwise
 *
 * @security Returns null instead of throwing to prevent information leakage.
 * @security Validates signature, expiration, and algorithm.
 *
 * @example
 * const payload = await verifyToken(token);
 * if (!payload) {
 *   return res.status(401).json({ error: 'Invalid or expired token' });
 * }
 * // Use payload.id, payload.orgId, etc.
 */
export async function verifyToken(token: string): Promise<AuthToken | null> {
  try {
    const secret = await getJWTSecret();
    return jwt.verify(token, secret) as AuthToken;
  } catch {
    return null;
  }
}

/**
 * Authenticates a user with email/employee number and password.
 *
 * Supports two login modes:
 * - **Personal**: Uses email address for authentication (requires orgId)
 * - **Corporate**: Uses employee number (username field) + companyCode for authentication
 *
 * @async
 * @function authenticateUser
 * @param {string} emailOrEmployeeNumber - Email (personal) or employee number (corporate)
 * @param {string} password - Plaintext password
 * @param {'personal' | 'corporate'} [loginType='personal'] - Login mode
 * @param {string} [orgId] - Organization ID (required for personal login)
 * @param {string} [companyCode] - Company code (required for corporate login)
 * @returns {Promise<{ token: string; user: object }>} Auth token and user data
 *
 * @throws {Error} 'Invalid credentials' - User not found or password mismatch
 * @throws {Error} 'Account is not active' - User account is deactivated
 * @throws {Error} 'AUTH-001: User {id} has no orgId' - Multi-tenant violation
 * @throws {Error} 'orgId required for personal login' - Missing tenant context
 * @throws {Error} 'companyCode required for corporate login' - Missing company context
 *
 * @security Validates orgId to ensure multi-tenant isolation.
 * @security Uses constant-time password comparison.
 * @security Returns generic error to prevent user enumeration.
 *
 * @example
 * // Personal login (email) - requires orgId
 * const { token, user } = await authenticateUser(
 *   'user@company.com',
 *   '<user-password>',
 *   'personal',
 *   'org-123'
 * );
 *
 * @example
 * // Corporate login (employee number) - requires companyCode
 * const { token, user } = await authenticateUser(
 *   'EMP001',
 *   '<user-password>',
 *   'corporate',
 *   undefined,
 *   'ACME-001'
 * );
 */
export async function authenticateUser(
  emailOrEmployeeNumber: string,
  password: string,
  loginType: "personal" | "corporate" = "personal",
  orgId?: string,
  companyCode?: string,
) {
  // Ensure database connection is established
  await db;

  let user;
  if (loginType === "personal") {
    // SECURITY: Require orgId for personal login to prevent cross-tenant auth
    if (!orgId) {
      throw new Error("orgId required for personal login");
    }
    user = await User.findOne({ email: emailOrEmployeeNumber, orgId });
  } else {
    // SECURITY: Require companyCode for corporate login
    if (!companyCode) {
      throw new Error("companyCode required for corporate login");
    }
    // For corporate login, search by employee number (username field) + company code
    user = await User.findOne({ username: emailOrEmployeeNumber, code: companyCode });
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

  // ORGID-FIX: Enforce mandatory orgId for multi-tenant isolation
  const normalizedOrgId = typeof userDoc.orgId === "string"
    ? userDoc.orgId
    : userDoc.orgId?.toString() || null;
  
  if (!normalizedOrgId || normalizedOrgId.trim() === "") {
    throw new Error(`AUTH-001: User ${user._id} has no orgId - violates multi-tenant isolation`);
  }

  const token = await generateToken({
    id: user._id.toString(),
    email: user.email,
    role: userDoc.professional?.role || userDoc.role || "USER",
    orgId: normalizedOrgId,
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: `${userDoc.personal?.firstName || ""} ${userDoc.personal?.lastName || ""}`.trim(),
      role: userDoc.professional?.role || userDoc.role || "USER",
      orgId: normalizedOrgId,  // ✅ Already validated above
    },
  };
}

/**
 * Retrieves user data from a JWT token.
 *
 * Performs full validation:
 * 1. Verifies token signature and expiration
 * 2. Fetches fresh user data from database
 * 3. Validates user is active
 * 4. Validates orgId exists (multi-tenant isolation)
 *
 * @async
 * @function getUserFromToken
 * @param {string} token - JWT token to validate
 * @returns {Promise<object | null>} User data if valid, null otherwise
 *
 * @security Returns null for any validation failure (no information leakage).
 * @security Always fetches fresh data - doesn't trust token payload alone.
 * @security Enforces orgId requirement for multi-tenant isolation.
 *
 * @example
 * const user = await getUserFromToken(req.headers.authorization?.split(' ')[1]);
 * if (!user) {
 *   return res.status(401).json({ error: 'Unauthorized' });
 * }
 * // User is authenticated and active
 */
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

  // ORGID-FIX: Enforce mandatory orgId for multi-tenant isolation
  const normalizedOrgId = typeof userDoc.orgId === "string"
    ? userDoc.orgId
    : userDoc.orgId?.toString() || null;
  
  if (!normalizedOrgId || normalizedOrgId.trim() === "") {
    // Return null instead of throwing - token validation should fail gracefully
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: `${userDoc.personal?.firstName || ""} ${userDoc.personal?.lastName || ""}`.trim(),
    role: userDoc.professional?.role || userDoc.role || "USER",
    orgId: normalizedOrgId,
  };
}
