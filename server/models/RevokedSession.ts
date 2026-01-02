/**
 * RevokedSession Model - Session termination tracking
 *
 * @module server/models/RevokedSession
 * @description Tracks revoked JWT sessions for forced logout functionality.
 * Since NextAuth uses JWT strategy, we can't invalidate tokens directly.
 * Instead, we maintain a revocation list that's checked on each request.
 *
 * @features
 * - Session revocation by superadmin
 * - Bulk user session revocation
 * - Automatic cleanup of expired entries
 * - Audit trail for compliance
 *
 * @performance
 * - TTL index automatically removes expired entries
 * - Indexed by session_id and user_id for fast lookups
 *
 * @compliance
 * - GDPR: Right to restrict processing
 * - ISO 27001: Access control
 *
 * @since FEAT-0032 [AGENT-001-A]
 */

import { Schema } from "mongoose";
import { getModel, type MModel } from "@/types/mongoose-compat";

export interface IRevokedSession {
  /** The session token (jti claim from JWT) */
  session_id: string;
  /** User ID whose session was revoked */
  user_id: string;
  /** Organization ID (required for tenant isolation) */
  org_id: string;
  /** Reason for revocation */
  reason: "manual" | "security_incident" | "password_change" | "account_disabled" | "bulk_revoke";
  /** Who revoked the session */
  revoked_by: string;
  /** IP address of the revoked session (for audit) */
  session_ip?: string;
  /** When the session was revoked */
  revoked_at: Date;
  /** When the original JWT expires (for cleanup) */
  jwt_expires_at: Date;
  /** Additional notes */
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RevokedSessionSchema = new Schema<IRevokedSession>(
  {
    session_id: {
      type: String,
      required: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    org_id: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ["manual", "security_incident", "password_change", "account_disabled", "bulk_revoke"],
      required: true,
    },
    revoked_by: {
      type: String,
      required: true,
    },
    session_ip: {
      type: String,
      required: false,
    },
    revoked_at: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    jwt_expires_at: {
      type: Date,
      required: true,
      // TTL index: automatically delete after JWT expiry + 1 day buffer
      index: { expires: "1d" },
    },
    notes: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

// Compound index for checking if a specific session is revoked
RevokedSessionSchema.index({ session_id: 1, revoked_at: 1 });

// Index for bulk revocation queries by user
RevokedSessionSchema.index({ user_id: 1, revoked_at: -1 });

export const RevokedSessionModel = getModel<IRevokedSession>(
  "RevokedSession",
  RevokedSessionSchema
) as MModel<IRevokedSession>;

/**
 * Check if a session is revoked
 * @param sessionId - The session token to check
 * @param orgId - Organization ID (required for tenant isolation)
 */
export async function isSessionRevoked(sessionId: string, orgId?: string): Promise<boolean> {
  if (!sessionId) return false;
  const query: Record<string, unknown> = { session_id: sessionId };
  // Include org_id in query for tenant isolation when provided
  if (orgId) {
    query.org_id = orgId;
  }
  const revoked = await RevokedSessionModel.findOne(query).lean();
  return !!revoked;
}

/**
 * Revoke a specific session
 */
export async function revokeSession(params: {
  sessionId: string;
  userId: string;
  orgId: string;
  reason: IRevokedSession["reason"];
  revokedBy: string;
  sessionIp?: string;
  jwtExpiresAt: Date;
  notes?: string;
}): Promise<IRevokedSession> {
  const doc = await RevokedSessionModel.create({
    session_id: params.sessionId,
    user_id: params.userId,
    org_id: params.orgId,
    reason: params.reason,
    revoked_by: params.revokedBy,
    session_ip: params.sessionIp,
    revoked_at: new Date(),
    jwt_expires_at: params.jwtExpiresAt,
    notes: params.notes,
  });
  return doc.toObject();
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(params: {
  userId: string;
  orgId: string;
  reason: IRevokedSession["reason"];
  revokedBy: string;
  notes?: string;
}): Promise<number> {
  // Since we use JWT, we can't enumerate active sessions
  // We'll create a marker that middleware checks
  const doc = await RevokedSessionModel.create({
    session_id: `all:${params.userId}:${Date.now()}`,
    user_id: params.userId,
    org_id: params.orgId,
    reason: params.reason,
    revoked_by: params.revokedBy,
    revoked_at: new Date(),
    // Expire in 24 hours (covers max JWT lifetime)
    jwt_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    notes: params.notes || "Bulk session revocation",
  });
  return doc ? 1 : 0;
}

/**
 * Check if user has any bulk revocation active
 * @param userId - User ID to check
 * @param orgId - Organization ID (required for tenant isolation)
 * @param sinceDate - Optional date to check revocations since
 */
export async function hasUserBulkRevocation(
  userId: string,
  orgId: string,
  sinceDate?: Date
): Promise<boolean> {
  // Escape regex special characters in userId to prevent injection
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query: Record<string, unknown> = {
    user_id: userId,
    org_id: orgId,
    session_id: { $regex: `^all:${escapedUserId}:` },
  };
  if (sinceDate) {
    query.revoked_at = { $gte: sinceDate };
  }
  const revoked = await RevokedSessionModel.findOne(query).lean();
  return !!revoked;
}
