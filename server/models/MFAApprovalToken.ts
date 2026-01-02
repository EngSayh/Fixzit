import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import crypto from "crypto";

/**
 * @module server/models/MFAApprovalToken
 * @description MFA Admin Override Approval Tokens
 * 
 * Enables superadmins/admins to issue time-limited approval tokens
 * for MFA disable operations on behalf of users who have lost access
 * to their authentication device.
 * 
 * @security
 * - Tokens are signed with HMAC-SHA256
 * - 15-minute expiry by default
 * - Single-use (marked used after validation)
 * - Scoped to specific action + target user
 * - Full audit trail of issuance and usage
 * 
 * @workflow
 * 1. Admin requests token via superadmin/admin UI
 * 2. Token is created with action scope + target user
 * 3. Token is provided to helpdesk/user
 * 4. User presents token during MFA disable flow
 * 5. Token is validated and marked used
 */

const MFAApprovalAction = [
  "disable_mfa",     // Allow disabling MFA without code
  "reset_mfa",       // Allow resetting MFA to new device
  "bypass_mfa",      // One-time login bypass (emergency)
] as const;

const MFAApprovalTokenSchema = new Schema(
  {
    // orgId: Added by tenantIsolationPlugin

    // Token identification
    tokenId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true,
    },

    // Token signature for verification
    signature: {
      type: String,
      required: true,
    },

    // Action scope
    action: {
      type: String,
      enum: MFAApprovalAction,
      required: true,
    },

    // Target user this token applies to
    targetUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    targetUserEmail: {
      type: String,
      required: true,
    },

    // Issuing admin
    issuedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    issuedByEmail: {
      type: String,
      required: true,
    },
    issuedByRole: {
      type: String,
      required: true,
    },

    // Justification (required for audit)
    justification: {
      type: String,
      required: true,
      minlength: 10,
    },

    // Ticket reference (support ticket)
    ticketReference: {
      type: String,
    },

    // Validity window
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    // Usage tracking
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
    usedAt: {
      type: Date,
    },
    usedByIp: {
      type: String,
    },

    // Revocation (admin can revoke before expiry)
    revoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    revocationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "mfa_approval_tokens",
  }
);

// Apply tenant isolation
MFAApprovalTokenSchema.plugin(tenantIsolationPlugin);

// TTL index - auto-delete expired tokens after 30 days
MFAApprovalTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days after expiry
);

// Compound indexes for queries
MFAApprovalTokenSchema.index({ orgId: 1, targetUserId: 1, used: 1, revoked: 1 });
MFAApprovalTokenSchema.index({ orgId: 1, issuedBy: 1, createdAt: -1 });

