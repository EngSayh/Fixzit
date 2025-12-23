import { randomUUID } from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { db } from "@/lib/mongo";
import { WorkOrder, WorkOrderDoc } from "@/server/models/WorkOrder";
import { logger } from "@/lib/logger";
import { Types } from "mongoose";
import { ensureToolAllowed } from "./guard";
import { CopilotSession } from "../session";
import type { ToolExecutionResult, UploadPayload } from "./types";

const DEFAULT_RESPONSE_MINUTES = 120;
const DEFAULT_RESOLUTION_MINUTES = 72 * 60;

type RequesterType = "TENANT" | "OWNER" | "STAFF" | "EXTERNAL";

function inferRequesterType(role: CopilotSession["role"]): RequesterType {
  switch (role) {
    case "OWNER":
    case "CUSTOMER":
      return "OWNER";
    case "VENDOR":
      return "EXTERNAL";
    case "TENANT":
    case "GUEST":
      return "TENANT";
    default:
      return "STAFF";
  }
}

function buildWorkOrderFilter(session: CopilotSession) {
  const filter: Record<string, unknown> = {
    orgId: session.tenantId,
    isDeleted: { $ne: true },
  };
  const orgScopedRoles = new Set([
    "SUPER_ADMIN",
    "ADMIN",
    "CORPORATE_ADMIN",
    "FM_MANAGER",
    "PROPERTY_MANAGER",
  ]);

  if (orgScopedRoles.has(session.role)) {
    return filter;
  }

  if (session.role === "TECHNICIAN") {
    filter["assignment.assignedTo.userId"] = session.userId;
  } else if (session.role === "VENDOR") {
    filter["assignment.assignedTo.vendorId"] = session.userId;
  } else {
    filter["requester.userId"] = session.userId;
  }
  return filter;
}

function normalizePriority(priority: unknown): WorkOrderDoc["priority"] {
  if (typeof priority !== "string") {
    return "MEDIUM";
  }
  const upper = priority.toUpperCase();
  const allowed: WorkOrderDoc["priority"][] = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
    "CRITICAL",
  ];
  return allowed.includes(upper as WorkOrderDoc["priority"])
    ? (upper as WorkOrderDoc["priority"])
    : "MEDIUM";
}

export async function createWorkOrder(
  session: CopilotSession,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "createWorkOrder");
  await db;

  const title = String(input.title || "").trim();
  if (title.length < 3) {
    throw new Error("Title must be at least 3 characters long");
  }

  const propertyId =
    typeof input.propertyId === "string" ? input.propertyId.trim() : "";
  if (!propertyId) {
    throw new Error("propertyId is required to create a work order");
  }

  const now = new Date();
  const resolutionMinutes =
    typeof input.resolutionTimeMinutes === "number" &&
    input.resolutionTimeMinutes > 0
      ? input.resolutionTimeMinutes
      : DEFAULT_RESOLUTION_MINUTES;

  const doc = await WorkOrder.create({
    orgId: session.tenantId,
    title,
    description:
      typeof input.description === "string" &&
      input.description.trim().length > 0
        ? input.description
        : "No description provided",
    type: typeof input.type === "string" ? input.type : "MAINTENANCE",
    category: typeof input.category === "string" ? input.category : "GENERAL",
    subcategory:
      typeof input.subcategory === "string" ? input.subcategory : undefined,
    priority: normalizePriority(input.priority),
    location: {
      propertyId,
      unitNumber: typeof input.unitId === "string" ? input.unitId : undefined,
    },
    requester: {
      userId: session.userId,
      type: (typeof input.requesterType === "string"
        ? input.requesterType.toUpperCase()
        : inferRequesterType(session.role)) as RequesterType,
      name: session.name || "Copilot User",
      contactInfo: {
        email: session.email,
      },
    },
    assignment: {
      assignedBy: session.userId,
      assignedAt:
        input.assigneeUserId || input.assigneeVendorId ? now : undefined,
      assignedTo: {
        userId:
          typeof input.assigneeUserId === "string"
            ? input.assigneeUserId
            : undefined,
        vendorId:
          typeof input.assigneeVendorId === "string"
            ? input.assigneeVendorId
            : undefined,
      },
    },
    sla: {
      responseTimeMinutes: DEFAULT_RESPONSE_MINUTES,
      resolutionTimeMinutes: resolutionMinutes,
      responseDeadline: new Date(
        now.getTime() + DEFAULT_RESPONSE_MINUTES * 60 * 1000,
      ),
      resolutionDeadline: new Date(
        now.getTime() + resolutionMinutes * 60 * 1000,
      ),
      status: "ON_TIME",
    },
    status: "SUBMITTED",
    statusHistory: [
      {
        fromStatus: "DRAFT",
        toStatus: "SUBMITTED",
        changedBy: session.userId,
        changedAt: now,
        notes: "Created via Copilot assistant",
      },
    ],
    createdBy: session.userId,
  });

  return {
    success: true,
    message:
      session.locale === "ar"
        ? `تم إنشاء أمر العمل ${doc.workOrderNumber} بنجاح`
        : `Work order ${doc.workOrderNumber} has been created successfully`,
    intent: "createWorkOrder",
    data: {
      code: doc.workOrderNumber,
      id: doc._id?.toString?.() ?? doc._id,
      priority: doc.priority,
      status: doc.status,
    },
  };
}

