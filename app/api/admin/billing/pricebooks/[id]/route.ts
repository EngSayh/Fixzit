/**
 * @description Updates an existing pricebook configuration by ID.
 * Allows modification of pricing tiers, regional settings, and discounts.
 * @route PATCH /api/admin/billing/pricebooks/[id]
 * @access Private - SUPER_ADMIN only
 * @param {string} id - Pricebook ID (MongoDB ObjectId)
 * @param {Object} body - Pricebook update fields
 * @returns {Object} pricebook: updated pricebook object
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {404} If pricebook not found
 */
import { NextRequest } from "next/server";
import { dbConnect } from "@/db/mongoose";
import PriceBook from "@/server/models/PriceBook";
import { requireSuperAdmin } from "@/lib/authz";

import { createSecureResponse } from "@/server/security/headers";

/**
 * Updates a pricebook by ID
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  await dbConnect();
  await requireSuperAdmin(req);
  const body = await req.json();

  // AUDIT-2025-12-08: Whitelist allowed fields to prevent mass assignment
  const allowedFields = ['name', 'description', 'prices', 'currency', 'effectiveDate', 'expiryDate', 'isActive', 'metadata'];
  const sanitizedBody: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      sanitizedBody[key] = body[key];
    }
  }

  const doc = await PriceBook.findByIdAndUpdate(params.id, sanitizedBody, { new: true });
  if (!doc) {
    return createSecureResponse({ error: "NOT_FOUND" }, 404, req);
  }

  return createSecureResponse(doc, 200, req);
}