// Define interface that includes orgId from tenant isolation plugin
export interface IMFAApprovalToken {
  orgId: string;
  tokenId: string;
  signature: string;
  action: "disable_mfa" | "reset_mfa" | "bypass_mfa";
  targetUserId: Schema.Types.ObjectId;
  targetUserEmail: string;
  issuedBy: Schema.Types.ObjectId;
  issuedByEmail: string;
  issuedByRole: string;
  justification: string;
  ticketReference?: string;
  issuedAt: Date;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  usedByIp?: string;
  revoked: boolean;
  revokedAt?: Date;
  revokedBy?: Schema.Types.ObjectId;
  revocationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MFAApprovalTokenDocument = InferSchemaType<typeof MFAApprovalTokenSchema> & { orgId: string };

export const MFAApprovalToken: Model<MFAApprovalTokenDocument> = getModel(
  "MFAApprovalToken",
  MFAApprovalTokenSchema
);

// ============================================================================
// Helper Functions
// ============================================================================

const TOKEN_SECRET = process.env.MFA_APPROVAL_SECRET || process.env.JWT_SECRET || "mfa-approval-fallback";
const DEFAULT_EXPIRY_MINUTES = 15;

/**
 * Generate a cryptographically secure token ID
 */
function generateTokenId(): string {
  return `mfa_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Sign token payload with HMAC-SHA256
 */
function signPayload(payload: string): string {
  return crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("hex");
}

/**
 * Create an MFA approval token
 */
export async function createMFAApprovalToken(params: {
  orgId: string;
  targetUserId: string;
  targetUserEmail: string;
  action: typeof MFAApprovalAction[number];
  issuedBy: string;
  issuedByEmail: string;
  issuedByRole: string;
  justification: string;
  ticketReference?: string;
  expiryMinutes?: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const tokenId = generateTokenId();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + (params.expiryMinutes || DEFAULT_EXPIRY_MINUTES));

  // Payload to sign: tokenId + orgId + targetUserId + action + expiresAt
  const payload = `${tokenId}:${params.orgId}:${params.targetUserId}:${params.action}:${expiresAt.toISOString()}`;
  const signature = signPayload(payload);

  await MFAApprovalToken.create({
    orgId: params.orgId,
    tokenId,
    signature,
    action: params.action,
    targetUserId: params.targetUserId,
    targetUserEmail: params.targetUserEmail,
    issuedBy: params.issuedBy,
    issuedByEmail: params.issuedByEmail,
    issuedByRole: params.issuedByRole,
    justification: params.justification,
    ticketReference: params.ticketReference,
    expiresAt,
  });

  // Return the full token: tokenId.signature (like a JWT but simpler)
  return {
    token: `${tokenId}.${signature}`,
    expiresAt,
  };
}

/**
 * Validate and consume an MFA approval token
 */
export async function validateMFAApprovalToken(params: {
  token: string;
  orgId: string;
  targetUserId: string;
  action: typeof MFAApprovalAction[number];
  ipAddress?: string;
}): Promise<{
  valid: boolean;
  errorCode?: string;
  error?: string;
  tokenRecord?: MFAApprovalTokenDocument;
}> {
  // Parse token
  const parts = params.token.split(".");
  if (parts.length !== 2) {
    return { valid: false, errorCode: "INVALID_TOKEN_FORMAT", error: "Invalid token format" };
  }

  const [tokenId, providedSignature] = parts;

  // Find token in database
  const tokenRecord = await MFAApprovalToken.findOne({
    orgId: params.orgId,
    tokenId,
  }).lean();

  if (!tokenRecord) {
    return { valid: false, errorCode: "TOKEN_NOT_FOUND", error: "Token not found" };
  }

  // Check if revoked
  if (tokenRecord.revoked) {
    return { valid: false, errorCode: "TOKEN_REVOKED", error: "Token has been revoked" };
  }

  // Check if already used
  if (tokenRecord.used) {
    return { valid: false, errorCode: "TOKEN_ALREADY_USED", error: "Token has already been used" };
  }

  // Check expiry
  if (new Date() > new Date(tokenRecord.expiresAt)) {
    return { valid: false, errorCode: "TOKEN_EXPIRED", error: "Token has expired" };
  }

  // Verify signature
  const payload = `${tokenId}:${params.orgId}:${params.targetUserId}:${params.action}:${new Date(tokenRecord.expiresAt).toISOString()}`;
  const expectedSignature = signPayload(payload);
  
  if (providedSignature !== expectedSignature) {
    return { valid: false, errorCode: "INVALID_SIGNATURE", error: "Token signature mismatch" };
  }

  // Verify target user matches
  if (tokenRecord.targetUserId.toString() !== params.targetUserId) {
    return { valid: false, errorCode: "TARGET_MISMATCH", error: "Token not valid for this user" };
  }

  // Verify action matches
  if (tokenRecord.action !== params.action) {
    return { valid: false, errorCode: "ACTION_MISMATCH", error: "Token not valid for this action" };
  }

  // Mark token as used
  await MFAApprovalToken.updateOne(
    { _id: tokenRecord._id },
    {
      $set: {
        used: true,
        usedAt: new Date(),
        usedByIp: params.ipAddress,
      },
    }
  );

  return { valid: true, tokenRecord };
}

/**
 * Revoke an MFA approval token
 */
export async function revokeMFAApprovalToken(params: {
  tokenId: string;
  orgId: string;
  revokedBy: string;
  reason: string;
}): Promise<boolean> {
  const result = await MFAApprovalToken.updateOne(
    {
      orgId: params.orgId,
      tokenId: params.tokenId,
      used: false,
      revoked: false,
    },
    {
      $set: {
        revoked: true,
        revokedAt: new Date(),
        revokedBy: params.revokedBy,
        revocationReason: params.reason,
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Check if MFA approval system is configured
 */
export function isMFAApprovalSystemConfigured(): boolean {
  // System is configured if we have a secret set
  return !!(process.env.MFA_APPROVAL_SECRET || process.env.JWT_SECRET);
}
