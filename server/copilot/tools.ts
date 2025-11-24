import { randomUUID } from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { db } from "@/lib/mongo";
import { WorkOrder, WorkOrderDoc } from "@/server/models/WorkOrder";
import { OwnerStatement } from "@/server/models/OwnerStatement";
import { CopilotSession } from "./session";
import { getPermittedTools } from "./policy";
import { recordAudit } from "./audit";
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

// Shared lean type for FMApproval documents
type ApprovalLean = {
  _id?: Types.ObjectId | string;
  approverId?: Types.ObjectId | string;
  approverName?: string;
  approverEmail?: string;
  status?: string;
  stages?: Array<{
    approvers?: Array<{ toString(): string } | string>;
    status?: string;
  }>;
};

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
  const limit = 20;
  type LeanWorkOrder = Pick<WorkOrderDoc, "workOrderNumber" | "title" | "status" | "priority" | "updatedAt"> & {
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
    logger.error('Failed to fetch work orders', safeError);
    return {
      success: false,
      intent: "listMyWorkOrders",
      message: session.locale === "ar"
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

  const terminalStatuses = new Set(["CLOSED", "CANCELLED", "COMPLETED", "VERIFIED", "REJECTED"]);
  if (terminalStatuses.has(current.status as string)) {
    throw new Error(`Cannot dispatch a work order in status ${current.status}`);
  }

  const requestedUserId = typeof input.assigneeUserId === "string" ? input.assigneeUserId.trim() : undefined;
  const requestedVendorId = typeof input.assigneeVendorId === "string" ? input.assigneeVendorId.trim() : undefined;
  const clearUser = input.assigneeUserId === null;
  const clearVendor = input.assigneeVendorId === null;

  const currentUserId = current.assignment?.assignedTo?.userId
    ? (current.assignment.assignedTo.userId as { toString(): string }).toString()
    : undefined;
  const currentVendorId = current.assignment?.assignedTo?.vendorId
    ? (current.assignment.assignedTo.vendorId as { toString(): string }).toString()
    : undefined;

  const setUpdate: Record<string, unknown> = {};

  const userChanged = requestedUserId !== undefined
    ? requestedUserId !== currentUserId
    : clearUser
      ? currentUserId !== undefined
      : false;
  const vendorChanged = requestedVendorId !== undefined
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
      message: session.locale === "ar"
        ? "لا توجد تغييرات في الإسناد."
        : "No assignment changes were applied.",
      data: {
        code: current.workOrderNumber,
        status: current.status,
        assigneeUserId: current.assignment?.assignedTo?.userId,
        assigneeVendorId: current.assignment?.assignedTo?.vendorId
      }
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
        notes: assignmentChanged ? "Assigned via Copilot assistant" : "Dispatch via Copilot assistant"
      }
    };
  }

  const updated = await WorkOrder.findByIdAndUpdate(
    current._id,
    updatePayload,
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

  const existingResolution = current.sla?.resolutionDeadline
    ? new Date(current.sla.resolutionDeadline)
    : undefined;
  const computedResolutionDeadline = existingResolution
    ? new Date(Math.min(existingResolution.getTime(), scheduledFor.getTime()))
    : scheduledFor;

  const scheduledDateChanged = !current.assignment?.scheduledDate
    || new Date(current.assignment.scheduledDate).getTime() !== scheduledFor.getTime();
  const resolutionChanged = !existingResolution
    || computedResolutionDeadline.getTime() !== existingResolution.getTime();

  if (!scheduledDateChanged && !resolutionChanged) {
    return {
      success: true,
      intent: "scheduleVisit",
      message: session.locale === "ar"
        ? "لا توجد تغييرات في الموعد."
        : "Visit schedule is already up to date.",
      data: {
        code: current.workOrderNumber,
        dueAt: current.sla?.resolutionDeadline
      }
    };
  }

  const updated = await WorkOrder.findByIdAndUpdate(
    current._id,
    {
      $set: {
        "assignment.scheduledDate": scheduledFor,
        "sla.resolutionDeadline": computedResolutionDeadline
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

  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  const normalizedMime = (payload.mimeType || "").toLowerCase();

  if (payload.buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("File too large. Maximum allowed size is 10 MB.");
  }

  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new Error("Unsupported file type. Allowed: JPEG, PNG, WEBP, PDF.");
  }

  const current = await WorkOrder.findOne({ _id: payload.workOrderId, orgId: session.tenantId })
    .select(["workOrderNumber", "attachments"])
    .lean<{ workOrderNumber?: string; attachments?: Array<unknown> } | null>();

  if (!current) {
    throw new Error("Work order not found");
  }

  const MAX_ATTACHMENTS = 20;
  const currentAttachments = Array.isArray(current.attachments) ? current.attachments.length : 0;
  if (currentAttachments >= MAX_ATTACHMENTS) {
    throw new Error("Attachment limit reached for this work order");
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

  const intent = 'approveQuotation';
  const quotationId = typeof input.quotationId === 'string' ? input.quotationId.trim() : '';

  if (!quotationId || !Types.ObjectId.isValid(quotationId)) {
    const message = session.locale === 'ar'
      ? 'معرف عرض السعر غير صالح'
      : 'A valid quotation ID is required';
    await recordAudit({
      session,
      intent,
      tool: intent,
      status: "DENIED",
      message,
      metadata: { quotationId }
    });
    return {
      success: false,
      message,
      intent,
    };
  }

  type QuotationLean = {
    _id?: Types.ObjectId | string;
    status?: string;
    work_order_id?: Types.ObjectId | string;
  };

  try {
    const [{ FMQuotation }, { FMApproval }, { User }] = await Promise.all([
      import('@/domain/fm/fm.behavior'),
      import('@/server/models/FMApproval'),
      import('@/server/models/User'),
    ]);

    const quotationObjectId = new Types.ObjectId(quotationId);
    const quotation = await FMQuotation.findOne({
      _id: quotationObjectId,
      org_id: session.tenantId,
    }).lean<QuotationLean | null>();

    if (!quotation) {
      const message = session.locale === 'ar'
        ? 'لم يتم العثور على عرض السعر في المستأجر الخاص بك'
        : 'Quotation not found for your organization';
      await recordAudit({
        session,
        intent,
        tool: intent,
        status: "DENIED",
        message,
        metadata: { quotationId }
      });
      return {
        success: false,
        message,
        intent,
      };
    }

    if (quotation.status === 'APPROVED') {
      const message = session.locale === 'ar'
        ? 'تمت الموافقة على هذا العرض مسبقاً'
        : 'This quotation has already been approved';
      await recordAudit({
        session,
        intent,
        tool: intent,
        status: "SUCCESS",
        message,
        metadata: { quotationId, status: quotation.status }
      });
      return {
        success: true,
        message,
        intent,
        data: { quotationId, status: 'approved' }
      };
    }

    const approval = await FMApproval.findOne({
      orgId: session.tenantId,
      entityId: quotationObjectId,
      $or: [{ entityType: 'Quotation' }, { type: 'QUOTATION' }],
      status: 'PENDING',
    }).lean<ApprovalLean | null>();

    const privilegedRoles = new Set([
      'SUPER_ADMIN',
      'ADMIN',
      'CORPORATE_ADMIN',
      'FINANCE',
      'FM_MANAGER',
      'PROCUREMENT',
      'PROPERTY_MANAGER',
      'OWNER',
    ]);
    const isPrivileged = privilegedRoles.has(session.role);
    const isStageApprover = approval
      ? approval.approverId?.toString() === session.userId ||
        (Array.isArray(approval.stages) &&
          approval.stages.some((stage: { approvers?: Array<{ toString(): string } | string>; status?: string }) => {
            const stageApprovers = stage?.approvers ?? [];
            return stageApprovers.some((approver: { toString(): string } | string) => {
              const approverId = typeof approver === 'string' ? approver : approver?.toString?.();
              return approverId === session.userId;
            });
          }))
      : false;

    if (!approval) {
      const message = session.locale === 'ar'
        ? 'لا يوجد مسار اعتماد نشط لهذا العرض'
        : 'No active approval workflow exists for this quotation';
      await recordAudit({
        session,
        intent,
        tool: intent,
        status: "DENIED",
        message,
        metadata: { quotationId }
      });
      return {
        success: false,
        message,
        intent,
      };
    }

    if (!isPrivileged && !isStageApprover) {
      const message = session.locale === 'ar'
        ? 'ليست لديك صلاحية اعتماد هذا العرض'
        : 'You are not authorized to approve this quotation';
      await recordAudit({
        session,
        intent,
        tool: intent,
        status: "DENIED",
        message,
        metadata: { quotationId, approvalId: approval?._id ? approval._id.toString() : undefined }
      });
      return {
        success: false,
        message,
        intent,
      };
    }

    const now = new Date();
    const updatedQuotation = await FMQuotation.findOneAndUpdate(
      { _id: quotationObjectId, org_id: session.tenantId, status: { $ne: 'APPROVED' } },
      {
        $set: {
          status: 'APPROVED',
          approved_by_user_id: Types.ObjectId.isValid(session.userId)
            ? new Types.ObjectId(session.userId)
            : session.userId,
          approved_at: now,
        },
      },
      { new: true }
    ).lean<QuotationLean | null>();

    if (!updatedQuotation) {
      throw new Error('Failed to update quotation status');
    }

    if (approval) {
      const historyEntry = {
        timestamp: now,
        action: 'APPROVED',
        actorId: Types.ObjectId.isValid(session.userId)
          ? new Types.ObjectId(session.userId)
          : session.userId,
        actorName: session.name ?? 'Copilot User',
        previousStatus: approval.status,
        newStatus: 'APPROVED',
        notes: 'Approved via Copilot assistant',
      };

      await FMApproval.findByIdAndUpdate(approval._id, {
        $set: {
          status: 'APPROVED',
          decision: 'APPROVE',
          decisionDate: now,
          approverId: Types.ObjectId.isValid(session.userId)
            ? new Types.ObjectId(session.userId)
            : session.userId,
          approverName: session.name ?? approval.approverName,
          approverEmail: session.email ?? approval.approverEmail,
        },
        $push: { history: historyEntry },
      }, { new: true, runValidators: true });
    }

    // Notify requester (best-effort, background)
    void (async () => {
      try {
        if (!quotation.work_order_id) return;

        const workOrder = await WorkOrder.findById(quotation.work_order_id)
          .select(['requester'])
          .lean<{ requester?: { userId?: unknown } } | null>();

        const requesterId = workOrder?.requester?.userId
          ? typeof workOrder.requester.userId === 'string'
            ? workOrder.requester.userId
            : (workOrder.requester.userId as { toString(): string }).toString()
          : undefined;

        if (!requesterId) return;

        const requester = await User.findById(requesterId)
          .select(['email', 'personal.firstName', 'personal.lastName'])
          .lean<{ email?: string; personal?: { firstName?: string; lastName?: string } } | null>();

        if (!requester?.email) return;

        const { JobQueue } = await import('@/lib/jobs/queue');
        await JobQueue.enqueue('email-notification', {
          to: requester.email,
          subject: `Quotation ${quotationId} approved`,
          html: `
            <p>Hello ${[requester.personal?.firstName, requester.personal?.lastName].filter(Boolean).join(' ') || 'there'},</p>
            <p>Quotation #${quotationId} has been approved and is ready for processing.</p>
            <p>Approved by: ${session.name || 'Approver'}.</p>
          `,
        });
      } catch (error) {
        logger.error('[approveQuotation] Failed to enqueue approval notification', error as Error, {
          quotationId,
        });
      }
    })();

    const successMessage = session.locale === 'ar'
      ? `تمت الموافقة على عرض السعر ${quotationId} بنجاح`
      : `Quotation ${quotationId} approved successfully`;

    await recordAudit({
      session,
      intent,
      tool: intent,
      status: "SUCCESS",
      message: successMessage,
      metadata: {
        quotationId,
        approvalId: approval?._id?.toString(),
        workOrderId: quotation.work_order_id?.toString?.(),
      },
    });

    return {
      success: true,
      message: successMessage,
      intent,
      data: { quotationId, status: 'approved' }
    };
  } catch (error) {
    const message = session.locale === 'ar'
      ? 'تعذر اعتماد عرض السعر'
      : 'Unable to approve the quotation';

    logger.error('[approveQuotation] Failed to approve quotation', error as Error, { quotationId });
    await recordAudit({
      session,
      intent,
      tool: intent,
      status: "ERROR",
      message,
      metadata: { quotationId, error: error instanceof Error ? error.message : String(error) },
    });

    return {
      success: false,
      message,
      intent,
    };
  }
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
    let currentKey: string | null = null;

    for (const part of parts) {
      if (part.includes(":")) {
        const [key, ...rest] = part.split(":");
        if (key && rest.length) {
          currentKey = key;
          args[currentKey] = rest.join(":");
        }
      } else if (currentKey) {
        args[currentKey] = `${args[currentKey]} ${part}`.trim();
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
