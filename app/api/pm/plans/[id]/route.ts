/**
 * @fileoverview Preventive Maintenance Plan Detail API
 * @description Handles individual PM plan operations including retrieval, updates, and deletion by plan ID.
 * @route GET /api/pm/plans/[id] - Get single PM plan by ID
 * @route PATCH /api/pm/plans/[id] - Update a PM plan
 * @route DELETE /api/pm/plans/[id] - Delete a PM plan
 * @access Authenticated (role-based, tenant-scoped)
 * @module pm
 */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import { FMPMPlan } from "@/server/models/FMPMPlan";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { createSecureResponse } from "@/server/security/headers";
import { UserRole } from "@/types/user";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

const PM_ALLOWED_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.TECHNICIAN,
  UserRole.OPERATIONS_MANAGER,
] as const;

/**
 * GET /api/pm/plans/[id]
 * Get single PM plan by ID (tenant-scoped)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "pm:plans:get" });
  if (rateLimitResponse) return rateLimitResponse;

  let orgId: string;
  try {
    const user = await getSessionUser(request);
    const isAllowed = PM_ALLOWED_ROLES.some((role) => role === user.role);
    if (!isAllowed) {
      return createSecureResponse({ error: "Forbidden" }, 403, request);
    }
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, request);
  }

  try {
    const { id } = await params;
    
    // [FIXZIT-API-PM-001] Validate ObjectId before database operation
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid PM plan ID format" },
        { status: 400 }
      );
    }
    
    // 🔒 TENANT-SCOPED: Use findOne with orgId filter instead of findById
    const plan = await FMPMPlan.findOne({ _id: id, orgId }).lean();

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "PM plan not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error(
      "[API] Failed to fetch PM plan:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch PM plan" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/pm/plans/[id]
 * Update PM plan (tenant-scoped)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 30, windowMs: 60_000, keyPrefix: "pm:plans:patch" });
  if (rateLimitResponse) return rateLimitResponse;

  let orgId: string;
  try {
    const user = await getSessionUser(request);
    const isAllowed = PM_ALLOWED_ROLES.some((role) => role === user.role);
    if (!isAllowed) {
      return createSecureResponse({ error: "Forbidden" }, 403, request);
    }
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, request);
  }

  try {
    const { id } = await params;
    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { success: false, error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }

    // Whitelist approach: only allow updating specific fields
    const allowedFields = [
      "title",
      "description",
      "category",
      "recurrencePattern",
      "startDate",
      "status",
      "assignedTo",
      "estimatedDuration",
      "instructions",
      "nextScheduledDate",
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    }

    // Validate that at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // 🔒 TENANT-SCOPED: Use findOneAndUpdate with orgId filter
    const plan = await FMPMPlan.findOneAndUpdate(
      { _id: id, orgId },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "PM plan not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error(
      "[API] Failed to update PM plan:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { success: false, error: "Failed to update PM plan" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/pm/plans/[id]
 * Delete PM plan (soft delete - set status to INACTIVE) (tenant-scoped)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 10, windowMs: 60_000, keyPrefix: "pm:plans:delete" });
  if (rateLimitResponse) return rateLimitResponse;

  let orgId: string;
  try {
    const user = await getSessionUser(request);
    const isAllowed = PM_ALLOWED_ROLES.some((role) => role === user.role);
    if (!isAllowed) {
      return createSecureResponse({ error: "Forbidden" }, 403, request);
    }
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, request);
  }

  try {
    const { id } = await params;
    // 🔒 TENANT-SCOPED: Use findOneAndUpdate with orgId filter
    const plan = await FMPMPlan.findOneAndUpdate(
      { _id: id, orgId },
      { $set: { status: "INACTIVE" } },
      { new: true },
    );

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "PM plan not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "PM plan deactivated",
    });
  } catch (error) {
    logger.error(
      "[API] Failed to delete PM plan:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { success: false, error: "Failed to delete PM plan" },
      { status: 500 },
    );
  }
}
