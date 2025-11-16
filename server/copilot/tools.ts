import { randomUUID } from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { db } from "@/lib/mongo";
import { WorkOrder, WorkOrderDoc } from "@/server/models/WorkOrder";
import { OwnerStatement } from "@/server/models/OwnerStatement";
import { CopilotSession } from "./session";
import { getPermittedTools } from "./policy";
import { logger } from "@/lib/logger";
import { Types } from "mongoose";

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
  intent: string;
}

export interface UploadPayload {
  workOrderId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

const DEFAULT_RESPONSE_MINUTES = 120;
const DEFAULT_RESOLUTION_MINUTES = 72 * 60;

type RequesterType = "TENANT" | "OWNER" | "STAFF" | "EXTERNAL";

async function ensureToolAllowed(session: CopilotSession, tool: string) {
  const allowed = getPermittedTools(session.role);
  if (!allowed.includes(tool)) {
    const error = new Error("Tool not permitted for this role") as Error & { code: string };
    error.code = "FORBIDDEN";
    throw error;
  }
}

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
  const filter: Record<string, unknown> = { orgId: session.tenantId, isDeleted: { $ne: true } };
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
  const allowed: WorkOrderDoc["priority"][] = ["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"];
  return allowed.includes(upper as WorkOrderDoc["priority"]) ? (upper as WorkOrderDoc["priority"]) : "MEDIUM";
}

async function createWorkOrder(session: CopilotSession, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "createWorkOrder");
  await db;

  const title = String(input.title || "").trim();
  if (title.length < 3) {
    throw new Error("Title must be at least 3 characters long");
  }

  const propertyId = typeof input.propertyId === "string" ? input.propertyId.trim() : "";
  if (!propertyId) {
    throw new Error("propertyId is required to create a work order");
  }

  const now = new Date();
  const resolutionMinutes =
    typeof input.resolutionTimeMinutes === "number" && input.resolutionTimeMinutes > 0
      ? input.resolutionTimeMinutes
      : DEFAULT_RESOLUTION_MINUTES;

  const doc = await WorkOrder.create({
    orgId: session.tenantId,
    title,
    description: typeof input.description === "string" && input.description.trim().length > 0
      ? input.description
      : "No description provided",
    type: typeof input.type === "string" ? input.type : "MAINTENANCE",
    category: typeof input.category === "string" ? input.category : "GENERAL",
    subcategory: typeof input.subcategory === "string" ? input.subcategory : undefined,
    priority: normalizePriority(input.priority),
    location: {
      propertyId,
      unitNumber: typeof input.unitId === "string" ? input.unitId : undefined
    },
    requester: {
      userId: session.userId,
      type: (typeof input.requesterType === "string"
        ? input.requesterType.toUpperCase()
        : inferRequesterType(session.role)) as RequesterType,
      name: session.name || "Copilot User",
      contactInfo: {
        email: session.email
      }
    },
    assignment: {
      assignedBy: session.userId,
      assignedAt: input.assigneeUserId || input.assigneeVendorId ? now : undefined,
      assignedTo: {
        userId: typeof input.assigneeUserId === "string" ? input.assigneeUserId : undefined,
        vendorId: typeof input.assigneeVendorId === "string" ? input.assigneeVendorId : undefined
      }
    },
    sla: {
      responseTimeMinutes: DEFAULT_RESPONSE_MINUTES,
      resolutionTimeMinutes: resolutionMinutes,
      responseDeadline: new Date(now.getTime() + DEFAULT_RESPONSE_MINUTES * 60 * 1000),
      resolutionDeadline: new Date(now.getTime() + resolutionMinutes * 60 * 1000),
      status: "ON_TIME"
    },
    status: "SUBMITTED",
    statusHistory: [{
      fromStatus: "DRAFT",
      toStatus: "SUBMITTED",
      changedBy: session.userId,
      changedAt: now,
      notes: "Created via Copilot assistant"
    }],
    createdBy: session.userId
  });

  return {
    success: true,
    message: session.locale === "ar"
      ? `تم إنشاء أمر العمل ${doc.workOrderNumber} بنجاح`
      : `Work order ${doc.workOrderNumber} has been created successfully`,
    intent: "createWorkOrder",
    data: {
      code: doc.workOrderNumber,
      id: doc._id?.toString?.() ?? doc._id,
      priority: doc.priority,
      status: doc.status
    }
  };
}

