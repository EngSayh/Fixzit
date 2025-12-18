/**
 * Filter Presets API
 * 
 * @route GET /api/filters/presets?entity_type=workOrders - List user's presets
 * @route POST /api/filters/presets - Save new preset
 * @route DELETE /api/filters/presets/:id - Delete preset
 * @access Private - Authenticated users
 * 
 * @module app/api/filters/presets
 */

import { NextResponse, NextRequest } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { FilterPreset } from "@/server/models/common/FilterPreset";
import { getSessionUser, UnauthorizedError } from "@/server/middleware/withAuthRbac";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  FILTER_ENTITY_TYPES,
  normalizeFilterEntityType,
  entityTypeQueryValues,
} from "@/lib/filters/entities";

const createPresetSchema = z.object({
  entity_type: z
    .string()
    .trim()
    .refine((value) => Boolean(normalizeFilterEntityType(value)), {
      message: "Invalid entity_type",
    }),
  name: z.string().min(1).max(100),
  filters: z.record(z.string(), z.unknown()), // Fixed: z.record now requires key schema
  sort: z.object({
    field: z.string(),
    direction: z.enum(["asc", "desc"]),
  }).optional(),
  search: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
});

/**
 * GET - List filter presets for current user
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, {
    identifier: "filter-presets-list",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  let session;
  try {
    session = await getSessionUser(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  const orgId = session.orgId;
  const userId = session.id;

  if (!orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = normalizeFilterEntityType(searchParams.get("entity_type"));

  if (searchParams.get("entity_type") && !entityType) {
    return NextResponse.json({ error: "Invalid entity_type" }, { status: 400 });
  }

  try {
    await connectDb();

    const query: Record<string, unknown> = {
      org_id: orgId,
      user_id: userId,
    };

    query.entity_type = { $in: entityTypeQueryValues(entityType) };

    const presets = await FilterPreset.find(query)
      .sort({ is_default: -1, updated_at: -1 })
      .lean()
      .exec();

    const normalizedPresets = presets.map((preset) => {
      const canonical = normalizeFilterEntityType(preset.entity_type as string);
      return canonical ? { ...preset, entity_type: canonical } : preset;
    });

    return NextResponse.json({
      presets: normalizedPresets,
      count: normalizedPresets.length,
    });
  } catch (error) {
    logger.error("[FilterPresets] GET failed", { error, orgId, userId, entityType });
    return NextResponse.json({ error: "Failed to fetch presets" }, { status: 500 });
  }
}

/**
 * POST - Create new filter preset
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, {
    identifier: "filter-presets-create",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  let session;
  try {
    session = await getSessionUser(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  const orgId = session.orgId;
  const userId = session.id;

  if (!orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = createPresetSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({
      error: "Validation failed",
      details: validation.error.flatten(),
    }, { status: 400 });
  }

  const { entity_type, name, filters, sort, search, is_default } = validation.data;
  const normalizedEntityType = normalizeFilterEntityType(entity_type);

  try {
    await connectDb();

    // Check preset limit per user (max 20 presets per entity type)
    const existingCount = await FilterPreset.countDocuments({
      org_id: orgId,
      user_id: userId,
      entity_type: { $in: entityTypeQueryValues(normalizedEntityType) },
    });

    if (existingCount >= 20) {
      return NextResponse.json({
        error: "Preset limit reached",
        message: "Maximum 20 presets per entity type",
      }, { status: 400 });
    }

    const preset = await FilterPreset.create({
      org_id: orgId,
      user_id: userId,
      entity_type: normalizedEntityType,
      name,
      filters,
      sort,
      search,
      is_default: is_default || false,
    });

    logger.info("[FilterPresets] Created preset", {
      presetId: preset._id,
      orgId,
      userId,
      entityType: normalizedEntityType,
      name,
    });

    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    logger.error("[FilterPresets] POST failed", { error, orgId, userId });
    return NextResponse.json({ error: "Failed to create preset" }, { status: 500 });
  }
}
