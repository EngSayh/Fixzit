/**
 * @fileoverview FM Support Tickets API
 * @description Creates and manages support tickets for facility management issues.
 * Supports priority levels, module categorization, and customer notifications.
 * @module api/fm/support/tickets
 *
 * @security Requires FM WORK_ORDERS module CREATE/READ permission
 * @security Multi-tenant isolated via orgId
 *
 * @example
 * // POST /api/fm/support/tickets
 * // Body: { requesterName, requesterEmail, module, priority, subject, summary }
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId, isCrossTenantMode } from "@/app/api/fm/utils/tenant";
import { FMErrors } from "@/app/api/fm/errors";

type TicketDocument = {
  _id: ObjectId;
  orgId: string; // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  module: string;
  priority: string;
  subject: string;
  summary: string;
  steps?: string;
  environment?: string;
  ccList?: string[];
  notifyCustomer: boolean;
  shareStatusPage: boolean;
  status: "open" | "acknowledged";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type TicketPayload = {
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  module?: string;
  priority?: string;
  subject?: string;
  summary?: string;
  steps?: string;
  environment?: string;
  ccList?: string;
  notifyCustomer?: boolean;
  shareStatusPage?: boolean;
};

const COLLECTION = "fm_support_tickets";

const sanitizePayload = (payload: TicketPayload): TicketPayload => ({
  requesterName: payload.requesterName?.trim(),
  requesterEmail: payload.requesterEmail?.trim().toLowerCase(),
  requesterPhone: payload.requesterPhone?.trim(),
  module: payload.module?.trim(),
  priority: payload.priority?.trim(),
  subject: payload.subject?.trim(),
  summary: payload.summary?.trim(),
  steps: payload.steps?.trim(),
  environment: payload.environment?.trim(),
  ccList: payload.ccList?.trim(),
  notifyCustomer: Boolean(payload.notifyCustomer),
  shareStatusPage: Boolean(payload.shareStatusPage),
});

const validatePayload = (payload: TicketPayload): string | null => {
  if (!payload.requesterName) return "Requester name is required";
  if (!payload.requesterEmail || !payload.requesterEmail.includes("@"))
    return "Valid email is required";
  if (!payload.module) return "Module is required";
  if (!payload.priority) return "Priority is required";
  if (!payload.subject) return "Subject is required";
  if (!payload.summary || payload.summary.length < 20)
    return "Summary must be at least 20 characters";
  return null;
};

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.SUPPORT,
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
        { success: false, error: "Super Admin must specify tenant context for ticket creation" },
        { status: 400 }
      );
    }

    const payload = sanitizePayload(await req.json());
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const ccList = payload.ccList
      ? payload.ccList
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean)
      : [];

    const now = new Date();
    const doc: TicketDocument = {
      _id: new ObjectId(),
      orgId: tenantId, // AUDIT-2025-11-29: Changed from org_id
      requesterName: payload.requesterName!,
      requesterEmail: payload.requesterEmail!,
      requesterPhone: payload.requesterPhone,
      module: payload.module!,
      priority: payload.priority || "medium",
      subject: payload.subject!,
      summary: payload.summary!,
      steps: payload.steps,
      environment: payload.environment,
      ccList,
      notifyCustomer: Boolean(payload.notifyCustomer),
      shareStatusPage: Boolean(payload.shareStatusPage),
      status: "open",
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<TicketDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json(
      { success: true, data: { id: doc._id.toString() } },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Support Tickets API - POST error", error as Error);
    return FMErrors.internalError();
  }
}