async function listMyWorkOrders(session: CopilotSession): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "listMyWorkOrders");
  await db;

  const filter = buildWorkOrderFilter(session);
  type LeanWorkOrder = Pick<WorkOrderDoc, "workOrderNumber" | "title" | "status" | "priority" | "updatedAt"> & {
    _id: Types.ObjectId;
  };

  let leanResults: LeanWorkOrder[] = [];
  try {
    leanResults = (await WorkOrder.find(filter)
      .sort({ updatedAt: -1 })
      .limit(5)
      .select(["workOrderNumber", "title", "status", "priority", "updatedAt"])
      .lean()) as LeanWorkOrder[];
  } catch (error) {
    logger.error('Failed to fetch work orders', error instanceof Error ? error : new Error(String(error)));
  }

  const items = leanResults.map((item) => ({
    id: item._id.toString(),
    code: item.workOrderNumber,
    title: item.title,
    status: item.status,
    priority: item.priority,
    updatedAt: item.updatedAt
  }));

  return {
    success: true,
    intent: "listMyWorkOrders",
    message: items.length === 0
      ? (session.locale === "ar" ? "لا توجد أوامر عمل مرتبطة بك حالياً." : "No work orders linked to you yet.")
      : (session.locale === "ar" ? "إليك أحدث أوامر العمل الخاصة بك." : "Here are your most recent work orders."),
    data: items
  };
}

