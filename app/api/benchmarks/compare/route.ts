import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import Benchmark from "@/server/models/Benchmark";
import { computeQuote } from "@/lib/pricing";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { z } from "zod";
import { auth } from "@/auth";

import { rateLimit } from "@/server/security/rateLimit";
import {
  zodValidationError,
  rateLimitError,
  unauthorizedError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

interface BenchmarkDocument {
  pricingModel?: string;
  priceMonthly?: number;
  [key: string]: unknown;
}

const compareSchema = z.object({
  seatTotal: z.number().positive(),
  billingCycle: z.enum(["monthly", "annual"]),
  items: z.array(
    z.object({
      moduleCode: z.string().min(1),
    }),
  ),
});

/**
 * @openapi
 * /api/benchmarks/compare:
 *   post:
 *     summary: benchmarks/compare operations
 *     tags: [benchmarks]
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
  // SECURITY: Require authentication to prevent enumeration attacks
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedError("Authentication required");
  }
  const orgId = session.user.orgId;
  if (!orgId || typeof orgId !== "string" || orgId.trim() === "") {
    return unauthorizedError("Organization context required");
  }

  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const body = compareSchema.parse(await req.json());

    const ours = computeQuote({
      items: body.items,
      seatTotal: body.seatTotal,
      billingCycle: body.billingCycle,
    });
    if (ours.contactSales) return createSecureResponse(ours, 200, req);

    // SECURITY: Scope benchmarks to user's organization (tenant isolation)
    // Admins can query all if needed via admin route
    const query = { tenantId: orgId };

    const rows = (await Benchmark.find(query).lean()) as unknown as BenchmarkDocument[];
    const perUserRows = rows.filter(
      (r) => r.pricingModel === "per_user_month" && r.priceMonthly,
    );
    const monthlyMedian =
      perUserRows.sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0))[
        Math.floor(perUserRows.length / 2)
      ]?.priceMonthly || 0;

    const compMonthly = monthlyMedian * body.seatTotal; // FM core-like proxy
    const diff = ours.monthly - compMonthly;
    return NextResponse.json({
      ours: {
        monthly: ours.monthly,
        annualTotal: ours.annualTotal,
        items: ours.items,
      },
      market: { perUserMedianMonthly: monthlyMedian, teamMonthly: compMonthly },
      position: diff === 0 ? "PAR" : diff < 0 ? "BELOW_MARKET" : "ABOVE_MARKET",
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    logger.error(
      "Benchmark comparison failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to compare benchmarks" },
      500,
      req,
    );
  }
}
