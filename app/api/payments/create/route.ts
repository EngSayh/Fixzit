import { NextRequest } from "next/server";
import { createPaymentPage } from "@/lib/paytabs";
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

/**
 * @openapi
 * /api/payments/create:
 *   post:
 *     summary: Create payment transaction
 *     description: Initiates a payment transaction for an invoice using PayTabs payment gateway. Generates a secure payment URL for customer checkout. Requires authentication.
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
 *                   description: Secure PayTabs payment page URL
 *                   example: "https://secure.paytabs.sa/payment/page/ABC123DEF456"
 *                 transactionId:
 *                   type: string
 *                   description: PayTabs transaction reference ID
 *                   example: "TST2024010112345678"
 *       400:
 *         description: Validation error - Invalid invoice ID, already paid, or missing required fields
 *       404:
 *         description: Invoice not found in tenant scope
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error or PayTabs API failure
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 10 req/5min (300000ms) for payment creation (high sensitivity)
    // SECURITY: Use distributed rate limiting (Redis) to prevent cross-instance bypass
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

    // Create payment request
    const paymentRequest = {
      amount: invoice.total,
      currency: invoice.currency,
      customerDetails: {
        name: invoice.recipient?.name || "Unknown Customer",
        email: invoice.recipient?.email || "customer@fixzit.co",
        phone: invoice.recipient?.phone || "+966500000000",
        address: invoice.recipient?.address || "Saudi Arabia",
        city: "Riyadh",
        state: "Riyadh",
        country: "SA",
        zip: "11564",
      },
      description: `Payment for Invoice ${invoice.number}`,
      invoiceId: invoice._id.toString(),
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`,
    };

    const paymentResponse = await createPaymentPage(
      paymentRequest as unknown as Parameters<typeof createPaymentPage>[0],
    );

    if (paymentResponse.success) {
      // Update invoice with payment transaction
      invoice.history.push({
        action: "PAYMENT_INITIATED",
        performedBy: user.id,
        performedAt: new Date(),
        details: `Payment initiated with transaction ${paymentResponse.transactionId}`,
      });
      await invoice.save();

      return createSecureResponse(
        {
          success: true,
          paymentUrl: paymentResponse.paymentUrl,
          transactionId: paymentResponse.transactionId,
        },
        200,
        req,
      );
    } else {
      return validationError(
        paymentResponse.error || "Payment initialization failed",
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
