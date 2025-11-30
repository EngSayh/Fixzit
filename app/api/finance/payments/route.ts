/**
 * Payment API Routes
 * POST /api/finance/payments - Create payment
 * GET /api/finance/payments - List payments
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Payment } from "@/server/models/finance/Payment";
import { Invoice } from "@/server/models/Invoice";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { Types } from "mongoose";

import { logger } from "@/lib/logger";
const PaymentAllocationSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
});

const BankDetailsSchema = z.object({
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  branchCode: z.string().optional(),
  swiftCode: z.string().optional(),
});

const ChequeDetailsSchema = z.object({
  chequeNumber: z.string(),
  bankName: z.string(),
  chequeDate: z.coerce.date(),
});

const CardDetailsSchema = z.object({
  cardType: z.enum(["CREDIT", "DEBIT"]).optional(),
  last4Digits: z.string().optional(),
  transactionId: z.string().optional(),
});

const CreatePaymentSchema = z.object({
  paymentNumber: z.string().optional(), // Auto-generated if not provided
  paymentDate: z.coerce.date(),
  paymentType: z.enum(["RECEIVED", "MADE"]),
  paymentMethod: z.enum([
    "CASH",
    "CARD",
    "BANK_TRANSFER",
    "CHEQUE",
    "ONLINE",
    "OTHER",
  ]),
  amount: z.number().positive(),
  currency: z.string().default("SAR"),
  partyType: z.enum(["TENANT", "VENDOR", "OWNER", "OTHER"]),
  partyId: z.string(),
  partyName: z.string(),
  description: z.string(),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  leaseId: z.string().optional(),
  invoiceAllocations: z.array(PaymentAllocationSchema).optional(),
  bankDetails: BankDetailsSchema.optional(),
  chequeDetails: ChequeDetailsSchema.optional(),
  cardDetails: CardDetailsSchema.optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  receiptUrl: z.string().optional(),
  // Status removed - always DRAFT on create, require reconcile/clear/bounce endpoints
});

async function getUserSession(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !user.id || !user.orgId) {
    throw new Error("Unauthorized: Invalid session");
  }
  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
}

/**
 * POST /api/finance/payments
 * Create a new payment
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserSession(req);

    // Authorization check
    requirePermission(user.role, "finance.payments.create");

    // Parse request body
    const body = await req.json();
    const data = CreatePaymentSchema.parse(body);

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // Validate all invoice allocations belong to this org
        if (data.invoiceAllocations && data.invoiceAllocations.length > 0) {
          const invoiceIds = data.invoiceAllocations.map((a) => a.invoiceId);
          const validInvoices = await Invoice.find({
            _id: { $in: invoiceIds.map((id) => new Types.ObjectId(id)) },
            orgId: new Types.ObjectId(user.orgId),
          }).select("_id");

          const validIds = new Set(
            validInvoices.map((inv) => inv._id.toString()),
          );
          const invalidIds = invoiceIds.filter((id) => !validIds.has(id));

          if (invalidIds.length > 0) {
            return NextResponse.json(
              {
                success: false,
                error: `Invalid invoice IDs: ${invalidIds.join(", ")}`,
              },
              { status: 400 },
            );
          }
        }

        // Create payment - always DRAFT (require /reconcile /clear /bounce for status changes)
        const payment = await Payment.create({
          ...data,
          orgId: user.orgId,
          createdBy: user.userId,
          status: "DRAFT", // Force DRAFT - require dedicated endpoints for other statuses
        });

        // Auto-allocate to invoices if provided
        if (data.invoiceAllocations && data.invoiceAllocations.length > 0) {
          for (const allocation of data.invoiceAllocations) {
            await payment.allocateToInvoice(
              new Types.ObjectId(allocation.invoiceId),
              `INV-${Date.now()}`, // Fallback invoice number
              allocation.amount,
            );
          }
        }

        return NextResponse.json({
          success: true,
          data: payment,
          message: "Payment draft created",
        });
      },
    );
  } catch (error) {
    logger.error("Error creating payment:", error);

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create payment",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/finance/payments
 * List payments with filters
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserSession(req);

    // Authorization check
    requirePermission(user.role, "finance.payments.read");

    const { searchParams } = new URL(req.url);

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // Build query
        const query: Record<string, unknown> = {
          orgId: user.orgId,
        };

        // Filters
        const status = searchParams.get("status");
        if (status) query.status = status;

        const paymentType = searchParams.get("paymentType");
        if (paymentType) query.paymentType = paymentType;

        const paymentMethod = searchParams.get("paymentMethod");
        if (paymentMethod) query.paymentMethod = paymentMethod;

        const partyId = searchParams.get("partyId");
        if (partyId) query.partyId = partyId;

        const partyType = searchParams.get("partyType");
        if (partyType) query.partyType = partyType;

        const propertyId = searchParams.get("propertyId");
        if (propertyId) query.propertyId = propertyId;

        const reconciled = searchParams.get("reconciled");
        if (reconciled !== null) {
          query["reconciliation.isReconciled"] = reconciled === "true";
        }

        // Date range
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        if (startDate || endDate) {
          query.paymentDate = {};
          if (startDate) {
            (query.paymentDate as { $gte?: Date }).$gte = new Date(startDate);
          }
          if (endDate) {
            (query.paymentDate as { $lte?: Date }).$lte = new Date(endDate);
          }
        }

        // Pagination
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = Math.min(
          parseInt(searchParams.get("limit") || "50", 10),
          100,
        );
        const skip = (page - 1) * limit;

        // Execute query
        const [payments, totalCount] = await Promise.all([
          Payment.find(query)
            .sort({ paymentDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Payment.countDocuments(query),
        ]);

        return NextResponse.json({
          success: true,
          data: payments,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        });
      },
    );
  } catch (error) {
    logger.error("Error fetching payments:", error);

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch payments",
      },
      { status: 500 },
    );
  }
}
