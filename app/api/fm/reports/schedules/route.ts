import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";
import { FMErrors } from "@/app/api/fm/errors";

type ScheduleDocument = {
  _id: ObjectId;
  org_id: string;
  name: string;
  type: string;
  frequency: string;
  format: string;
  recipients: string[];
  startDate: string;
  status: "active" | "paused";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type SchedulePayload = {
  title?: string;
  reportType?: string;
  frequency?: string;
  format?: string;
  recipients?: string;
  startDate?: string;
};

const COLLECTION = "fm_report_schedules";

const sanitizePayload = (payload: SchedulePayload): SchedulePayload => {
  const sanitized: SchedulePayload = {};
  if (payload.title) sanitized.title = payload.title.trim();
  if (payload.reportType) sanitized.reportType = payload.reportType.trim();
  if (payload.frequency) sanitized.frequency = payload.frequency.trim();
  if (payload.format) sanitized.format = payload.format.trim().toLowerCase();
  if (payload.recipients) sanitized.recipients = payload.recipients.trim();
  if (payload.startDate) sanitized.startDate = payload.startDate.trim();
  return sanitized;
};

const validatePayload = (payload: SchedulePayload): string | null => {
  if (!payload.title) return "Schedule name is required";
  if (!payload.reportType) return "Report type is required";
  if (!payload.frequency) return "Frequency is required";
  if (!payload.format) return "Format is required";
  if (!payload.recipients) return "Recipients are required";
  if (!payload.startDate) return "Start date is required";
  return null;
};

const mapSchedule = (doc: ScheduleDocument) => ({
  id: doc._id.toString(),
  name: doc.name,
  type: doc.type,
  frequency: doc.frequency,
  format: doc.format,
  recipients: doc.recipients,
  startDate: doc.startDate,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function GET(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
      action: FMAction.EXPORT,
    });
    if (actor instanceof NextResponse) return actor;

    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const db = await getDatabase();
    const collection = db.collection<ScheduleDocument>(COLLECTION);
    const schedules = await collection
      .find({ org_id: tenantId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      data: schedules.map(mapSchedule),
    });
  } catch (error) {
    logger.error("FM Report Schedules API - GET error", error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
      action: FMAction.EXPORT,
    });
    if (actor instanceof NextResponse) return actor;

    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const payload = sanitizePayload(await req.json());
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const recipientList = payload
      .recipients!.split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    const now = new Date();
    const doc: ScheduleDocument = {
      _id: new ObjectId(),
      org_id: tenantId,
      name: payload.title!,
      type: payload.reportType!,
      frequency: payload.frequency || "monthly",
      format: payload.format || "pdf",
      recipients: recipientList,
      startDate: payload.startDate!,
      status: "active",
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<ScheduleDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json(
      { success: true, data: mapSchedule(doc) },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Report Schedules API - POST error", error as Error);
    return FMErrors.internalError();
  }
}
