/**
 * @fileoverview Invoice Detail API
 * @description Handles individual invoice operations including retrieval, status updates, payments, and approvals.
 * @route GET /api/invoices/[id] - Get single invoice by ID
 * @route PATCH /api/invoices/[id] - Update invoice status/payment
 * @route DELETE /api/invoices/[id] - Cancel/void an invoice
 * @access Authenticated (tenant-scoped)
 * @module finance
 */
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Invoice } from "@/server/models/Invoice";
import { z, ZodError } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { generateZATCATLV, generateZATCAQR } from "@/lib/zatca";

import { smartRateLimit } from "@/server/security/rateLimit";
import {
  rateLimitError,
  handleApiError,
  zodValidationError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

const updateInvoiceSchema = z.object({
  status: z
    .enum([
      "DRAFT",
      "SENT",
      "VIEWED",
      "APPROVED",
      "REJECTED",
      "PAID",
      "OVERDUE",
      "CANCELLED",
    ])
    .optional(),
  payment: z
    .object({
      date: z.string(),
      amount: z.number(),
      method: z.string(),
      reference: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  approval: z
    .object({
      approved: z.boolean(),
      comments: z.string().optional(),
    })
    .optional(),
});

/**
 * @openapi
 * /api/invoices/[id]:
 *   get:
 *     summary: invoices/[id] operations
 *     tags: [invoices]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // [FIXZIT-API-INV-001] Validate ObjectId before database operation
  if (!params.id || !mongoose.isValidObjectId(params.id)) {
    return createSecureResponse(
      { error: "INVALID_ID", message: "Invalid invoice ID format" },
      400,
      req
    );
  }

  try {
    const user = await getSessionUser(req);
    // SEC-001: Validate orgId to prevent undefined in tenant-scoped queries
    if (!user?.orgId) {
      return createSecureResponse(
        { error: "Unauthorized", message: "Missing tenant context" },
        401,
        req,
      );
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for history update and .save()
    const invoice = await Invoice.findOne({
      _id: params.id,
      orgId: user.orgId,
    });

    if (!invoice) {
      return createSecureResponse({ error: "Invoice not found" }, 404, req);
    }

    // Add to history if viewed for first time by recipient
    if (
      invoice.status === "SENT" &&
      invoice.recipient?.customerId &&
      user.id === invoice.recipient.customerId
    ) {
      invoice.status = "VIEWED";
      invoice.history.push({
        action: "VIEWED",
        performedBy: user.id,
        performedAt: new Date(),
        details: "Invoice viewed by recipient",
      });
      await invoice.save();
    }

    return createSecureResponse(invoice, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser(req);
    // SEC-001: Validate orgId to prevent undefined in tenant-scoped queries
    if (!user?.orgId) {
      return createSecureResponse(
        { error: "Unauthorized", message: "Missing tenant context" },
        401,
        req,
      );
    }
    await connectToDatabase();

    const data = updateInvoiceSchema.parse(await req.json());

    // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for status update and .save()
    const invoice = await Invoice.findOne({
      _id: params.id,
      orgId: user.orgId,
    });

    if (!invoice) {
      return createSecureResponse({ error: "Invoice not found" }, 404, req);
    }

    // Handle status update
    if (data.status) {
      invoice.status = data.status;
      invoice.history.push({
        action: data.status,
        performedBy: user.id,
        performedAt: new Date(),
        details: `Invoice status changed to ${data.status}`,
      });

      // If sending invoice, generate ZATCA XML and sign
      if (data.status === "SENT") {
        try {
          // Prepare ZATCA data from invoice using issuer (seller/from are virtual aliases)
          const zatcaData = {
            sellerName: invoice.issuer?.name || "Unknown Seller",
            vatNumber: invoice.issuer?.taxId || "000000000000000",
            timestamp: (invoice.issueDate || new Date()).toISOString(),
            total: invoice.total || 0,
            vatAmount: invoice.tax || 0,
          };

          // Generate TLV and QR code (both async)
          const tlv = await generateZATCATLV(zatcaData);
          const qrCode = await generateZATCAQR(zatcaData);

          // Update invoice ZATCA fields with proper initialization
          if (!invoice.zatca) {
            invoice.zatca = { status: "PENDING" };
          }
          invoice.zatca.tlv = tlv;
          invoice.zatca.qrCode = qrCode;
          invoice.zatca.generatedAt = new Date();
          invoice.zatca.status = "GENERATED";
        } catch (error) {
          logger.error(
            "ZATCA generation failed:",
            error instanceof Error ? error.message : "Unknown error",
          );
          if (!invoice.zatca) {
            invoice.zatca = { status: "FAILED" };
          } else {
            invoice.zatca.status = "FAILED";
          }
          invoice.zatca.error =
            error instanceof Error ? error.message : String(error);
        }
      }
    }

    // Handle payment
    if (data.payment) {
      invoice.payments.push({
        ...data.payment,
        status: "COMPLETED",
        transactionId: `TXN-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
      });

      // Update invoice status if fully paid
      const totalPaid = invoice.payments.reduce((sum: number, p: unknown) => {
        const payment = p as { status?: string; amount?: number };
        return payment.status === "COMPLETED" && payment.amount
          ? sum + payment.amount
          : sum;
      }, 0);

      if (invoice.total && totalPaid >= invoice.total) {
        invoice.status = "PAID";
        invoice.history.push({
          action: "PAID",
          performedBy: user.id,
          performedAt: new Date(),
          details: "Invoice fully paid",
        });
      }
    }

    // Handle approval
    if (data.approval && invoice.approval) {
      const level = (
        invoice.approval.levels as unknown as Array<{
          approver: string;
          status: string;
          approvedAt?: Date;
          comments?: string;
        }>
      ).find((l) => l.approver === user.id && l.status === "PENDING");

      if (level) {
        level.status = data.approval.approved ? "APPROVED" : "REJECTED";
        level.approvedAt = new Date();
        level.comments = data.approval.comments;

        // Check if all levels approved
        const allApproved = (
          invoice.approval.levels as unknown as Array<{ status: string }>
        ).every((l) => l.status === "APPROVED");

        if (allApproved) {
          invoice.status = "APPROVED";
          invoice.approval.finalApprover = user.id;
          invoice.approval.finalApprovedAt = new Date();
        } else if (!data.approval.approved) {
          invoice.status = "REJECTED";
          invoice.approval.rejectionReason = data.approval.comments;
        }

        invoice.history.push({
          action: data.approval.approved ? "APPROVED" : "REJECTED",
          performedBy: user.id,
          performedAt: new Date(),
          details:
            data.approval.comments ||
            `Invoice ${data.approval.approved ? "approved" : "rejected"}`,
        });
      }
    }

    invoice.updatedBy = user.id;
    await invoice.save();

    return createSecureResponse(invoice, 200, req);
  } catch (error: unknown) {
    // Distinguish validation errors from server errors
    if (error instanceof ZodError) {
      return zodValidationError(error, req);
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser(req);
    // SEC-001: Validate orgId to prevent undefined in tenant-scoped queries
    if (!user?.orgId) {
      return createSecureResponse(
        { error: "Unauthorized", message: "Missing tenant context" },
        401,
        req,
      );
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for .deleteOne()
    const invoice = await Invoice.findOne({
      _id: params.id,
      orgId: user.orgId,
      status: "DRAFT",
    });

    if (!invoice) {
      return createSecureResponse(
        { error: "Invoice not found or cannot be deleted" },
        404,
        req,
      );
    }

    invoice.status = "CANCELLED";
    invoice.history.push({
      action: "CANCELLED",
      performedBy: user.id,
      performedAt: new Date(),
      details: "Invoice cancelled",
    });
    invoice.updatedBy = user.id;
    await invoice.save();

    return createSecureResponse({ success: true }, 200, req);
  } catch (error: unknown) {
    logger.error(
      "Invoice DELETE error:",
      error instanceof Error ? (error as Error).message : "Unknown error",
    );
    return handleApiError(error);
  }
}
