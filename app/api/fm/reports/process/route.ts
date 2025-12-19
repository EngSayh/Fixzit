/**
 * @fileoverview FM Reports Process API
 * @description Worker endpoint to claim and process queued report jobs atomically.
 * Uses findOneAndUpdate for race-safe job claiming (up to 5 jobs per request).
 * @route POST /api/fm/reports/process - Process queued report jobs
 * @access Protected - Requires FM REPORTS/EXPORT permission
 * @module fm/reports
 */
import { NextRequest, NextResponse } from "next/server";
import type { ModifyResult, WithId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { unwrapFindOneResult } from "@/lib/mongoUtils.server";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";
import { FMErrors } from "@/app/api/fm/errors";
import { getPresignedGetUrl, putObjectBuffer } from "@/lib/storage/s3";
import { scanS3Object } from "@/lib/security/av-scan";
import { generateReport } from "@/lib/reports/generator";
import { validateBucketPolicies } from "@/lib/security/s3-policy";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

type ReportJob = {
  _id: { toString(): string };
  orgId: string; // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
  name: string;
  type: string;
  format: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  status: "queued" | "processing" | "ready" | "failed";
  fileKey?: string;
  fileMime?: string;
  clean?: boolean;
};

interface ReportJobDocument extends ReportJob {
  [key: string]: unknown;
}

const COLLECTION = "fm_report_jobs";

/**
 * POST /api/fm/reports/process
 *
 * Worker endpoint to claim and process queued report jobs atomically.
 * Uses findOneAndUpdate for race-safe job claiming (up to 5 jobs per request).
 *
 * Note: Jobs that remain in 'processing' status after worker crashes should be
 * recovered by a separate cleanup job that resets status back to 'queued' based
 * on updatedAt timestamp (e.g., older than 10 minutes).
 *
 * @security Requires FM REPORTS/EXPORT permission
 */
export async function POST(req: NextRequest) {
  let avUnavailable = false;
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "fm-reports-process:post",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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

    const db = await getDatabase();

    const policiesOk = await validateBucketPolicies();
    if (!policiesOk) {
      return NextResponse.json(
        { success: false, error: "Bucket policy/encryption invalid" },
        { status: 503 },
      );
    }
    const collection = db.collection<ReportJob>(COLLECTION);
    const queued: ReportJobDocument[] = [];
    while (queued.length < 5) {
      // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
      const claimResult = (await collection.findOneAndUpdate(
        { orgId: tenantId, status: "queued" },
        { $set: { status: "processing", updatedAt: new Date() } },
        { sort: { updatedAt: 1, _id: 1 }, returnDocument: "after" },
      )) as ModifyResult<ReportJob> | null;
      const claim = unwrapFindOneResult(
        claimResult as ModifyResult<ReportJob> | WithId<ReportJob> | null,
      ) as ReportJobDocument | null;
      if (!claim) break;
      queued.push(claim);
    }

    if (!queued.length) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No queued jobs",
      });
    }

    let processed = 0;
    for (const job of queued) {
      const jobDoc = job;
      const id = String(jobDoc._id);
      const key = `${tenantId}/reports/${id}.csv`;

      try {
        const report = await generateReport({
          id,
          name: jobDoc.name,
          type: jobDoc.type,
          format: "csv",
          dateRange: `${jobDoc.startDate || ""}-${jobDoc.endDate || ""}`,
          notes: jobDoc.notes,
        });

        await putObjectBuffer(key, report.buffer, report.mime);
        let clean: boolean | null = null;
        try {
          clean = await scanS3Object(key);
        } catch (error) {
          avUnavailable = true;
          logger.error("FM Reports worker AV scan unavailable", error as Error, {
            jobId: id,
            key,
          });
          clean = null;
        }

        if (clean === null) {
          await (/* NO_TENANT_SCOPE */ collection.updateOne(
            { _id: jobDoc._id },
            {
              $set: {
                status: "failed",
                updatedAt: new Date(),
                notes: "AV scan unavailable",
              },
            },
          ));
          break;
        }

        await (/* NO_TENANT_SCOPE */ collection.updateOne(
          { _id: jobDoc._id },
          {
            $set: {
              status: clean ? "ready" : "failed",
              fileKey: key,
              fileMime: report.mime,
              fileSize: report.size,
              clean,
              updatedAt: new Date(),
              notes: clean ? jobDoc.notes : "AV scan failed",
            },
          },
        ));
        processed += 1;
      } catch (err) {
        logger.error("FM Reports worker failed to process job", err as Error, {
          jobId: id,
        });
        await (/* NO_TENANT_SCOPE */ collection.updateOne(
          { _id: jobDoc._id },
          {
            $set: {
              status: "failed",
              updatedAt: new Date(),
              notes: `Error: ${String(err)}`,
            },
          },
        ));
      }
    }

    // Provide presigned URLs for the newly processed jobs
    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const ready = await collection
      .find({ orgId: tenantId, status: "ready" })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();
    const urls = await Promise.all(
      ready.map(async (job) => {
        const jobReady = job as ReportJobDocument;
        const fileKey = jobReady.fileKey;
        return {
          id: String(jobReady._id),
          fileKey,
          downloadUrl: fileKey ? await getPresignedGetUrl(fileKey, 600) : null,
        };
      }),
    );

    if (avUnavailable) {
      return NextResponse.json(
        { success: false, error: "AV scanning unavailable", processed },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true, processed, ready: urls });
  } catch (error) {
    logger.error("FM Reports worker API - POST error", error as Error);
    if (avUnavailable) {
      return NextResponse.json(
        { success: false, error: "AV scanning unavailable" },
        { status: 503 },
      );
    }
    return FMErrors.internalError();
  }
}
