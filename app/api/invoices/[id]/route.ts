import { NextRequest} from "next/server";
import { logger } from '@/lib/logger';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Invoice } from "@/server/models/Invoice";
import { z, ZodError } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { generateZATCATLV, generateZATCAQR } from "@/lib/zatca";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError, handleApiError, zodValidationError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "VIEWED", "APPROVED", "REJECTED", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  payment: z.object({
    date: z.string(),
    amount: z.number(),
    method: z.string(),
    reference: z.string().optional(),
    notes: z.string().optional()
  }).optional(),
  approval: z.object({
    approved: z.boolean(),
    comments: z.string().optional()
  }).optional()
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
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const invoice = (await Invoice.findOne({
      _id: params.id,
      tenantId: user.tenantId
    }));

    if (!invoice) {
      return createSecureResponse({ error: "Invoice not found" }, 404, req);
    }

    // Add to history if viewed for first time by recipient
    if (invoice.status === "SENT" && invoice.recipient?.customerId && user.id === invoice.recipient.customerId) {
      invoice.status = "VIEWED";
      invoice.history.push({
        action: "VIEWED",
        performedBy: user.id,
        performedAt: new Date(),
        details: "Invoice viewed by recipient"
      });
      await invoice.save();
    }

    return createSecureResponse(invoice, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = updateInvoiceSchema.parse(await req.json());

    const invoice = await Invoice.findOne({
      _id: params.id,
      tenantId: user.tenantId
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
        details: `Invoice status changed to ${data.status}`
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
            vatAmount: invoice.tax || 0
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
          logger.error("ZATCA generation failed:", error instanceof Error ? error.message : 'Unknown error');
          if (!invoice.zatca) {
            invoice.zatca = { status: "FAILED" };
          } else {
            invoice.zatca.status = "FAILED";
          }
          invoice.zatca.error = error instanceof Error ? error.message : String(error);
        }
      }
    }

    // Handle payment
    if (data.payment) {
      invoice.payments.push({
        ...data.payment,
        status: "COMPLETED",
        transactionId: `TXN-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`
      });

      // Update invoice status if fully paid
      const totalPaid = invoice.payments.reduce((sum: number, p: { status: string; amount: number }) => 
        p.status === "COMPLETED" ? sum + p.amount : sum, 0
      );

      if (totalPaid >= invoice.total) {
        invoice.status = "PAID";
        invoice.history.push({
          action: "PAID",
          performedBy: user.id,
          performedAt: new Date(),
          details: "Invoice fully paid"
        });
      }
    }

    // Handle approval
    if (data.approval) {
      const level = invoice.approval.levels.find((l: { approver: string; status: string }) => 
        l.approver === user.id && l.status === "PENDING"
      );

      if (level) {
        level.status = data.approval.approved ? "APPROVED" : "REJECTED";
        level.approvedAt = new Date();
        level.comments = data.approval.comments;

        // Check if all levels approved
        const allApproved = invoice.approval.levels.every((l: { status: string }) => 
          l.status === "APPROVED"
        );

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
          details: data.approval.comments || `Invoice ${data.approval.approved ? 'approved' : 'rejected'}`
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

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const invoice = (await Invoice.findOne({
      _id: params.id,
      tenantId: user.tenantId,
      status: "DRAFT"
    }));

    if (!invoice) {
      return createSecureResponse({ error: "Invoice not found or cannot be deleted" }, 404, req);
    }

    invoice.status = "CANCELLED";
    invoice.history.push({
      action: "CANCELLED",
      performedBy: user.id,
      performedAt: new Date(),
      details: "Invoice cancelled"
    });
    invoice.updatedBy = user.id;
    await invoice.save();

    return createSecureResponse({ success: true }, 200, req);
  } catch (error: unknown) {
    logger.error('Invoice DELETE error:', error instanceof Error ? (error as Error).message : 'Unknown error');
    return handleApiError(error);
  }
}
