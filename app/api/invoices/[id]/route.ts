import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Invoice } from "@/server/models/Invoice";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { generateZATCATLV, generateZATCAQR } from "@/lib/zatca";
import crypto from "crypto";

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

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const invoice = await (Invoice as any).findOne({
      _id: params.id,
      tenantId: user.tenantId
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Add to history if viewed for first time by recipient
    if (invoice.status === "SENT" && user.id === invoice.recipient.customerId) {
      invoice.status = "VIEWED";
      invoice.history.push({
        action: "VIEWED",
        performedBy: user.id,
        performedAt: new Date(),
        details: "Invoice viewed by recipient"
      });
      await invoice.save();
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = updateInvoiceSchema.parse(await req.json());

    const invoice = await (Invoice as any).findOne({
      _id: params.id,
      tenantId: user.tenantId
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
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
          // Prepare ZATCA data from invoice with safer field extraction
          const zatcaData = {
            sellerName: invoice.seller?.name || invoice.from?.name || "Unknown Seller",
            vatNumber: invoice.seller?.vatNumber || invoice.from?.taxId || "000000000000000",
            timestamp: invoice.issueDate || new Date().toISOString(),
            total: invoice.total || 0,
            vatAmount: invoice.tax || 0
          };

          // Generate TLV and QR code (both async)
          const tlv = await generateZATCATLV(zatcaData);
          const qrCode = await generateZATCAQR(zatcaData);

          // Update invoice ZATCA fields
          invoice.zatca = invoice.zatca || {};
          invoice.zatca.tlv = tlv;
          invoice.zatca.qrCode = qrCode;
          invoice.zatca.generatedAt = new Date();
          invoice.zatca.status = "GENERATED";
        } catch (error) {
          console.error("ZATCA generation failed:", error);
          invoice.zatca = invoice.zatca || {};
          invoice.zatca.status = "FAILED";
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
      const totalPaid = invoice.payments.reduce((sum: number, p: any) => 
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
      const level = invoice.approval.levels.find((l: any) => 
        l.approver === user.id && l.status === "PENDING"
      );

      if (level) {
        level.status = data.approval.approved ? "APPROVED" : "REJECTED";
        level.approvedAt = new Date();
        level.comments = data.approval.comments;

        // Check if all levels approved
        const allApproved = invoice.approval.levels.every((l: any) => 
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

    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const invoice = await (Invoice as any).findOne({
      _id: params.id,
      tenantId: user.tenantId,
      status: "DRAFT"
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found or cannot be deleted" }, { status: 404 });
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
