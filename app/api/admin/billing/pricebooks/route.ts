/**
 * @description Creates new pricebook configurations for module pricing.
 * Pricebooks define pricing tiers, regional pricing, and volume discounts.
 * @route POST /api/admin/billing/pricebooks
 * @access Private - SUPER_ADMIN only
 * @param {Object} body - name, modules, tiers, region, currency
 * @returns {Object} pricebook: created pricebook object
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {429} If rate limit exceeded
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb-unified";
import PriceBook from "@/server/models/PriceBook";
import { requireSuperAdmin } from "@/lib/authz";
import { logger } from "@/lib/logger";
import { parseBodySafe } from "@/lib/api/parse-body";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

// Schema for price per module
const pricePerModuleSchema = z.object({
  module_key: z.string().min(1),
  monthly_usd: z.number().nonnegative(),
  monthly_sar: z.number().nonnegative(),
});

// Schema for seat tiers
const seatTierSchema = z.object({
  min_seats: z.number().int().nonnegative(),
  max_seats: z.number().int().positive(),
  discount_pct: z.number().min(0).max(100).default(0),
  prices: z.array(pricePerModuleSchema).default([]),
});

// POST body schema - explicitly defines allowed fields only
// Security: Strips any fields not in this schema (including isActive, adminOverride)
const createPricebookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  currency: z.enum(["USD", "SAR"]).default("USD"),
  effective_from: z.coerce.date().optional(),
  tiers: z.array(seatTierSchema).default([]),
}).strict(); // strict() rejects unknown fields

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 100, 60000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await dbConnect();
    await requireSuperAdmin(req);
    const { data: body, error: parseError } = await parseBodySafe(req, {
      logPrefix: "[admin:billing:pricebooks]",
    });
    if (parseError || !body) {
      return createSecureResponse({ error: "Invalid JSON payload" }, 400, req);
    }

    // Validate and sanitize input - strips prohibited fields like isActive, adminOverride
    const parseResult = createPricebookSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten();
      logger.warn("[admin/billing/pricebooks] Validation failed", { errors });
      return createSecureResponse({ 
        error: "Validation failed", 
        details: errors.fieldErrors 
      }, 400, req);
    }

    const doc = await PriceBook.create(parseResult.data);
    return createSecureResponse(doc, 200, req);
  } catch (error) {
    logger.error("[admin/billing/pricebooks] POST error", { error });
    return createSecureResponse({ error: "Failed to create pricebook" }, 500, req);
  }
}
