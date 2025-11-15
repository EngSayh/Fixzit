import { randomUUID } from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { db } from "@/lib/mongo";
import { WorkOrder } from "@/server/models/WorkOrder";
import { OwnerStatement } from "@/server/models/OwnerStatement";
import { CopilotSession } from "./session";
import { getPermittedTools } from "./policy";
import { logger } from "@/lib/logger";

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

async function ensureToolAllowed(session: CopilotSession, tool: string) {
  const allowed = getPermittedTools(session.role);
  if (!allowed.includes(tool)) {
    const error = new Error("Tool not permitted for this role") as Error & { code: string };
    error.code = "FORBIDDEN";
    throw error;
  }
}

function buildWorkOrderFilter(session: CopilotSession) {
  const filter: Record<string, unknown> = { tenantId: session.tenantId, deletedAt: { $exists: false } };
  if (session.role === "TECHNICIAN") {
    filter.assigneeUserId = session.userId;
  } else if (session.role === "VENDOR") {
    filter.assigneeVendorId = session.userId;
  } else {
    filter.createdBy = session.userId;
  }
  return filter;
}

async function createWorkOrder(session: CopilotSession, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "createWorkOrder");
  await db;

  const title = String(input.title || "").trim();
  if (title.length < 3) {
    throw new Error("Title must be at least 3 characters long");
  }

  const seq = Math.floor((Date.now() / 1000) % 100000);
  const code = `WO-${new Date().getFullYear()}-${seq}`;

  const doc = await WorkOrder.create({
    tenantId: session.tenantId,
    code,
    title,
    description: input.description,
    priority: input.priority || "MEDIUM",
    propertyId: input.propertyId,
    unitId: input.unitId,
    requester: {
      type: input.requesterType || "TENANT",
      id: session.userId,
      name: session.name,
      email: session.email
    },
    status: "SUBMITTED",
    statusHistory: [{ from: "DRAFT", to: "SUBMITTED", byUserId: session.userId, at: new Date() }],
    createdBy: session.userId
  });

  return {
    success: true,
    message: session.locale === "ar"
      ? `تم إنشاء أمر العمل ${doc.code} بنجاح`
      : `Work order ${doc.code} has been created successfully`,
    intent: "createWorkOrder",
    data: {
      code: doc.code,
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
  interface WorkOrderResult {
    _id?: { toString?: () => string } | string;
    code: string;
    title: string;
    status: string;
    priority: string;
    updatedAt: Date;
  }
  const items = await WorkOrder.find(filter).then((results: WorkOrderResult[]) =>
    results
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(item => ({
        id: item._id?.toString?.() ?? item._id,
        code: item.code,
        title: item.title,
        status: item.status,
        priority: item.priority,
        updatedAt: item.updatedAt
      }))
  ).catch((error: unknown) => {
    logger.error('Failed to fetch work orders', error instanceof Error ? error : new Error(String(error)));
    return []; // Return empty array on error
  });

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

  const update: Record<string, unknown> = {
    status: "DISPATCHED"
  };

  if (input.assigneeUserId) {
    update.assigneeUserId = input.assigneeUserId;
  }
  if (input.assigneeVendorId) {
    update.assigneeVendorId = input.assigneeVendorId;
  }

  const updated = await WorkOrder.findOneAndUpdate(
    { _id: workOrderId, tenantId: session.tenantId },
    { $set: update, $push: { statusHistory: { from: "SUBMITTED", to: "DISPATCHED", byUserId: session.userId, at: new Date() } } },
    { new: true }
  );

  if (!updated) {
    throw new Error("Work order not found");
  }

  return {
    success: true,
    intent: "dispatchWorkOrder",
    message: session.locale === "ar"
      ? `تم إسناد أمر العمل ${updated.code}`
      : `Work order ${updated.code} has been dispatched`,
    data: {
      code: updated.code,
      status: updated.status,
      assigneeUserId: updated.assigneeUserId,
      assigneeVendorId: updated.assigneeVendorId
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

  const updated = await WorkOrder.findOneAndUpdate(
    { _id: workOrderId, tenantId: session.tenantId },
    { $set: { dueAt: scheduledFor }, $push: { statusHistory: { from: "DISPATCHED", to: "DISPATCHED", note: "Scheduled visit", byUserId: session.userId, at: new Date() } } },
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
      code: updated.code,
      dueAt: updated.dueAt
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
    { _id: payload.workOrderId, tenantId: session.tenantId },
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
      code: updated.code,
      attachment
    }
  };
}

async function ownerStatements(session: CopilotSession, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "ownerStatements");
  await db;

  const ownerId = input.ownerId || session.userId;
  const year = Number(input.year) || new Date().getFullYear();
  const period = input.period || "YTD";

  const { OwnerStatement } = await import('@/server/models/OwnerStatement') as any;

  interface StatementDoc {
    tenantId: string;
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
    tenantId: session.tenantId,
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

  if (/^\/owner-statements/i.test(normalized)) {
    const [, period] = normalized.split(" ");
    return { name: "ownerStatements", args: period ? { period } : {} };
  }

  return null;
}

