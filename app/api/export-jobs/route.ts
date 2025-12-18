import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { getSessionUser, UnauthorizedError } from "@/server/middleware/withAuthRbac";
import { logger } from "@/lib/logger";
import { ExportJob } from "@/server/models/ExportJob";
import { enqueueExportJob } from "@/lib/export/export-queue";
import { FILTER_ENTITY_TYPES, normalizeFilterEntityType } from "@/lib/filters/entities";

const createExportJobSchema = z.object({
  entity_type: z
    .string()
    .trim()
    .refine((val) => Boolean(normalizeFilterEntityType(val)), "Invalid entity_type"),
  format: z.enum(["csv", "xlsx"]),
  ids: z.array(z.string()).max(500).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  search: z.string().max(500).optional(),
  columns: z.array(z.string()).max(50).optional(),
});

export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, {
    identifier: "export-jobs:list",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  let session;
  try {
    session = await getSessionUser(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  const orgId = session.orgId;
  const userId = session.id;

  if (!orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const entityType = searchParams.get("entity_type");
  const normalizedType = entityType ? normalizeFilterEntityType(entityType) : undefined;

  try {
    await connectDb();
    const query: Record<string, unknown> = { org_id: orgId, user_id: userId };
    if (normalizedType) {
      query.entity_type = normalizedType;
    } else {
      query.entity_type = { $in: FILTER_ENTITY_TYPES };
    }

    const jobs = await ExportJob.find(query)
      .sort({ created_at: -1 })
      .limit(50)
      .lean()
      .exec();

    return NextResponse.json({ jobs });
  } catch (error) {
    logger.error("[ExportJobs] GET failed", { error, orgId, userId });
    return NextResponse.json({ error: "Failed to load export jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, {
    identifier: "export-jobs:create",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  let session;
  try {
    session = await getSessionUser(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  const orgId = session.orgId;
  const userId = session.id;

  if (!orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = createExportJobSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const payload = validation.data;
  const normalizedEntityType = normalizeFilterEntityType(payload.entity_type);

  if (!normalizedEntityType) {
    return NextResponse.json({ error: "Invalid entity_type" }, { status: 400 });
  }

  try {
    await connectDb();

    const job = await ExportJob.create({
      org_id: orgId,
      user_id: userId,
      entity_type: normalizedEntityType,
      format: payload.format,
      filters: payload.filters || {},
      search: payload.search || "",
      ids: payload.ids || [],
      columns: payload.columns || [],
      status: "queued",
    });

    try {
      await enqueueExportJob({
        jobId: job._id.toString(),
        orgId,
        userId,
        entityType: normalizedEntityType,
        format: payload.format,
        filters: payload.filters || {},
        search: payload.search || "",
        ids: payload.ids || [],
        columns: payload.columns || [],
      });
    } catch (error) {
      await ExportJob.findByIdAndUpdate(job._id, {
        status: "failed",
        error_message: "Export queue unavailable",
      });
      logger.error("[ExportJobs] Queue unavailable", { error });
      return NextResponse.json({ error: "Export queue unavailable" }, { status: 503 });
    }

    logger.info("[ExportJobs] Enqueued export", {
      jobId: job._id,
      orgId,
      userId,
      entityType: normalizedEntityType,
      format: payload.format,
      idsCount: payload.ids?.length || 0,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    logger.error("[ExportJobs] POST failed", { error, orgId, userId, entityType: normalizedEntityType });
    return NextResponse.json({ error: "Failed to enqueue export job" }, { status: 500 });
  }
}
