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
import { dbConnect } from "@/db/mongoose";
import PriceBook from "@/server/models/PriceBook";
import { requireSuperAdmin } from "@/lib/authz";
import { logger } from "@/lib/logger";
import { parseBodySafe } from "@/lib/api/parse-body";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
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

    // AUDIT-2025-01-03: Whitelist allowed fields to prevent mass assignment
    // Mirrors PATCH handler sanitization for consistency
    const allowedFields = ['name', 'description', 'prices', 'currency', 'effectiveDate', 'expiryDate', 'isActive', 'metadata', 'modules', 'tiers', 'region'];
    const sanitizedBody: Record<string, unknown> = {};
    const bodyRecord = body as Record<string, unknown>;
    for (const key of allowedFields) {
      if (bodyRecord[key] !== undefined) {
        sanitizedBody[key] = bodyRecord[key];
      }
    }

    const doc = await PriceBook.create(sanitizedBody);
    return createSecureResponse(doc, 200, req);
  } catch (error) {
    logger.error("[admin/billing/pricebooks] POST error", { error });
    return createSecureResponse({ error: "Failed to create pricebook" }, 500, req);
  }
}