export async function listMyWorkOrders(
  session: CopilotSession,
): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "listMyWorkOrders");
  await db;

  const filter = buildWorkOrderFilter(session);
  const limit = 20;
  type LeanWorkOrder = Pick<
    WorkOrderDoc,
    "workOrderNumber" | "title" | "status" | "priority" | "updatedAt"
  > & {
    _id: Types.ObjectId;
  };

  let leanResults: LeanWorkOrder[] = [];

  try {
    const query = WorkOrder.find(filter) as unknown;
    if (query && typeof (query as { sort?: unknown }).sort === "function") {
      leanResults = (await (query as {
        sort: (arg: unknown) => {
          limit: (n: number) => {
            select: (fields: string[]) => { lean: () => Promise<unknown> };
          };
        };
      })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select(["workOrderNumber", "title", "status", "priority", "updatedAt"])
        .lean()) as LeanWorkOrder[];
    } else if (Array.isArray(query)) {
      leanResults = query as LeanWorkOrder[];
    }
  } catch (error) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to fetch work orders", safeError);
    return {
      success: false,
      intent: "listMyWorkOrders",
      message:
        session.locale === "ar"
          ? "تعذر جلب أوامر العمل حالياً. يرجى المحاولة لاحقاً."
          : "Unable to fetch work orders right now. Please try again later.",
      data: [],
    };
  }

  const items = leanResults.map((item) => ({
    id: item._id.toString(),
    code: item.workOrderNumber,
    title: item.title,
    status: item.status,
    priority: item.priority,
    updatedAt: item.updatedAt,
  }));

  return {
    success: true,
    intent: "listMyWorkOrders",
    message:
      items.length === 0
        ? session.locale === "ar"
          ? "لا توجد أوامر عمل مرتبطة بك حالياً."
          : "No work orders linked to you yet."
        : session.locale === "ar"
          ? "إليك أحدث أوامر العمل الخاصة بك."
          : "Here are your most recent work orders.",
    data: items,
  };
}

