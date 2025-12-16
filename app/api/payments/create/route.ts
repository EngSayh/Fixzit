/**
 * @fileoverview Payment Creation API
 * @description Initiates payment transactions via TAP gateway for invoice payments.
 * Generates secure checkout URLs with customer and billing details.
 * @route POST /api/payments/create - Create payment page
 * @access Protected - Requires authenticated session
 * @module payments
 */
import { NextRequest } from "next/server";
import { tapPayments } from "@/lib/finance/tap-payments";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { Invoice } from "@/server/models/Invoice";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { z } from "zod";
import { smartRateLimit } from "@/server/security/rateLimit";
import {
  notFoundError,
  validationError,
  zodValidationError,
  rateLimitError,
  handleApiError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { EMAIL_DOMAINS, DOMAINS } from "@/lib/config/domains";
import { Config } from "@/lib/config/constants";
import { joinUrl } from "@/lib/utils/url";

/**
 * @openapi
 * /api/payments/create:
 *   post:
 *     summary: Create payment transaction
 *     description: Initiates a payment transaction for an invoice using Tap payment gateway. Generates a secure payment URL for customer checkout. Requires authentication.
 *     tags:
 *       - Payments
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 pattern: '^[a-fA-F0-9]{24}$'
 *                 description: MongoDB ObjectId of the invoice to pay
 *                 example: "507f1f77bcf86cd799439011"
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect after successful payment
 *                 example: "https://fixzit.co/payments/success"
 *               cancelUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect if payment is cancelled
 *                 example: "https://fixzit.co/payments/cancel"
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, bank_transfer, wallet]
 *                 description: Preferred payment method
 *                 example: "credit_card"
 *     responses:
 *       200:
 *         description: Payment page created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 paymentUrl:
 *                   type: string
 *                   format: uri
 *                   description: Secure TAP payment page URL
 *                   example: "https://checkout.payments.tap.company/..."
 *                 transactionId:
 *                   type: string
 *                   description: TAP charge ID
 *                   example: "chg_xxxxxxxxxxxxxx"
 *       400:
 *         description: Validation error - Invalid invoice ID, already paid, or missing required fields
 *       404:
 *         description: Invoice not found in tenant scope
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error or Tap API failure
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 10 req/5min (300000ms) for payment creation (high sensitivity)
    // SECURITY: In-memory limiter (Redis removed)
    const user = await getSessionUser(req);
    const rl = await smartRateLimit(`payment-create:${user.id}`, 10, 300000); // 5 minutes = 300,000ms
    if (!rl.allowed) {
      return rateLimitError();
    }

    const paymentSchema = z.object({
      invoiceId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid invoice ID"),
      returnUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
      paymentMethod: z
        .enum(["credit_card", "bank_transfer", "wallet"])
        .optional(),
    });

    const body = paymentSchema.parse(await req.json());
    const { invoiceId } = body;

    if (!invoiceId) {
      return validationError("Invoice ID is required");
    }

    await connectToDatabase();
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      tenantId: user.orgId,
    });

    if (!invoice) {
      return notFoundError("Invoice");
    }

    if (invoice.status === "PAID") {
      return validationError("Invoice is already paid");
    }

    // Create payment request via TAP
    const charge = await tapPayments.createCharge({
      amount: invoice.total ?? 0,
      currency: invoice.currency || "SAR",
      customer: {
        first_name: invoice.recipient?.name?.split(" ")[0] || "Customer",
        last_name: invoice.recipient?.name?.split(" ").slice(1).join(" ") || "",
        email: invoice.recipient?.email || `customer@${EMAIL_DOMAINS.primary}`,
        phone: {
          country_code: "966",
          number: (invoice.recipient?.phone || Config.company.supportPhone).replace(/\s/g, "").replace(/^\+?966/, ""),
        },
      },
      redirect: {
        url: joinUrl(Config.app.url || DOMAINS.app, "/payments/success"),
      },
      post: {
        url: joinUrl(Config.app.url || DOMAINS.app, "/api/payments/tap/webhook"),
      },
      description: `Payment for Invoice ${invoice.number}`,
      reference: {
        transaction: invoice._id.toString(),
        order: invoice.number,
      },
      metadata: {
        invoiceId: invoice._id.toString(),
        tenantId: user.orgId,
      },
    });

    if (charge.id && charge.transaction?.url) {
      // Update invoice with payment transaction
      invoice.history.push({
        action: "PAYMENT_INITIATED",
        performedBy: user.id,
        performedAt: new Date(),
        details: `Payment initiated with TAP charge ${charge.id}`,
      });
      await invoice.save();

      return createSecureResponse(
        {
          success: true,
          paymentUrl: charge.transaction.url,
          transactionId: charge.id,
        },
        200,
        req,
      );
    } else {
      return validationError(
        charge.response?.message || "Payment initialization failed",
      );
    }
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ZodError"
    ) {
      return zodValidationError(error as z.ZodError);
    }
    return handleApiError(error);
  }
}
