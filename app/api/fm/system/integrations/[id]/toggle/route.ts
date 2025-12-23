/**
 * @fileoverview FM Integration Toggle API
 * @description Enables or disables third-party integrations for the FM module.
 * Supports toggling payment gateways, accounting systems, and other external services.
 * @module api/fm/system/integrations/[id]/toggle
 *
 * @security Requires FM FINANCE module UPDATE permission
 * @security Rate limited per organization
 *
 * @example
 * // POST /api/fm/system/integrations/quickbooks/toggle
 * // Body: { enabled: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { unwrapFindOneResult } from "@/lib/mongoUtils.server";
import { logger } from "@/lib/logger";
import { FMErrors } from "@/app/api/fm/errors";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

type IntegrationDocument = {
  _id: ObjectId;
  orgId: string; // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
  integrationId: string;
  status: "connected" | "disconnected";
  updatedAt: Date;
  createdAt: Date;
};

const COLLECTION = "fm_integrations";

const mapIntegration = (doc: IntegrationDocument) => ({
  id: doc.integrationId,
  status: doc.status,
  updatedAt: doc.updatedAt,
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const integrationId = params.id;
  if (!integrationId) {
    return NextResponse.json(
      { success: false, error: "Missing integration id" },
      { status: 400 },
    );
  }

  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
      action: FMAction.UPDATE,
    });
    if (actor instanceof NextResponse) return actor;

    const isSuperAdmin = actor.isSuperAdmin === true;

    // AUDIT-2025-11-29: Added RBAC context for proper tenant resolution
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      { isSuperAdmin, userId: actor.id, allowHeaderOverride: isSuperAdmin }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, actor.orgId, actor.id), 30, 60_000);
    if (!rl.allowed) return rateLimitError();

    const db = await getDatabase();
    const collection = db.collection<IntegrationDocument>(COLLECTION);
    const now = new Date();

    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    // Query uses native MongoDB driver (already returns lean POJO)
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Native driver returns lean POJO
    const existing = await collection.findOne({
      orgId: tenantId,
      integrationId,
    });
    const nextStatus =
      existing?.status === "connected" ? "disconnected" : "connected";

    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const result = await collection.findOneAndUpdate(
      { orgId: tenantId, integrationId },
      {
        $set: {
          status: nextStatus,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    const doc = unwrapFindOneResult(result as IntegrationDocument | null | undefined);
    if (!doc) {
      return FMErrors.internalError();
    }

    return NextResponse.json({
      success: true,
      data: mapIntegration(doc as IntegrationDocument),
    });
  } catch (error) {
    logger.error("FM Integrations toggle API error", error as Error);
    return FMErrors.internalError();
  }
}