async function dispatchWorkOrder(session: CopilotSession, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "dispatchWorkOrder");
  await db;

  const workOrderId = String(input.workOrderId || "").trim();
  if (!workOrderId) {
    throw new Error("workOrderId is required");
  }

  const current = await WorkOrder.findOne({ _id: workOrderId, orgId: session.tenantId });
  if (!current) {
    throw new Error("Work order not found");
  }

  const hasAssignee = typeof input.assigneeUserId === "string" || typeof input.assigneeVendorId === "string";
  const nextStatus = hasAssignee ? "ASSIGNED" : current.status;
  const setUpdate: Record<string, unknown> = {
    status: nextStatus,
    "assignment.assignedBy": session.userId,
    "assignment.assignedAt": new Date(),
  };

  if (typeof input.assigneeUserId === "string") {
    setUpdate["assignment.assignedTo.userId"] = input.assigneeUserId;
  } else if (input.assigneeUserId === null) {
    setUpdate["assignment.assignedTo.userId"] = null;
  }

  if (typeof input.assigneeVendorId === "string") {
    setUpdate["assignment.assignedTo.vendorId"] = input.assigneeVendorId;
  } else if (input.assigneeVendorId === null) {
    setUpdate["assignment.assignedTo.vendorId"] = null;
  }

  const updated = await WorkOrder.findByIdAndUpdate(
    current._id,
    {
      $set: setUpdate,
      $push: {
        statusHistory: {
          fromStatus: current.status,
          toStatus: nextStatus,
          changedBy: session.userId,
          changedAt: new Date(),
          notes: "Assigned via Copilot assistant"
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    throw new Error("Work order not found");
  }

  return {
    success: true,
    intent: "dispatchWorkOrder",
    message: session.locale === "ar"
      ? `تم إسناد أمر العمل ${updated.workOrderNumber}`
      : `Work order ${updated.workOrderNumber} has been dispatched`,
    data: {
      code: updated.workOrderNumber,
      status: updated.status,
      assigneeUserId: updated.assignment?.assignedTo?.userId,
      assigneeVendorId: updated.assignment?.assignedTo?.vendorId
    }
  };
}

async function scheduleVisit(session: CopilotSession, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "scheduleVisit");
  await db;

  const workOrderId = String(input.workOrderId || "").trim();
  const scheduledForValue = input.scheduledFor;
  const scheduledFor = scheduledForValue ? new Date(scheduledForValue as string | number | Date) : undefined;
  if (!workOrderId || !scheduledFor || Number.isNaN(scheduledFor.getTime())) {
    throw new Error("Valid workOrderId and scheduledFor timestamp are required");
  }

  const current = await WorkOrder.findOne({ _id: workOrderId, orgId: session.tenantId });
  if (!current) {
    throw new Error("Work order not found");
  }

  const updated = await WorkOrder.findByIdAndUpdate(
    current._id,
    {
      $set: {
        "assignment.scheduledDate": scheduledFor,
        "sla.resolutionDeadline": scheduledFor
      },
      $push: {
        statusHistory: {
          fromStatus: current.status,
          toStatus: current.status,
          changedBy: session.userId,
          changedAt: new Date(),
          notes: "Visit scheduled via Copilot"
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    throw new Error("Work order not found");
  }

  return {
    success: true,
    intent: "scheduleVisit",
    message: session.locale === "ar"
      ? `تم تحديد موعد الزيارة في ${scheduledFor.toLocaleString('ar-SA')}`
      : `Visit scheduled for ${scheduledFor.toLocaleString()}`,
    data: {
      code: updated.workOrderNumber,
      dueAt: updated.sla?.resolutionDeadline
    }
  };
}

async function uploadWorkOrderPhoto(session: CopilotSession, payload: UploadPayload): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "uploadWorkOrderPhoto");
  await db;

  if (!payload.workOrderId) {
    throw new Error("workOrderId is required");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "work-orders");
  await fs.mkdir(uploadsDir, { recursive: true });

  const safeName = `${Date.now()}-${randomUUID()}-${payload.fileName.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
  const fullPath = path.join(uploadsDir, safeName);
  await fs.writeFile(fullPath, payload.buffer);

  const attachment = {
    url: `/uploads/work-orders/${safeName}`,
    name: payload.fileName,
    type: payload.mimeType,
    size: payload.buffer.length
  };

  const updated = await WorkOrder.findOneAndUpdate(
    { _id: payload.workOrderId, orgId: session.tenantId },
    { $push: { attachments: attachment } },
    { new: true }
  );

  if (!updated) {
    throw new Error("Work order not found");
  }

  return {
    success: true,
    intent: "uploadWorkOrderPhoto",
    message: session.locale === "ar"
      ? "تم رفع الصورة وربطها بأمر العمل."
      : "Photo uploaded and linked to the work order.",
    data: {
      code: updated.workOrderNumber,
      attachment
    }
  };
}

async function approveQuotation(session: CopilotSession, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "approveQuotation");
  await db;

  const quotationId = input.quotationId as string;
  if (!quotationId) {
    return {
      success: false,
      message: session.locale === 'ar' 
        ? 'معرف عرض السعر مطلوب' 
        : 'Quotation ID is required',
      intent: 'approveQuotation'
    };
  }

  // Find quotation (placeholder - implement with actual Quotation model)
  logger.info(`[approveQuotation] Approving quotation ${quotationId} for org ${session.tenantId}`);
  
  // TODO: Implement actual quotation approval logic:
  // 1. Verify quotation exists and belongs to orgId
  // 2. Check user has permission (owner/finance/admin)
  // 3. Update quotation status to 'approved'
  // 4. Create work order from approved quotation
  // 5. Send notification to vendor
  // 6. Log audit trail

  return {
    success: true,
    message: session.locale === 'ar'
      ? `تمت الموافقة على عرض السعر ${quotationId} بنجاح`
      : `Quotation ${quotationId} approved successfully`,
    intent: 'approveQuotation',
    data: { quotationId, status: 'approved' }
  };
}

async function ownerStatements(session: CopilotSession, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "ownerStatements");
  await db;

  const ownerId = input.ownerId || session.userId;
  const year = Number(input.year) || new Date().getFullYear();
  const period = input.period || "YTD";

  interface StatementDoc {
    orgId: string;
    ownerId: string;
    period: string;
    year: number;
    currency: string;
    totals?: { income?: number; expenses?: number; net?: number };
    lineItems?: Array<{
      date: Date;
      description: string;
      type: string;
      amount: number;
      reference?: string;
    }>;
  }

  const statements = await OwnerStatement.find({
    orgId: session.tenantId,
    ownerId,
    ...(period !== "YTD" ? { period } : {}),
    ...(year ? { year } : {})
  }) as unknown as StatementDoc[];

  if (!statements || statements.length === 0) {
    return {
      success: true,
      intent: "ownerStatements",
      message: session.locale === "ar"
        ? "لا تتوفر بيانات حالياً لهذه الفترة."
        : "No statement data is available for the selected period.",
      data: []
    };
  }

  const totals = statements.reduce((acc, stmt) => {
    acc.income += stmt.totals?.income || 0;
    acc.expenses += stmt.totals?.expenses || 0;
    acc.net += stmt.totals?.net || 0;
    return acc;
  }, { income: 0, expenses: 0, net: 0 });

  return {
    success: true,
    intent: "ownerStatements",
    message: session.locale === "ar"
      ? "تم تجهيز ملخص بيان المالك."
      : "Owner statement summary is ready.",
    data: {
      currency: statements[0].currency,
      totals,
      statements: statements.map((stmt) => ({
        period: stmt.period,
        year: stmt.year,
        totals: stmt.totals,
        lineItems: stmt.lineItems?.map((item) => ({
          date: item.date,
          description: item.description,
          type: item.type,
          amount: item.amount,
          reference: item.reference
        })) || []
      }))
    }
  };
}

export async function executeTool(tool: string, input: Record<string, unknown>, session: CopilotSession): Promise<ToolExecutionResult> {
  switch (tool) {
    case "createWorkOrder":
      return createWorkOrder(session, input);
    case "listMyWorkOrders":
      return listMyWorkOrders(session);
    case "dispatchWorkOrder":
      return dispatchWorkOrder(session, input);
    case "scheduleVisit":
      return scheduleVisit(session, input);
    case "uploadWorkOrderPhoto":
      // Validate input matches UploadPayload structure before calling
      if (!input.workOrderId || !input.fileName || !input.mimeType || !input.buffer) {
        throw new Error('Invalid upload payload: missing required fields');
      }
      return uploadWorkOrderPhoto(session, input as unknown as UploadPayload);
    case "approveQuotation":
      return approveQuotation(session, input);
    case "ownerStatements":
      return ownerStatements(session, input);
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }
}

export function detectToolFromMessage(message: string): { name: string; args: Record<string, unknown> } | null {
  const normalized = message.trim();
  if (normalized.startsWith("/new-ticket")) {
    const parts = normalized.split(" ").slice(1);
    const args: Record<string, string> = {};
    for (const part of parts) {
      const [key, ...rest] = part.split(":");
      if (key && rest.length) {
        args[key] = rest.join(":");
      }
    }
    return { name: "createWorkOrder", args };
  }

  if (/^\/my-?tickets?/i.test(normalized)) {
    return { name: "listMyWorkOrders", args: {} };
  }

  if (/^\/dispatch/i.test(normalized)) {
    const [, workOrderId] = normalized.split(" ");
    if (workOrderId) {
      return { name: "dispatchWorkOrder", args: { workOrderId } };
    }
  }

  if (/approve.*quotation|quotation.*approve|موافقة.*عرض/i.test(normalized)) {
    const quotationIdMatch = normalized.match(/(?:quotation|عرض)\s*[#:]?\s*([A-Z0-9-]+)/i);
    const quotationId = quotationIdMatch ? quotationIdMatch[1] : undefined;
    return { name: "approveQuotation", args: quotationId ? { quotationId } : {} };
  }

  if (/^\/owner-statements/i.test(normalized)) {
    const [, period] = normalized.split(" ");
    return { name: "ownerStatements", args: period ? { period } : {} };
  }

  return null;
}
