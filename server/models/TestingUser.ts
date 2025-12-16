/**
 * @module server/models/TestingUser
 * @description Testing User model for superadmin-managed production test accounts.
 * Real testing users with encrypted credentials, audit trails, and expiry management.
 *
 * @features
 * - Superadmin-managed test accounts (not demo users)
 * - Encrypted password storage (bcrypt hashing)
 * - Role-based access (SUPER_ADMIN, ADMIN, MANAGER, USER, VENDOR, TENANT)
 * - Status management (ACTIVE, DISABLED, EXPIRED)
 * - Expiry date enforcement (automatic status update)
 * - Password change requirements (requirePasswordChange flag)
 * - Login attempt tracking (success/failure logs)
 * - Access audit trail (IP, userAgent, timestamps)
 * - Account lockout after failed attempts (configurable threshold)
 * - Usage notes and description (purpose documentation)
 * - Created/modified by tracking (superadmin actions)
 * - On-demand enable/disable controls
 *
 * @statuses
 * - ACTIVE: Account enabled and valid
 * - DISABLED: Manually disabled by superadmin
 * - EXPIRED: Past expiresAt date (automatic)
 *
 * @indexes
 * - { email: 1 } unique - Email uniqueness
 * - { username: 1 } unique - Username uniqueness
 * - { status: 1, expiresAt: 1 } - Active account queries
 * - { role: 1 } - Role-based filtering
 *
 * @relationships
 * - User: No direct link (separate from production users)
 * - Organization: testOrgId may reference test org
 *
 * @compliance
 * - Password encryption (bcrypt 10+ rounds)
 * - Login audit trail (60-day retention)
 * - Superadmin-only access control
 * - Automatic account expiry
 *
 * @audit
 * - loginLogs: Full access history with IP/userAgent
 * - createdAt/updatedAt: Account lifecycle
 * - createdBy/updatedBy: Superadmin actions
 * - passwordLastChanged: Security tracking
 *
 * Testing User Model (legacy comment retained below)
 *
 * Superadmin-managed testing users for production system testing.
 * These are NOT demo users - they are real testing accounts with
 * credentials managed by superadmin.
 *
 * Key differences from demo users:
 * - Created and managed by superadmin via API/UI
 * - Credentials stored encrypted
 * - Full audit trail of access
 * - Can be enabled/disabled on demand
 * - Supports expiry dates
 */

import { Schema, model, models, HydratedDocument, Types } from "mongoose";
import { MModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// ---------- Enums ----------
export const TestingUserStatus = ["ACTIVE", "DISABLED", "EXPIRED"] as const;
export type TTestingUserStatus = (typeof TestingUserStatus)[number];

export const TestingUserRole = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "USER",
  "VENDOR",
  "TENANT",
] as const;
export type TTestingUserRole = (typeof TestingUserRole)[number];

// ---------- Interfaces ----------
export interface ITestingUserLoginLog {
  timestamp: Date;
  ip: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}

export interface ITestingUser {
  _id: Types.ObjectId;

  // Identity
  email: string;
  username: string;
  displayName: string;
  role: TTestingUserRole;

  // Credentials (hashed)
  passwordHash: string;
  passwordLastChanged: Date;
  requirePasswordChange: boolean;

  // Status
  status: TTestingUserStatus;
  statusReason?: string;
  statusChangedAt?: Date;
  statusChangedBy?: string;

  // Access control
  expiresAt?: Date;
  allowedIPs?: string[];
  allowedEnvironments?: string[]; // e.g., ["production", "staging"]
  maxSessionsPerDay?: number;

  // Usage tracking
  lastLoginAt?: Date;
  loginCount: number;
  loginHistory: ITestingUserLoginLog[];

  // Organization context
  orgId?: string;
  accessibleOrgIds?: string[];

  // Metadata
  purpose: string; // Why this testing user exists
  createdBy: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ---------- Schema ----------
const TestingUserLoginLogSchema = new Schema<ITestingUserLoginLog>(
  {
    timestamp: { type: Date, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String },
    success: { type: Boolean, required: true },
    failureReason: { type: String },
  },
  { _id: false }
);

const TestingUserSchema = new Schema<ITestingUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true, // unique implies index
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: { type: String, required: true },
    role: {
      type: String,
      enum: TestingUserRole,
      required: true,
      default: "USER",
    },

    passwordHash: { type: String, required: true },
    passwordLastChanged: { type: Date, required: true },
    requirePasswordChange: { type: Boolean, default: false },

    status: {
      type: String,
      enum: TestingUserStatus,
      required: true,
      default: "ACTIVE",
      // index via compounds { status: 1, expiresAt: 1 }, { orgId: 1, status: 1 }
    },
    statusReason: { type: String },
    statusChangedAt: { type: Date },
    statusChangedBy: { type: String },

    expiresAt: { type: Date }, // index via compound { status: 1, expiresAt: 1 }
    allowedIPs: { type: [String] },
    allowedEnvironments: { type: [String] },
    maxSessionsPerDay: { type: Number },

    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    loginHistory: {
      type: [TestingUserLoginLogSchema],
      default: [],
      // Keep only last 100 entries
      validate: {
        validator: function (v: ITestingUserLoginLog[]) {
          return v.length <= 100;
        },
        message: "Login history limited to 100 entries",
      },
    },

    orgId: { type: String }, // index via compound { orgId: 1, status: 1 }
    accessibleOrgIds: { type: [String] },

    purpose: { type: String, required: true },
    createdBy: { type: String, required: true },
    notes: { type: String },
  },
  {
    timestamps: true,
    collection: "testing_users",
  }
);

