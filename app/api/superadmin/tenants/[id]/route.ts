/**
 * @fileoverview Superadmin Single Tenant API
 * @description GET/PATCH/DELETE endpoints for managing individual organizations
 * @route GET/PATCH/DELETE /api/superadmin/tenants/[id]
 * @access Superadmin only
 * @module api/superadmin/tenants/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { Organization } from "@/server/models/Organization";
import mongoose from "mongoose";
import { z } from "zod";

// Update organization schema
const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(["CORPORATE", "GOVERNMENT", "INDIVIDUAL", "NONPROFIT", "STARTUP"]).optional(),
  subscriptionStatus: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "TRIAL", "EXPIRED"]).optional(),
  complianceStatus: z.enum(["COMPLIANT", "NON_COMPLIANT", "PENDING_REVIEW", "UNDER_AUDIT"]).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  features: z.object({
    maxUsers: z.number().optional(),
    maxProperties: z.number().optional(),
    maxWorkOrders: z.number().optional(),
    advancedReporting: z.boolean().optional(),
    apiAccess: z.boolean().optional(),
    customBranding: z.boolean().optional(),
    ssoIntegration: z.boolean().optional(),
    mobileApp: z.boolean().optional(),
  }).optional(),
}).strict();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/superadmin/tenants/[id]
 * Get a single organization by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    await connectDb();

    const org = await Organization.findById(id).lean().exec();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    logger.error("[Superadmin Tenants] Failed to get organization", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/superadmin/tenants/[id]
 * Update an organization
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    await connectDb();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const parsed = updateOrgSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Build update with flattened features
    const updateDoc: Record<string, unknown> = { ...updates };
    delete updateDoc.features;

    if (updates.features) {
      Object.entries(updates.features).forEach(([key, value]) => {
        if (value !== undefined) {
          updateDoc[`features.${key}`] = value;
        }
      });
    }

    updateDoc.updatedAt = new Date();
    updateDoc.updatedBy = session.username;

    const org = await Organization.findByIdAndUpdate(
      id,
      { $set: updateDoc },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    logger.info("[Superadmin Tenants] Organization updated", {
      orgId: id,
      updates: Object.keys(updates),
      updatedBy: session.username,
    });

    return NextResponse.json({ organization: org });
  } catch (error) {
    logger.error("[Superadmin Tenants] Failed to update organization", error as Error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superadmin/tenants/[id]
 * Soft-delete an organization (set status to CANCELLED)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    await connectDb();

    // Soft delete by setting status to SUSPENDED (not CANCELLED - aligns with UI "Suspend" action)
    const org = await Organization.findByIdAndUpdate(
      id,
      {
        $set: {
          subscriptionStatus: "SUSPENDED",
          suspendedAt: new Date(),
          suspendedBy: session.username,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean().exec();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    logger.info("[Superadmin Tenants] Organization suspended", {
      orgId: id,
      suspendedBy: session.username,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Organization has been suspended" 
    });
  } catch (error) {
    logger.error("[Superadmin Tenants] Failed to delete organization", error as Error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
