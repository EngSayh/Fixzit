/**
 * @fileoverview Aqar Souq - Single Listing API
 * @description CRUD operations for individual property listings.
 * Supports retrieval, updates, and soft deletion with analytics tracking.
 * @route GET /api/aqar/listings/[id] - Get listing details
 * @route PATCH /api/aqar/listings/[id] - Update listing
 * @route DELETE /api/aqar/listings/[id] - Delete listing
 * @access Protected for mutations, Public for retrieval
 * @module aqar
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDb } from "@/lib/mongo";
import { AqarListing } from "@/server/models/aqar";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { FurnishingStatus, ListingStatus } from "@/server/models/aqar/Listing";
import { ok, badRequest, notFound } from "@/lib/api/http";
import { isValidObjectIdSafe } from "@/lib/api/validation";
import { incrementAnalyticsWithRetry } from "@/lib/analytics/incrementWithRetry";
import {
  setTenantContext,
  clearTenantContext,
} from "@/server/plugins/tenantIsolation";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

import mongoose from "mongoose";

import { logger } from "@/lib/logger";
import { handleApiError } from "@/server/utils/errorResponses";
import {
  normalizeImmersive,
  normalizeProptech,
} from "@/app/api/aqar/listings/normalizers";
import { AqarFmLifecycleService } from "@/services/aqar/fm-lifecycle-service";
export const runtime = "nodejs";

// GET /api/aqar/listings/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Rate limiting: 60 requests per minute per IP for reads
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "aqar:listings:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const correlationId = crypto.randomUUID();

  try {
    await connectDb();

    const { id } = await params;

    if (!isValidObjectIdSafe(id)) {
      return badRequest("Invalid listing ID", { correlationId });
    }

    // SEC-002: Only expose active listings publicly; drafts/archived remain hidden
    // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE: Public marketplace listing
    const listing = await AqarListing.findOne({ _id: id, status: ListingStatus.ACTIVE })
      .select(
        "_id title price areaSqm city status media amenities location intent propertyType analytics rnplEligible auction proptech immersive pricingInsights pricing ai fmLifecycle iotFeatures listerId orgId org_id",
      )
      .lean();

    if (!listing) {
      return notFound("Listing not found", { correlationId });
    }

    // Extract org_id from listing for tenant-scoped analytics
    const listingOrg =
      (listing as { orgId?: unknown; org_id?: unknown }).orgId ??
      (listing as { orgId?: unknown; org_id?: unknown }).org_id;

    // Best-effort analytics increment with tenant context (non-blocking)
    // Set tenant context to ensure org_id scoping for analytics updates
    if (listingOrg) {
      (async () => {
        try {
          setTenantContext({ orgId: String(listingOrg), userId: undefined });
          await incrementAnalyticsWithRetry({
            model: AqarListing,
            id: new mongoose.Types.ObjectId(id),
            updateOp: {
              $inc: { "analytics.views": 1 },
              $set: { "analytics.lastViewedAt": new Date() },
            },
            entityType: "listing",
          });
        } catch (err) {
          logger.warn("VIEW_INC_FAILED", {
            correlationId,
            id,
            err: String((err as Error)?.message || err),
          });
        } finally {
          clearTenantContext();
        }
      })();
    } else {
      // Fallback: increment without tenant context if orgId missing (legacy data)
      incrementAnalyticsWithRetry({
        model: AqarListing,
        id: new mongoose.Types.ObjectId(id),
        updateOp: {
          $inc: { "analytics.views": 1 },
          $set: { "analytics.lastViewedAt": new Date() },
        },
        entityType: "listing",
      }).catch((err: Error) => {
        logger.warn("VIEW_INC_FAILED", {
          correlationId,
          id,
          err: String(err?.message || err),
        });
      });
    }

    return ok({ listing }, { correlationId });
  } catch (error) {
    logger.error("Error fetching listing:", error);
    return handleApiError(error);
  }
}

// PATCH /api/aqar/listings/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Rate limiting: 30 requests per minute per IP for updates
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "aqar:listings:patch",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDb();

    const user = await getSessionUser(request);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 },
      );
    }

    // SEC-002: Enforce tenant + ownership scope in the query itself
    // NO_LEAN: Document needed for update operations
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for update
    const listing = await AqarListing.findOne({
      _id: id,
      listerId: user.id,
      $or: [{ orgId: user.orgId }, { org_id: user.orgId }],
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: body, error: parseError } = await parseBodySafe<{
      transactionValue?: number;
      vatAmount?: number;
      [key: string]: unknown;
    }>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }
    const transactionValue =
      typeof body.transactionValue === "number"
        ? body.transactionValue
        : undefined;
    const vatAmount =
      typeof body.vatAmount === "number" ? body.vatAmount : undefined;

    // Update allowed fields
    const allowedFields = [
      "title",
      "description",
      "price",
      "areaSqm",
      "beds",
      "baths",
      "kitchens",
      "ageYears",
      "furnishing",
      "amenities",
      "media",
      "address",
      "neighborhood",
      "status",
    ] as const;

    // Validate and assign fields with type/enum checks
    const prevStatus = listing.status;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const value = body[field];

        // Validate enum fields using actual schema enums
        if (
          field === "furnishing" &&
          !Object.values(FurnishingStatus).includes(value as FurnishingStatus)
        ) {
          return NextResponse.json(
            { error: `Invalid furnishing: ${value}` },
            { status: 400 },
          );
        }
        if (
          field === "status" &&
          !Object.values(ListingStatus).includes(value as ListingStatus)
        ) {
          return NextResponse.json(
            { error: `Invalid status: ${value}` },
            { status: 400 },
          );
        }

        // Validate numeric fields
        if (field === "price" || field === "areaSqm") {
          if (typeof value !== "number" || value <= 0) {
            return NextResponse.json(
              { error: `${field} must be a positive number` },
              { status: 400 },
            );
          }
        }
        if (field === "beds" || field === "baths" || field === "kitchens") {
          if (
            typeof value !== "number" ||
            value < 0 ||
            !Number.isInteger(value)
          ) {
            return NextResponse.json(
              { error: `${field} must be a non-negative integer` },
              { status: 400 },
            );
          }
        }
        if (field === "ageYears") {
          if (typeof value !== "number" || value < 0) {
            return NextResponse.json(
              { error: "ageYears must be non-negative" },
              { status: 400 },
            );
          }
        }

        // Validate string fields are non-empty
        if (
          (field === "title" || field === "description") &&
          (typeof value !== "string" || value.trim().length === 0)
        ) {
          return NextResponse.json(
            { error: `${field} must be a non-empty string` },
            { status: 400 },
          );
        }

        (listing as unknown as Record<string, unknown>)[field] = value;
      }
    }

    if ("proptech" in body) {
      const normalized = normalizeProptech(body.proptech);
      listing.proptech = normalized;
    }
    if ("immersive" in body) {
      const normalizedImmersive = normalizeImmersive(body.immersive);
      listing.immersive = normalizedImmersive;
    }

    await listing.save();

    const statusChanged = body.status && body.status !== prevStatus;
    if (statusChanged) {
      await AqarFmLifecycleService.handleStatusChange({
        listingId: id,
        nextStatus: body.status as ListingStatus,
        prevStatus,
        actorId: user.id,
        transactionValue,
        vatAmount,
      });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    logger.error("Error updating listing:", error);
    return handleApiError(error);
  }
}

// DELETE /api/aqar/listings/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Rate limiting: 20 requests per minute per IP for deletes
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "aqar:listings:delete",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDb();

    const user = await getSessionUser(request);

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 },
      );
    }

    // SEC-002: Enforce tenant + ownership scope in the query itself
    // NO_LEAN: Document needed for .deleteOne() method
    // eslint-disable-next-line local/require-lean -- NO_LEAN: needs .deleteOne()
    const listing = await AqarListing.findOne({
      _id: id,
      listerId: user.id,
      $or: [{ orgId: user.orgId }, { org_id: user.orgId }],
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // SAFE: deleteOne on already-scoped listing (line 338)
    // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: Already scoped via findOne query above
    await listing.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting listing:", error);
    return handleApiError(error);
  }
}