export async function dispatchWorkOrder(
  session: CopilotSession,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "dispatchWorkOrder");
  await db;

  const workOrderId = String(input.workOrderId || "").trim();
  if (!workOrderId) {
    throw new Error("workOrderId is required");
  }

  // eslint-disable-next-line local/require-lean -- NO_LEAN: needs document for status check
  const current = await WorkOrder.findOne({
    _id: workOrderId,
    orgId: session.tenantId,
  });
  if (!current) {
    throw new Error("Work order not found");
  }

  const terminalStatuses = new Set([
    "CLOSED",
    "CANCELLED",
    "COMPLETED",
    "VERIFIED",
    "REJECTED",
  ]);
  if (terminalStatuses.has(current.status as string)) {
    throw new Error(`Cannot dispatch a work order in status ${current.status}`);
  }

  const requestedUserId =
    typeof input.assigneeUserId === "string"
      ? input.assigneeUserId.trim()
      : undefined;
  const requestedVendorId =
    typeof input.assigneeVendorId === "string"
      ? input.assigneeVendorId.trim()
      : undefined;
  const clearUser = input.assigneeUserId === null;
  const clearVendor = input.assigneeVendorId === null;

  const currentUserId = current.assignment?.assignedTo?.userId
    ? (
        current.assignment.assignedTo.userId as { toString(): string }
      ).toString()
    : undefined;
  const currentVendorId = current.assignment?.assignedTo?.vendorId
    ? (
        current.assignment.assignedTo.vendorId as { toString(): string }
      ).toString()
    : undefined;

  const setUpdate: Record<string, unknown> = {};

  const userChanged =
    requestedUserId !== undefined
      ? requestedUserId !== currentUserId
      : clearUser
        ? currentUserId !== undefined
        : false;
  const vendorChanged =
    requestedVendorId !== undefined
      ? requestedVendorId !== currentVendorId
      : clearVendor
        ? currentVendorId !== undefined
        : false;

  if (requestedUserId !== undefined || clearUser) {
    setUpdate["assignment.assignedTo.userId"] = requestedUserId ?? null;
  }

  if (requestedVendorId !== undefined || clearVendor) {
    setUpdate["assignment.assignedTo.vendorId"] = requestedVendorId ?? null;
  }

  const assignmentChanged = userChanged || vendorChanged;

  let nextStatus = current.status;
  if (assignmentChanged && current.status === "SUBMITTED") {
    nextStatus = "ASSIGNED";
  }
  const statusChanged = nextStatus !== current.status;

  if (assignmentChanged) {
    setUpdate["assignment.assignedBy"] = session.userId;
    setUpdate["assignment.assignedAt"] = new Date();
  }

  if (statusChanged) {
    setUpdate["status"] = nextStatus;
  }

  if (!assignmentChanged && !statusChanged) {
    return {
      success: true,
      intent: "dispatchWorkOrder",
      message:
        session.locale === "ar"
          ? "لا توجد تغييرات في الإسناد."
          : "No assignment changes were applied.",
      data: {
        code: current.workOrderNumber,
        status: current.status,
        assigneeUserId: current.assignment?.assignedTo?.userId,
        assigneeVendorId: current.assignment?.assignedTo?.vendorId,
      },
    };
  }

  const updatePayload: Record<string, unknown> = { $set: setUpdate };
  if (assignmentChanged || statusChanged) {
    updatePayload.$push = {
      statusHistory: {
        fromStatus: current.status,
        toStatus: nextStatus,
        changedBy: session.userId,
        changedAt: new Date(),
        notes: assignmentChanged
          ? "Assigned via Copilot assistant"
          : "Dispatch via Copilot assistant",
      },
    };
  }

  const updated = await WorkOrder.findByIdAndUpdate(
    current._id,
    updatePayload,
    { new: true },
  );

  if (!updated) {
    throw new Error("Work order not found");
  }

  return {
    success: true,
    intent: "dispatchWorkOrder",
    message:
      session.locale === "ar"
        ? `تم إسناد أمر العمل ${updated.workOrderNumber}`
        : `Work order ${updated.workOrderNumber} has been dispatched`,
    data: {
      code: updated.workOrderNumber,
      status: updated.status,
      assigneeUserId: updated.assignment?.assignedTo?.userId,
      assigneeVendorId: updated.assignment?.assignedTo?.vendorId,
    },
  };
}

