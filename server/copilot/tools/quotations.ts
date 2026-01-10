import { db } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { logger } from "@/lib/logger";
import { Types } from "mongoose";
import { recordAudit } from "../audit";
import { CopilotSession } from "../session";
import { ensureToolAllowed } from "./guard";
import type { ToolExecutionResult } from "./types";

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

export async function approveQuotation(
  session: CopilotSession,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "approveQuotation");
  await db;

  const intent = "approveQuotation";
  const quotationId =
    typeof input.quotationId === "string" ? input.quotationId.trim() : "";

  if (!quotationId || !Types.ObjectId.isValid(quotationId)) {
    const message =
      session.locale === "ar"
        ? "معرف عرض السعر غير صالح"
        : "A valid quotation ID is required";
    await recordAudit({
      session,
      intent,
      tool: intent,
      status: "DENIED",
      message,
      metadata: { quotationId },
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
      import("@/domain/fm/fm.behavior"),
      import("@/server/models/FMApproval"),
      import("@/server/models/User"),
    ]);

    const quotationObjectId = new Types.ObjectId(quotationId);
    const quotation = await FMQuotation.findOne({
      _id: quotationObjectId,
      org_id: session.tenantId,
    }).lean<QuotationLean | null>();

    if (!quotation) {
      const message =
        session.locale === "ar"
          ? "لم يتم العثور على عرض السعر في المستأجر الخاص بك"
          : "Quotation not found for your organization";
      await recordAudit({
        session,
        intent,
        tool: intent,
        status: "DENIED",
        message,
        metadata: { quotationId },
      });
      return {
        success: false,
        message,
        intent,
      };
    }

    if (quotation.status === "APPROVED") {
      const message =
        session.locale === "ar"
          ? "تمت الموافقة على هذا العرض مسبقاً"
          : "This quotation has already been approved";
      await recordAudit({
        session,
        intent,
        tool: intent,
        status: "SUCCESS",
        message,
        metadata: { quotationId, status: quotation.status },
      });
      return {
        success: true,
        message,
        intent,
        data: { quotationId, status: "approved" },
      };
    }

    const approval = await FMApproval.findOne({
      orgId: session.tenantId,
      entityId: quotationObjectId,
      $or: [{ entityType: "Quotation" }, { type: "QUOTATION" }],
      status: "PENDING",
    }).lean<ApprovalLean | null>();

    const privilegedRoles = new Set([
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_ADMIN",
      "FINANCE",
      "FM_MANAGER",
      "PROCUREMENT",
      "PROPERTY_MANAGER",
      "OWNER",
    ]);
    const isPrivileged = privilegedRoles.has(session.role);
    const isStageApprover = approval
      ? approval.approverId?.toString() === session.userId ||
        (Array.isArray(approval.stages) &&
          approval.stages.some(
            (stage: {
              approvers?: Array<{ toString(): string } | string>;
              status?: string;
            }) => {
              const stageApprovers = stage?.approvers ?? [];
              return stageApprovers.some(
                (approver: { toString(): string } | string) => {
                  const approverId =
                    typeof approver === "string"
                      ? approver
                      : approver?.toString?.();
                  return approverId === session.userId;
                },
              );
            },
          ))
      : false;

    if (!approval) {
      const message =
        session.locale === "ar"
          ? "لا يوجد مسار اعتماد نشط لهذا العرض"
          : "No active approval workflow exists for this quotation";
      await recordAudit({
        session,
        intent,
        tool: intent,
        status: "DENIED",
        message,
        metadata: { quotationId },
      });
      return {
        success: false,
        message,
        intent,
      };
    }

    if (!isPrivileged && !isStageApprover) {
      const message =
        session.locale === "ar"
          ? "ليست لديك صلاحية اعتماد هذا العرض"
          : "You are not authorized to approve this quotation";
      await recordAudit({
        session,
        intent,
        tool: intent,
        status: "DENIED",
        message,
        metadata: {
          quotationId,
          approvalId: approval?._id ? approval._id.toString() : undefined,
        },
      });
      return {
        success: false,
        message,
        intent,
      };
    }

    const now = new Date();
    const updatedQuotation = await FMQuotation.findOneAndUpdate(
      {
        _id: quotationObjectId,
        org_id: session.tenantId,
        status: { $ne: "APPROVED" },
      },
      {
        $set: {
          status: "APPROVED",
          approved_by_user_id: Types.ObjectId.isValid(session.userId)
            ? new Types.ObjectId(session.userId)
            : session.userId,
          approved_at: now,
        },
      },
      { new: true },
    ).lean<QuotationLean | null>();

    if (!updatedQuotation) {
      throw new Error("Failed to update quotation status");
    }

    if (approval) {
      const historyEntry = {
        timestamp: now,
        action: "APPROVED",
        actorId: Types.ObjectId.isValid(session.userId)
          ? new Types.ObjectId(session.userId)
          : session.userId,
        actorName: session.name ?? "Copilot User",
        previousStatus: approval.status,
        newStatus: "APPROVED",
        notes: "Approved via Copilot assistant",
      };

      await FMApproval.findByIdAndUpdate(
        approval._id,
        {
          $set: {
            status: "APPROVED",
            decision: "APPROVE",
            decisionDate: now,
            approverId: Types.ObjectId.isValid(session.userId)
              ? new Types.ObjectId(session.userId)
              : session.userId,
            approverName: session.name ?? approval.approverName,
            approverEmail: session.email ?? approval.approverEmail,
          },
          $push: { history: historyEntry },
        },
        { new: true, runValidators: true },
      );
    }

    // Notify requester (best-effort, background)
    void (async () => {
      try {
        if (!quotation.work_order_id) return;

        const workOrder = await WorkOrder.findById(quotation.work_order_id)
          .select(["requester"])
          .lean<{ requester?: { userId?: unknown } } | null>();

        const requesterId = workOrder?.requester?.userId
          ? typeof workOrder.requester.userId === "string"
            ? workOrder.requester.userId
            : (workOrder.requester.userId as { toString(): string }).toString()
          : undefined;

        if (!requesterId) return;

        const requester = await User.findById(requesterId)
          .select(["email", "personal.firstName", "personal.lastName"])
          .lean<{
            email?: string;
            personal?: { firstName?: string; lastName?: string };
          } | null>();

        if (!requester?.email) return;

        const { JobQueue } = await import("@/lib/jobs/queue");
        await JobQueue.enqueue("email-notification", {
          to: requester.email,
          subject: `Quotation ${quotationId} approved`,
          html: `
            <p>Hello ${[requester.personal?.firstName, requester.personal?.lastName].filter(Boolean).join(" ") || "there"},</p>
            <p>Quotation #${quotationId} has been approved and is ready for processing.</p>
            <p>Approved by: ${session.name || "Approver"}.</p>
          `,
        });
      } catch (error) {
        logger.error(
          "[approveQuotation] Failed to enqueue approval notification",
          error as Error,
          {
            quotationId,
          },
        );
      }
    })();

    const successMessage =
      session.locale === "ar"
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
      data: { quotationId, status: "approved" },
    };
  } catch (error) {
    const message =
      session.locale === "ar"
        ? "تعذر اعتماد عرض السعر"
        : "Unable to approve the quotation";

    logger.error(
      "[approveQuotation] Failed to approve quotation",
      error as Error,
      { quotationId },
    );
    await recordAudit({
      session,
      intent,
      tool: intent,
      status: "ERROR",
      message,
      metadata: {
        quotationId,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return {
      success: false,
      message,
      intent,
    };
  }
}
