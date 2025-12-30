/**
 * @fileoverview Superadmin Integration by ID API
 * @description GET/PUT/DELETE individual integration
 * @route GET/PUT/DELETE /api/superadmin/integrations/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/integrations/[id]
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { Integration } from "@/server/models/Integration";
import { z } from "zod";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ENVIRONMENTS = ["production", "sandbox", "development"] as const;

const UpdateIntegrationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  credentials: z.record(z.string(), z.string()).optional(),
  webhookUrl: z.string().url().max(500).optional().nullable(),
  webhookSecret: z.string().max(500).optional(),
  environment: z.enum(ENVIRONMENTS).optional(),
  version: z.string().max(50).optional(),
  features: z.array(z.string().max(100)).max(20).optional(),
  healthCheck: z.object({
    enabled: z.boolean().optional(),
    interval: z.number().min(5).max(1440).optional(), // 5 min to 24 hours
  }).optional(),
});

/**
 * GET /api/superadmin/integrations/[id]
 * Get a specific integration
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-integration-id:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid integration ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const integration = await Integration.findById(id).lean();
    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    // Mask credentials (show that they exist but not values)
    const safeIntegration = {
      ...integration,
      credentials: integration.credentials
        ? Object.fromEntries(
            Object.keys(integration.credentials).map(k => [k, "••••••••"])
          )
        : {},
      webhookSecret: integration.webhookSecret ? "••••••••" : undefined,
      hasCredentials: Object.keys(integration.credentials || {}).length > 0,
    };

    return NextResponse.json(
      { integration: safeIntegration },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Integration] Error fetching integration", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/integrations/[id]
 * Update an integration
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-integration-id:put",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid integration ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const body = await request.json();
    const validation = UpdateIntegrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const existing = await Integration.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    // Prepare update - merge credentials if partial update
    const updateData: Record<string, unknown> = { ...validation.data };
    if (validation.data.credentials) {
      updateData.credentials = {
        ...existing.credentials,
        ...validation.data.credentials,
      };
    }

    // Update status based on credentials
    if (validation.data.credentials || validation.data.enabled !== undefined) {
      const hasCredentials = Object.keys(
        (updateData.credentials as Record<string, unknown>) || existing.credentials || {}
      ).length > 0;
      if (!hasCredentials) {
        updateData.status = "pending_setup";
      } else if (validation.data.enabled === true) {
        updateData.status = "active";
      } else if (validation.data.enabled === false) {
        updateData.status = "inactive";
      }
    }

    const integration = await Integration.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    logger.info("[Superadmin:Integration] Integration updated", {
      integrationId: id,
      updates: Object.keys(validation.data).filter(k => k !== "credentials"),
      credentialsUpdated: !!validation.data.credentials,
      by: session.username,
    });

    // Return without exposing credentials
    const safeIntegration = {
      ...integration,
      credentials: integration?.credentials
        ? Object.fromEntries(
            Object.keys(integration.credentials).map(k => [k, "••••••••"])
          )
        : {},
      webhookSecret: integration?.webhookSecret ? "••••••••" : undefined,
    };

    return NextResponse.json(
      { integration: safeIntegration, message: "Integration updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Integration] Error updating integration", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/integrations/[id]
 * Delete an integration
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-integration-id:delete",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid integration ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check if it's a system integration
    const existing = await Integration.findById(id).lean();
    if (existing?.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system integrations. You can disable them instead." },
        { status: 403, headers: ROBOTS_HEADER }
      );
    }

    const integration = await Integration.findByIdAndDelete(id);
    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Integration] Integration deleted", {
      integrationId: id,
      type: integration.type,
      provider: integration.provider,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Integration deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Integration] Error deleting integration", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
