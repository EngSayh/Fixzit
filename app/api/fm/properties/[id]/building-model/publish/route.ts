/**
 * @fileoverview Building Model Publish API
 * @description API for publishing building models to make them visible to tenants.
 *
 * @route POST /api/fm/properties/[id]/building-model/publish - Publish latest building model
 * @module api/fm/properties/[id]/building-model/publish
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - PROPERTY:EDIT permission
 *
 * Features:
 * - Publishes latest DRAFT model
 * - Archives previously published models
 * - Multi-tenant isolation via orgId
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
import { audit } from "@/lib/audit";

const PROPERTIES_COLLECTION = "properties";
const BUILDING_MODELS_COLLECTION = "building_models";

/**
 * POST /api/fm/properties/[id]/building-model/publish
 * Publish the latest building model for a property
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "building-model:publish",
    requests: 5,
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
      action: FMAction.UPDATE,
    });
    if (actor instanceof NextResponse) return actor;

    // RBAC: Only property_owner and agent roles can publish models
    const allowedRoles = [
      "SUPER_ADMIN",
      "CORPORATE_ADMIN",
      "PROPERTY_OWNER",
      "CORPORATE_OWNER",
      "AGENT",
      "MANAGEMENT",
    ];
    if (!allowedRoles.includes(actor.role || "")) {
      return NextResponse.json(
        { error: "Insufficient permissions to publish building models" },
        { status: 403 }
      );
    }

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

    // Get latest building model
    const latestModel = await db
      .collection(BUILDING_MODELS_COLLECTION)
      .findOne(
        {
          propertyId: new ObjectId(params.id),
          orgId: tenantId,
        },
        { sort: { version: -1 } }
      );

    if (!latestModel) {
      return NextResponse.json(
        { error: "No building model found. Generate a model first." },
        { status: 404 }
      );
    }

    if (latestModel.status === "PUBLISHED") {
      return NextResponse.json({
        success: true,
        data: {
          id: latestModel._id.toString(),
          propertyId: latestModel.propertyId.toString(),
          version: latestModel.version,
          status: latestModel.status,
          message: "Model is already published",
        },
      });
    }

    // Archive any previously published models
    await db.collection(BUILDING_MODELS_COLLECTION).updateMany(
      {
        propertyId: new ObjectId(params.id),
        orgId: tenantId,
        status: "PUBLISHED",
      },
      {
        $set: {
          status: "ARCHIVED",
          updatedAt: new Date(),
        },
      }
    );

    // Publish the latest model
    const _result = await db.collection(BUILDING_MODELS_COLLECTION).updateOne(
      { _id: latestModel._id },
      {
        $set: {
          status: "PUBLISHED",
          updatedAt: new Date(),
          "metadata.publishedAt": new Date(),
          "metadata.publishedBy": actor.userId,
        },
      }
    );

    // Audit log
    await audit({
      actorId: actor.userId ?? actor.id,
      actorEmail: actor.email ?? actor.userId ?? actor.id,
      actorRole: actor.role,
      action: "building_model.publish",
      target: latestModel._id.toString(),
      targetType: "BuildingModel",
      orgId: tenantId,
      success: true,
      meta: {
        propertyId: params.id,
        version: latestModel.version,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: latestModel._id.toString(),
        propertyId: params.id,
        version: latestModel.version,
        status: "PUBLISHED",
        message: "Building model published successfully",
      },
    });
  } catch (error) {
    logger.error("Error publishing building model:", { error });
    return NextResponse.json(
      { error: "Failed to publish building model" },
      { status: 500 }
    );
  }
}
