import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Types } from "mongoose";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  tapPayments,
  buildTapCustomer,
  buildRedirectUrls,
  buildWebhookConfig,
  type TapChargeRequest,
  type TapChargeResponse,
} from "@/lib/finance/tap-payments";
import { getSessionUser } from "@/lib/auth-middleware";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { TapTransaction } from "@/server/models/finance/TapTransaction";
import { Invoice } from "@/server/models/Invoice";

interface SessionUser {
  id: string;
  email: string;
  orgId: string;
  [key: string]: unknown;
}

interface InvoiceRecipient {
  name?: string;
  customerId?: string;
  [key: string]: unknown;
}

interface InvoiceDocument {
  _id: Types.ObjectId;
  recipient?: InvoiceRecipient;
  [key: string]: unknown;
}

// SECURITY: Explicit non-empty string validation (not just truthy check)
const TAP_PAYMENTS_CONFIGURED =
  typeof process.env.TAP_SECRET_KEY === "string" &&
  process.env.TAP_SECRET_KEY.trim() !== "" &&
  typeof process.env.TAP_PUBLIC_KEY === "string" &&
  process.env.TAP_PUBLIC_KEY.trim() !== "";

type ChargeResult = Pick<
  TapChargeResponse,
  | "id"
  | "status"
  | "transaction"
  | "metadata"
  | "reference"
  | "currency"
  | "amount"
>;

function buildMockCharge(params: {
  correlationId: string;
  amountHalalas: number;
  currency: string;
  baseUrl: string;
  metadata?: TapChargeRequest["metadata"];
  reference?: TapChargeRequest["reference"];
}): ChargeResult {
  const createdAtIso = new Date().toISOString();
  return {
    id: `chg_mock_${params.correlationId}`, // Use Tap-valid format (starts with chg_)
    status: "INITIATED",
    currency: params.currency,
    amount: params.amountHalalas,
    transaction: {
      timezone: "UTC",
      created: createdAtIso,
      url: `${params.baseUrl}/payments/mock/${params.correlationId}`,
      expiry: { period: 15, type: "MINUTES" },
      asynchronous: false,
    },
    metadata: params.metadata,
    reference: params.reference,
  };
}

const CheckoutRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().optional(),
  description: z.string().optional(),
  orderId: z.string().optional(),
  invoiceId: z.string().optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  successPath: z.string().optional(),
  errorPath: z.string().optional(),
  paymentContext: z
    .object({
      partyType: z
        .enum(["TENANT", "CUSTOMER", "VENDOR", "SUPPLIER", "OWNER", "OTHER"])
        .optional(),
      partyId: z.string().optional(),
      partyName: z.string().optional(),
      propertyId: z.string().optional(),
      unitId: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/payments/tap/checkout
 *
 * Create a Tap payment checkout session
 *
 * Body:
 * {
 *   amount: number;        // Amount in SAR (will be converted to halalas)
 *   description?: string;  // Payment description
 *   orderId?: string;      // Your internal order ID
 *   metadata?: object;     // Additional metadata
 * }
 *
 * Returns:
 * {
 *   chargeId: string;      // Tap charge ID
 *   transactionUrl: string; // Redirect user to this URL to complete payment
 *   status: string;        // Charge status
 * }
 */
export async function POST(req: NextRequest) {
  const correlationId = randomUUID();

  try {
    // Authenticate user
    let user: SessionUser;
    try {
      user = (await getSessionUser(req)) as unknown as SessionUser;
    } catch (_error) {
      logger.warn("[POST /api/payments/tap/checkout] Unauthenticated request", {
        correlationId,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const body = CheckoutRequestSchema.parse(await req.json());
    const {
      amount,
      currency = "SAR",
      description,
      orderId,
      invoiceId,
      metadata = {},
      successPath,
      errorPath,
      paymentContext,
    } = body;

    const orgObjectId = Types.ObjectId.isValid(user.orgId)
      ? new Types.ObjectId(user.orgId)
      : null;
    if (!orgObjectId) {
      logger.error(
        "[POST /api/payments/tap/checkout] Invalid orgId on session",
        {
          correlationId,
          orgId: user.orgId,
        },
      );
      return NextResponse.json(
        { error: "Invalid organization context" },
        { status: 400 },
      );
    }

    let invoiceDoc: Awaited<ReturnType<typeof Invoice.findById>> | null = null;
    let invoiceObjectId: Types.ObjectId | undefined;
    if (invoiceId) {
      if (!Types.ObjectId.isValid(invoiceId)) {
        return NextResponse.json(
          { error: "Invalid invoiceId" },
          { status: 400 },
        );
      }
      invoiceObjectId = new Types.ObjectId(invoiceId);
      invoiceDoc = await Invoice.findById(invoiceObjectId).lean();
      if (!invoiceDoc) {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 },
        );
      }
    }

    logger.info("[POST /api/payments/tap/checkout] Creating checkout session", {
      correlationId,
      userId: user.id,
      email: user.email,
      amount,
      orderId,
      invoiceId,
    });

    const amountInHalalas = tapPayments.sarToHalalas(amount);

    // Build customer object
    type InvoiceWithRecipient = typeof invoiceDoc & {
      recipient?: {
        name?: string;
        email?: string;
        phone?: string;
      };
    };
    const invoice = invoiceDoc as InvoiceWithRecipient;

    const invoiceRecipientName = invoice?.recipient?.name;
    const defaultNameParts = user.email ? user.email.split("@") : ["User"];
    const tapCustomer = buildTapCustomer({
      firstName:
        invoiceRecipientName?.split(" ")[0] || defaultNameParts[0] || "User",
      lastName: invoiceRecipientName?.split(" ").slice(1).join(" ") || "",
      email: invoice?.recipient?.email || user.email,
      phone: invoice?.recipient?.phone,
    });

    // Build redirect URLs (user will be sent here after payment)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const redirectUrls = buildRedirectUrls(
      baseUrl,
      successPath || "/payments/success",
      errorPath || "/payments/error",
    );

    // Build webhook config (Tap will send payment events here)
    const webhookConfig = buildWebhookConfig(baseUrl);

    // Create Tap charge request
    const chargeRequest: TapChargeRequest = {
      amount: amountInHalalas,
      currency,
      customer: tapCustomer,
      redirect: redirectUrls,
      post: webhookConfig,
      description: description || "FixZit Payment",
      metadata: {
        ...metadata,
        userId: user.id,
        userEmail: user.email,
        organizationId: user.orgId || null,  // ORGID-FIX: Payment system should track orgId for reconciliation
        orderId: orderId || "",
        invoiceId: invoiceId || "",
      },
      reference: {
        transaction: correlationId,
        order: orderId || undefined,
      },
      receipt: {
        email: true,
        sms: Boolean(user.phone),
      },
    };

    // Create charge with Tap API
    const charge: ChargeResult = TAP_PAYMENTS_CONFIGURED
      ? await tapPayments.createCharge(chargeRequest)
      : buildMockCharge({
          correlationId,
          amountHalalas: amountInHalalas,
          currency,
          baseUrl,
          metadata: chargeRequest.metadata,
          reference: chargeRequest.reference,
        });

    logger.info(
      "[POST /api/payments/tap/checkout] Charge created successfully",
      {
        correlationId,
        chargeId: charge.id,
        status: charge.status,
        transactionUrl: charge.transaction.url,
        tapConfigured: TAP_PAYMENTS_CONFIGURED,
      },
    );

    const expiresAt = charge.transaction.expiry
      ? new Date(Date.now() + (charge.transaction.expiry.period ?? 0) * 60000)
      : null;

    const resolvedPartyName =
      paymentContext?.partyName ||
      invoice?.recipient?.name ||
      `${tapCustomer.first_name} ${tapCustomer.last_name}`.trim() ||
      user.email;
    const resolvedPartyType = paymentContext?.partyType || "CUSTOMER";
    const invoiceTyped = invoice as InvoiceDocument | null;
    const resolvedPartyId =
      paymentContext?.partyId || invoiceTyped?.recipient?.customerId;

    await TapTransaction.create({
      orgId: orgObjectId,
      userId: user.id,
      chargeId: charge.id,
      correlationId,
      orderId: orderId || undefined,
      invoiceId: invoiceObjectId,
      paymentContext: {
        partyType: resolvedPartyType,
        partyId: resolvedPartyId,
        partyName: resolvedPartyName,
        propertyId: paymentContext?.propertyId,
        unitId: paymentContext?.unitId,
        notes: paymentContext?.notes || description,
      },
      status: charge.status,
      currency: charge.currency,
      amountHalalas: amountInHalalas,
      amountSAR: amount,
      redirectUrl: charge.transaction.url,
      expiresAt,
      metadata,
      tapMetadata: charge.metadata,
      rawCharge: charge,
      requestContext: {
        successPath: successPath || "/payments/success",
        errorPath: errorPath || "/payments/error",
      },
      events: [
        {
          type: "charge.created",
          status: charge.status,
          at: new Date(),
          payload: {
            transactionUrl: charge.transaction.url,
          },
        },
      ],
    });

    return NextResponse.json({
      success: true,
      chargeId: charge.id,
      transactionUrl: charge.transaction.url,
      status: charge.status,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });
  } catch (error) {
    logger.error(
      "[POST /api/payments/tap/checkout] Error creating checkout session",
      {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create payment session",
        message: error instanceof Error ? error.message : "Unknown error",
        correlationId,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/payments/tap/checkout/:chargeId
 *
 * Retrieve charge status
 */
export async function GET(req: NextRequest) {
  const correlationId = randomUUID();

  try {
    // Authenticate user
    let user: SessionUser;
    try {
      user = (await getSessionUser(req)) as unknown as SessionUser;
    } catch (_error) {
      logger.warn("[GET /api/payments/tap/checkout] Unauthenticated request", {
        correlationId,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract charge ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const chargeId = pathParts[pathParts.length - 1];

    if (!chargeId || !chargeId.startsWith("chg_")) {
      return NextResponse.json({ error: "Invalid charge ID" }, { status: 400 });
    }

    logger.info("[GET /api/payments/tap/checkout] Retrieving charge", {
      correlationId,
      chargeId,
      userId: user.id,
    });

    // Retrieve charge from Tap
    const charge = await tapPayments.getCharge(chargeId);

    logger.info("[GET /api/payments/tap/checkout] Charge retrieved", {
      correlationId,
      chargeId,
      status: charge.status,
    });

    return NextResponse.json({
      success: true,
      charge: {
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        customer: charge.customer,
        metadata: charge.metadata,
        reference: charge.reference,
        createdAt: charge.transaction.created,
      },
    });
  } catch (error) {
    logger.error("[GET /api/payments/tap/checkout] Error retrieving charge", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to retrieve charge",
        message: error instanceof Error ? error.message : "Unknown error",
        correlationId,
      },
      { status: 500 },
    );
  }
}
