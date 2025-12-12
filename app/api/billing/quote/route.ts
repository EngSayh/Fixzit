import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeQuote } from "@/lib/pricing";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

/**
 * Zod schema for billing quote request
 */
const BillingQuoteSchema = z.object({
  items: z.array(z.object({
    moduleCode: z.string().min(1),
    seatCount: z.number().int().positive().optional(),
  })),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  seatTotal: z.number().int().positive().default(1),
  isUnlimited: z.boolean().optional(),
});

/**
 * @openapi
 * /api/billing/quote:
 *   get:
 *     summary: billing/quote operations
 *     tags: [billing]
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
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = BillingQuoteSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid quote request" },
        { status: 400 }
      );
    }
    
    const input = parsed.data;
    const q = await computeQuote(input);
    return createSecureResponse(q);
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
