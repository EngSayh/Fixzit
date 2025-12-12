/**
 * @fileoverview Preventive Maintenance Plans API
 * @description Manages preventive maintenance plans with CRUD operations for scheduling recurring maintenance tasks.
 * @route GET /api/pm/plans - List PM plans with optional filters
 * @route POST /api/pm/plans - Create a new PM plan
 * @access Authenticated (tenant-scoped)
 * @module pm
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { FMPMPlan } from "@/server/models/FMPMPlan";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { createSecureResponse } from "@/server/security/headers";

/**
 * GET /api/pm/plans
 * List all PM plans with optional filters (tenant-scoped)
 */
export async function GET(request: NextRequest) {
  let orgId: string;
  try {
    const user = await getSessionUser(request);
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    // 🔒 TENANT-SCOPED: Always include orgId in query
    const query: Record<string, string> = { orgId };
    if (propertyId) query.propertyId = propertyId;
    if (status) query.status = status;
    if (category) query.category = category;

    const plans = await FMPMPlan.find(query)
      .sort({ nextScheduledDate: 1 })
      .limit(500) // 🔒 SECURITY: Prevent unbounded query (BUG-008 fix)
      .lean();

    return NextResponse.json({
      success: true,
      data: plans,
      count: plans.length,
    });
  } catch (error) {
    logger.error(
      "[API] Failed to fetch PM plans:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch PM plans" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pm/plans
 * Create new PM plan (tenant-scoped)
 */
export async function POST(request: NextRequest) {
  let orgId: string;
  try {
    const user = await getSessionUser(request);
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, request);
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.propertyId || !body.recurrencePattern) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Whitelist editable fields only
    const whitelistedData = {
      title: body.title,
      description: body.description,
      propertyId: body.propertyId,
      category: body.category,
      recurrencePattern: body.recurrencePattern,
      startDate: body.startDate,
      status: body.status || "ACTIVE",
      assignedTo: body.assignedTo,
      estimatedDuration: body.estimatedDuration,
      instructions: body.instructions,
    };

    // 🔒 TENANT-SCOPED: Always include orgId when creating
    const plan = await FMPMPlan.create({
      ...whitelistedData,
      orgId, // Enforce tenant scope
      nextScheduledDate: body.startDate || new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        data: plan,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error(
      "[API] Failed to create PM plan:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { success: false, error: "Failed to create PM plan" },
      { status: 500 },
    );
  }
}
