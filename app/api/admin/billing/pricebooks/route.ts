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

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 100, 60000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await dbConnect();
  await requireSuperAdmin(req);
  const body = await req.json();

  const doc = await PriceBook.create(body);
  return createSecureResponse(doc, 200, req);
}
