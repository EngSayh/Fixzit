/**
 * @fileoverview FM User Invitation API
 * @description Manages user invitations for the facility management module.
 * Sends email invitations and tracks invitation status for new team members.
 * @module api/fm/system/users/invite
 *
 * @security Requires FM FINANCE module UPDATE permission
 * @security Rate limited per organization
 *
 * @example
 * // POST /api/fm/system/users/invite
 * // Body: { email, firstName, lastName, role }
 * // Returns: { success: true, invite: {...} }
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { FMErrors } from "@/app/api/fm/errors";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId, isCrossTenantMode } from "@/app/api/fm/utils/tenant";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

type InviteDocument = {
  _id: ObjectId;
  orgId: string; // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: "pending" | "sent";
  createdAt: Date;
  updatedAt: Date;
  jobId?: string;
};

type InvitePayload = {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

const COLLECTION = "fm_user_invites";

const sanitize = (payload: InvitePayload) => ({
  email: payload.email?.trim().toLowerCase(),
  firstName: payload.firstName?.trim(),
  lastName: payload.lastName?.trim(),
  role: payload.role?.trim(),
});

const validate = (payload: ReturnType<typeof sanitize>): string | null => {
  if (!payload.email) return "Email is required";
  if (!payload.firstName) return "First name is required";
  if (!payload.lastName) return "Last name is required";
  if (!payload.role) return "Role is required";
  return null;
};

const mapInvite = (doc: InviteDocument) => ({
  id: doc._id.toString(),
  email: doc.email,
  firstName: doc.firstName,
  lastName: doc.lastName,
  role: doc.role,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function GET(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
      action: FMAction.VIEW,
    });
    if (actor instanceof NextResponse) return actor;
    // AUDIT-2025-11-29: Pass Super Admin context for proper audit logging
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      {
        isSuperAdmin: actor.isSuperAdmin,
        userId: actor.userId,
        allowHeaderOverride: actor.isSuperAdmin,
      }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const db = await getDatabase();
    const collection = db.collection<InviteDocument>(COLLECTION);
    const invites = await collection
      .find({ orgId: tenantId }) // AUDIT-2025-11-29: Changed from org_id
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray();
    return NextResponse.json({ success: true, data: invites.map(mapInvite) });
  } catch (error) {
    logger.error("FM Invites API - GET error", error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
      action: FMAction.CREATE,
    });
    if (actor instanceof NextResponse) return actor;
    // AUDIT-2025-11-29: Pass Super Admin context for proper audit logging
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      {
        isSuperAdmin: actor.isSuperAdmin,
        userId: actor.userId,
        allowHeaderOverride: actor.isSuperAdmin,
      }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    // AUDIT-2025-11-29: Reject cross-tenant mode for POST (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Super Admin must specify tenant context for user invitations" },
        { status: 400 }
      );
    }

    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, actor.orgId, actor.id), 30, 60_000);
    if (!rl.allowed) return rateLimitError();

    const payload = sanitize(await req.json());
    const validationError = validate(payload);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const now = new Date();
    const doc: InviteDocument = {
      _id: new ObjectId(),
      orgId: tenantId, // AUDIT-2025-11-29: Changed from org_id
      email: payload.email!,
      firstName: payload.firstName!,
      lastName: payload.lastName!,
      role: payload.role!,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<InviteDocument>(COLLECTION);

    const existing = await collection.findOne({
      orgId: tenantId, // AUDIT-2025-11-29: Changed from org_id
      email: doc.email,
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Invitation already exists for this email" },
        { status: 409 },
      );
    }

    await collection.insertOne(doc);

    // Enqueue email invitation job for background processing
    try {
      const { JobQueue } = await import("@/lib/jobs/queue");
      const jobId = await JobQueue.enqueue("email-invitation", {
        inviteId: doc._id.toString(),
        email: doc.email,
        firstName: doc.firstName,
        lastName: doc.lastName,
        role: doc.role,
        orgId: tenantId,
      });

      // Update invite status to 'sent' immediately (will be processed in background)
      await collection.updateOne(
        { _id: doc._id },
        { $set: { status: "sent", jobId, updatedAt: new Date() } },
      );
      doc.status = "sent";
      doc.jobId = jobId;
    } catch (error) {
      logger.error("Failed to enqueue invitation email", error as Error, {
        inviteId: doc._id.toString(),
      });
      // Don't fail the request if job queue fails - invitation is still created
    }

    return NextResponse.json(
      { success: true, data: mapInvite(doc) },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Invites API - POST error", error as Error);
    return FMErrors.internalError();
  }
}
