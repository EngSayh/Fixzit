/**
 * @description Downloads a generated FM report file.
 * Returns a presigned S3 URL for the report file if job is complete.
 * Requires EXPORT permission on REPORTS module.
 * @route GET /api/fm/reports/[id]/download
 * @access Private - Users with REPORTS.EXPORT permission
 * @param {string} id - Report job ID
 * @returns {Object} downloadUrl: presigned S3 URL (valid for 1 hour)
 * @throws {400} If report ID is invalid
 * @throws {403} If user lacks EXPORT permission
 * @throws {404} If report job not found
 * @throws {409} If report not ready (still processing)
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";
import { FMErrors } from "@/app/api/fm/errors";
import { getPresignedGetUrl } from "@/lib/storage/s3";

const COLLECTION = "fm_report_jobs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.REPORTS,
      action: FMAction.EXPORT,
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

    const id = params.id;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid report id" },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const job = await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id), orgId: tenantId });
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 },
      );
    }
    if (job.status !== "ready" || !job.fileKey) {
      return NextResponse.json(
        { success: false, error: "Report not ready" },
        { status: 409 },
      );
    }

    const downloadUrl = await getPresignedGetUrl(job.fileKey, 600);
    return NextResponse.json({
      success: true,
      downloadUrl,
      fileKey: job.fileKey,
      mime: job.fileMime || "text/csv",
    });
  } catch (error) {
    logger.error("FM Reports download error", error as Error, {
      id: params.id,
    });
    return FMErrors.internalError();
  }
}
