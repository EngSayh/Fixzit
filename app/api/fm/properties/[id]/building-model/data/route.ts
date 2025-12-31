/**
 * @fileoverview Building Model Data API - Fetch 3D Model JSON
 * @description API for fetching building model JSON data (from inline or S3).
 *
 * @route GET /api/fm/properties/[id]/building-model/data - Get model JSON
 * @module api/fm/properties/[id]/building-model/data
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - PROPERTY:VIEW
 *
 * Features:
 * - Fetches model from inline storage or S3
 * - Version parameter for accessing specific versions (privileged users only)
 * - Tenant scope queries include tenants seeing only published models
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey, SubmoduleKey } from "@/domain/fm/fm.types";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getObjectText } from "@/lib/storage/s3";

export const runtime = "nodejs";

const PROPERTIES_COLLECTION = "properties";
const BUILDING_MODELS_COLLECTION = "building_models";

// Privileged roles that can access any version
const PRIVILEGED_ROLES = [
  "SUPER_ADMIN",
  "CORPORATE_ADMIN",
  "PROPERTY_OWNER",
  "CORPORATE_OWNER",
  "AGENT",
  "MANAGEMENT",
];

/**
 * GET /api/fm/properties/[id]/building-model/data
 * Fetch building model JSON data (inline or from S3)
 * 
 * Query params:
 * - version: Specific version to fetch (privileged users only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "building-model:data",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate property ID
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid property ID format" },
        { status: 400 }
      );
    }

    const actor = await requireFmPermission(req, {
      module: ModuleKey.PROPERTIES,
      submodule: SubmoduleKey.PROP_LIST,
      action: FMAction.VIEW,
    });
    if (actor instanceof NextResponse) return actor;

    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      {
        isSuperAdmin: actor.isSuperAdmin,
        userId: actor.userId,
        allowHeaderOverride: actor.isSuperAdmin,
      }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const db = await getDatabase();

    // Verify property exists and belongs to tenant
    const property = await db
      .collection(PROPERTIES_COLLECTION)
      .findOne({
        _id: new ObjectId(params.id),
        orgId: tenantId,
      });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Determine if user is privileged
    const isPrivileged = PRIVILEGED_ROLES.includes(actor.role || "");

    // Parse version param
    const versionParam = req.nextUrl.searchParams.get("version");
    const requestedVersion = isPrivileged && versionParam ? Number(versionParam) : null;

    // Build query
    type BuildingModelQuery = {
      propertyId: ObjectId;
      orgId: string;
      version?: number;
      status?: string;
    };

    const query: BuildingModelQuery = {
      propertyId: new ObjectId(params.id),
      orgId: tenantId,
    };

    // Add version or status filter based on access level
    if (requestedVersion && Number.isFinite(requestedVersion)) {
      query.version = requestedVersion;
    } else if (!isPrivileged) {
      // Non-privileged users can only see published models
      query.status = "PUBLISHED";
    }

    // Fetch model record
    const record = requestedVersion
      ? await db.collection(BUILDING_MODELS_COLLECTION).findOne(query)
      : await db.collection(BUILDING_MODELS_COLLECTION).findOne(query, {
          sort: { version: -1 },
        });

    if (!record) {
      return NextResponse.json(
        { error: "Building model not found" },
        { status: 404 }
      );
    }

    // Get model data - inline or from S3
    let model = record.model;
    
    if (!model && record.modelS3?.bucket && record.modelS3?.key) {
      try {
        const text = await getObjectText({
          bucket: record.modelS3.bucket,
          key: record.modelS3.key,
        });
        model = JSON.parse(text);
      } catch (err) {
        logger.error("Failed to fetch building model from S3:", { 
          err, 
          propertyId: params.id,
          bucket: record.modelS3.bucket,
          key: record.modelS3.key,
        });
        return NextResponse.json(
          { error: "Failed to fetch building model data" },
          { status: 500 }
        );
      }
    }

    if (!model) {
      return NextResponse.json(
        { error: "Building model data missing" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        model,
        version: record.version,
        status: record.status,
        generator: record.generator,
        modelInline: !!record.model,
        modelBytes: record.modelBytes,
      },
    });
  } catch (error) {
    logger.error("Error fetching building model data:", { error });
    return NextResponse.json(
      { error: "Failed to fetch building model data" },
      { status: 500 }
    );
  }
}