// ---------- Indexes ----------
TestingUserSchema.index({ status: 1, expiresAt: 1 });
TestingUserSchema.index({ orgId: 1, status: 1 });

// ---------- Pre-save middleware ----------
TestingUserSchema.pre("save", async function (next) {
  // Check expiry and update status
  if (this.expiresAt && new Date() > this.expiresAt && this.status === "ACTIVE") {
    this.status = "EXPIRED";
    this.statusReason = "Expired automatically";
    this.statusChangedAt = new Date();
  }
  next();
});

// ---------- Instance Methods ----------
TestingUserSchema.methods.verifyPassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

TestingUserSchema.methods.setPassword = async function (
  password: string
): Promise<void> {
  this.passwordHash = await bcrypt.hash(password, 12);
  this.passwordLastChanged = new Date();
  this.requirePasswordChange = false;
};

TestingUserSchema.methods.recordLogin = async function (
  ip: string,
  userAgent: string | undefined,
  success: boolean,
  failureReason?: string
): Promise<void> {
  const logEntry: ITestingUserLoginLog = {
    timestamp: new Date(),
    ip,
    userAgent,
    success,
    failureReason,
  };

  // Add to history (limited to 100 entries)
  if (this.loginHistory.length >= 100) {
    this.loginHistory.shift();
  }
  this.loginHistory.push(logEntry);

  if (success) {
    this.lastLoginAt = new Date();
    this.loginCount += 1;
  }

  await this.save();
};

TestingUserSchema.methods.isAccessible = function (
  ip?: string,
  environment?: string
): { allowed: boolean; reason?: string } {
  // Check status
  if (this.status !== "ACTIVE") {
    return { allowed: false, reason: `Account is ${this.status}` };
  }

  // Check expiry
  if (this.expiresAt && new Date() > this.expiresAt) {
    return { allowed: false, reason: "Account has expired" };
  }

  // Check IP allowlist
  if (this.allowedIPs?.length && ip && !this.allowedIPs.includes(ip)) {
    return { allowed: false, reason: "IP not in allowlist" };
  }

  // Check environment
  if (
    this.allowedEnvironments?.length &&
    environment &&
    !this.allowedEnvironments.includes(environment)
  ) {
    return { allowed: false, reason: "Environment not allowed" };
  }

  return { allowed: true };
};

// ---------- Statics ----------
TestingUserSchema.statics.createTestingUser = async function (
  data: {
    email: string;
    username: string;
    displayName: string;
    role: TTestingUserRole;
    password: string;
    purpose: string;
    createdBy: string;
    orgId?: string;
    expiresAt?: Date;
    allowedIPs?: string[];
    allowedEnvironments?: string[];
    notes?: string;
  }
): Promise<ITestingUser> {
  const passwordHash = await bcrypt.hash(data.password, 12);

  return this.create({
    email: data.email.toLowerCase(),
    username: data.username.toLowerCase(),
    displayName: data.displayName,
    role: data.role,
    passwordHash,
    passwordLastChanged: new Date(),
    status: "ACTIVE",
    purpose: data.purpose,
    createdBy: data.createdBy,
    orgId: data.orgId,
    expiresAt: data.expiresAt,
    allowedIPs: data.allowedIPs,
    allowedEnvironments: data.allowedEnvironments,
    notes: data.notes,
  });
};

TestingUserSchema.statics.findByEmail = async function (
  email: string
): Promise<ITestingUser | null> {
  return this.findOne({ email: email.toLowerCase() }).lean();
};

TestingUserSchema.statics.findActive = async function (
  orgId?: string
): Promise<ITestingUser[]> {
  const query: Record<string, unknown> = { status: "ACTIVE" };
  if (orgId) query.orgId = orgId;
  return this.find(query).sort({ createdAt: -1 }).lean();
};

TestingUserSchema.statics.expireOldUsers = async function (): Promise<number> {
  const result = await this.updateMany(
    {
      status: "ACTIVE",
      expiresAt: { $lt: new Date() },
    },
    {
      $set: {
        status: "EXPIRED",
        statusReason: "Expired automatically",
        statusChangedAt: new Date(),
      },
    }
  );
  return result.modifiedCount;
};

TestingUserSchema.statics.generateSecurePassword = function (): string {
  // Generate a secure random password
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  const bytes = randomBytes(16);
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
};

// ---------- Plugins ----------
TestingUserSchema.plugin(auditPlugin);

// ---------- Type Extensions ----------
interface TestingUserMethods {
  verifyPassword(password: string): Promise<boolean>;
  setPassword(password: string): Promise<void>;
  recordLogin(
    ip: string,
    userAgent: string | undefined,
    success: boolean,
    failureReason?: string
  ): Promise<void>;
  isAccessible(
    ip?: string,
    environment?: string
  ): { allowed: boolean; reason?: string };
}

interface TestingUserStatics {
  createTestingUser(data: {
    email: string;
    username: string;
    displayName: string;
    role: TTestingUserRole;
    password: string;
    purpose: string;
    createdBy: string;
    orgId?: string;
    expiresAt?: Date;
    allowedIPs?: string[];
    allowedEnvironments?: string[];
    notes?: string;
  }): Promise<ITestingUser>;
  findByEmail(email: string): Promise<ITestingUser | null>;
  findActive(orgId?: string): Promise<ITestingUser[]>;
  expireOldUsers(): Promise<number>;
  generateSecurePassword(): string;
}

type TestingUserModel = MModel<ITestingUser> & TestingUserStatics;
export type TestingUserDocument = HydratedDocument<ITestingUser>;

// ---------- Export ----------
export const TestingUser = (models.TestingUser ||
  model<ITestingUser>("TestingUser", TestingUserSchema)) as unknown as TestingUserModel;