export async function scheduleVisit(
  session: CopilotSession,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "scheduleVisit");
  await db;

  const workOrderId = String(input.workOrderId || "").trim();
  const scheduledForValue = input.scheduledFor;
  const scheduledFor = scheduledForValue
    ? new Date(scheduledForValue as string | number | Date)
    : undefined;
  if (!workOrderId || !scheduledFor || Number.isNaN(scheduledFor.getTime())) {
    throw new Error(
      "Valid workOrderId and scheduledFor timestamp are required",
    );
  }

  // eslint-disable-next-line local/require-lean -- NO_LEAN: needs document for status check
  const current = await WorkOrder.findOne({
    _id: workOrderId,
    orgId: session.tenantId,
  });
  if (!current) {
    throw new Error("Work order not found");
  }

  const existingResolution = current.sla?.resolutionDeadline
    ? new Date(current.sla.resolutionDeadline)
    : undefined;
  const computedResolutionDeadline = existingResolution
    ? new Date(Math.min(existingResolution.getTime(), scheduledFor.getTime()))
    : scheduledFor;

  const scheduledDateChanged =
    !current.assignment?.scheduledDate ||
    new Date(current.assignment.scheduledDate).getTime() !==
      scheduledFor.getTime();
  const resolutionChanged =
    !existingResolution ||
    computedResolutionDeadline.getTime() !== existingResolution.getTime();

  if (!scheduledDateChanged && !resolutionChanged) {
    return {
      success: true,
      intent: "scheduleVisit",
      message:
        session.locale === "ar"
          ? "لا توجد تغييرات في الموعد."
          : "Visit schedule is already up to date.",
      data: {
        code: current.workOrderNumber,
        dueAt: current.sla?.resolutionDeadline,
      },
    };
  }

  const updated = await WorkOrder.findByIdAndUpdate(
    current._id,
    {
      $set: {
        "assignment.scheduledDate": scheduledFor,
        "sla.resolutionDeadline": computedResolutionDeadline,
      },
      $push: {
        statusHistory: {
          fromStatus: current.status,
          toStatus: current.status,
          changedBy: session.userId,
          changedAt: new Date(),
          notes: "Visit scheduled via Copilot",
        },
      },
    },
    { new: true },
  );

  if (!updated) {
    throw new Error("Work order not found");
  }

  return {
    success: true,
    intent: "scheduleVisit",
    message:
      session.locale === "ar"
        ? `تم تحديد موعد الزيارة في ${scheduledFor.toLocaleString("ar-SA")}`
        : `Visit scheduled for ${scheduledFor.toLocaleString()}`,
    data: {
      code: updated.workOrderNumber,
      dueAt: updated.sla?.resolutionDeadline,
    },
  };
}

export async function uploadWorkOrderPhoto(
  session: CopilotSession,
  payload: UploadPayload,
): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "uploadWorkOrderPhoto");
  await db;

  if (!payload.workOrderId) {
    throw new Error("workOrderId is required");
  }

  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);
  const normalizedMime = (payload.mimeType || "").toLowerCase();

  if (payload.buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("File too large. Maximum allowed size is 10 MB.");
  }

  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new Error("Unsupported file type. Allowed: JPEG, PNG, WEBP, PDF.");
  }

  const current = await WorkOrder.findOne({
    _id: payload.workOrderId,
    orgId: session.tenantId,
  })
    .select(["workOrderNumber", "attachments"])
    .lean<{ workOrderNumber?: string; attachments?: Array<unknown> } | null>();

  if (!current) {
    throw new Error("Work order not found");
  }

  const MAX_ATTACHMENTS = 20;
  const currentAttachments = Array.isArray(current.attachments)
    ? current.attachments.length
    : 0;
  if (currentAttachments >= MAX_ATTACHMENTS) {
    throw new Error("Attachment limit reached for this work order");
  }

  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "work-orders",
  );
  await fs.mkdir(uploadsDir, { recursive: true });

  const safeName = `${Date.now()}-${randomUUID()}-${payload.fileName.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
  const fullPath = path.join(uploadsDir, safeName);
  await fs.writeFile(fullPath, payload.buffer);

  const attachment = {
    url: `/uploads/work-orders/${safeName}`,
    name: payload.fileName,
    type: payload.mimeType,
    size: payload.buffer.length,
  };

  const updated = await WorkOrder.findOneAndUpdate(
    { _id: payload.workOrderId, orgId: session.tenantId },
    { $push: { attachments: attachment } },
    { new: true },
  );

  if (!updated) {
    throw new Error("Work order not found");
  }

  return {
    success: true,
    intent: "uploadWorkOrderPhoto",
    message:
      session.locale === "ar"
        ? "تم رفع الصورة وربطها بأمر العمل."
        : "Photo uploaded and linked to the work order.",
    data: {
      code: updated.workOrderNumber,
      attachment,
    },
  };
}
