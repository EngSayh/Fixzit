/**
 * @fileoverview Building Model API - 3D Building Model Management
 * @description API for generating and retrieving 3D building models for properties.
 *
 * @route GET /api/fm/properties/[id]/building-model - Get building model for property
 * @route POST /api/fm/properties/[id]/building-model - Generate new building model
 * @module api/fm/properties/[id]/building-model
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - PROPERTY:VIEW for GET, PROPERTY:EDIT for POST
 *
 * Features:
 * - Procedural 3D building generation
 * - AI-powered generation (premium tier, future)
 * - Unit synchronization with property units
 * - Multi-tenant isolation via orgId
 * - S3 storage for large models (>800KB) with gzip compression
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey, SubmoduleKey } from "@/domain/fm/fm.types";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { audit } from "@/lib/audit";
import {
  putJsonToS3,
  getObjectText,
  buildBuildingModelS3Key,
} from "@/lib/storage/s3";
import { isS3Configured } from "@/lib/storage/s3-config";
import {
  BuildingGenSpecSchema,
  generateBuildingModel,
  attachUnitDbIds,
  type BuildingModel as _BuildingModel,
} from "@/lib/buildingModel";

const PROPERTIES_COLLECTION = "properties";
const BUILDING_MODELS_COLLECTION = "building_models";

// S3 storage threshold - models larger than this are stored in S3
const MAX_INLINE_BYTES = (() => {
  const raw = process.env.FIXZIT_BUILDING_MODEL_INLINE_MAX_BYTES;
  const n = raw ? Number(raw) : 800_000; // ~0.8MB default
  return Number.isFinite(n) && n > 50_000 ? n : 800_000;
})();

// POST body schema
const GenerateBuildingModelSchema = z.object({
  spec: BuildingGenSpecSchema,
  /** When true: create/update unit records in the property using the generated model's unit keys */
  syncUnits: z.boolean().optional().default(true),
});

/**
 * GET /api/fm/properties/[id]/building-model
 * Retrieve the latest building model for a property
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "building-model:get",
    requests: 30,
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

    // Get latest building model
    const buildingModel = await db
      .collection(BUILDING_MODELS_COLLECTION)
      .findOne(
        {
          propertyId: new ObjectId(params.id),
          orgId: tenantId,
        },
        { sort: { version: -1 } }
      );

    // Fetch model data - inline or from S3
    let modelData = buildingModel?.model;
    if (!modelData && buildingModel?.modelS3?.bucket && buildingModel?.modelS3?.key) {
      try {
        const text = await getObjectText({
          bucket: buildingModel.modelS3.bucket,
          key: buildingModel.modelS3.key,
        });
        modelData = JSON.parse(text);
      } catch (err) {
        logger.error("Failed to fetch building model from S3:", { err });
        // Continue without model data
      }
    }

    // Get units from property
    const units = property.units || [];

    return NextResponse.json({
      success: true,
      data: {
        buildingModel: buildingModel
          ? {
              id: buildingModel._id.toString(),
              propertyId: buildingModel.propertyId.toString(),
              version: buildingModel.version,
              status: buildingModel.status,
              generator: buildingModel.generator,
              input: buildingModel.input,
              model: modelData,
              modelInline: !!buildingModel.model,
              modelBytes: buildingModel.modelBytes,
              modelS3: buildingModel.modelS3 ? {
                bucket: buildingModel.modelS3.bucket,
                key: buildingModel.modelS3.key,
                bytes: buildingModel.modelS3.bytes,
              } : undefined,
              createdAt: buildingModel.createdAt,
              updatedAt: buildingModel.updatedAt,
            }
          : null,
        units: units.map((u: Record<string, unknown>, idx: number) => ({
          _id: (u._id as ObjectId)?.toString() ?? `unit-${idx}`,
          unitNumber: u.unitNumber,
          type: u.type,
          area: u.area,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          halls: u.halls,
          status: u.status,
          designKey: u.designKey,
          electricityMeter: u.electricityMeter,
          waterMeter: u.waterMeter,
          floor: u.floor,
          sizeSqm: u.sizeSqm,
        })),
      },
    });
  } catch (error) {
    logger.error("Error fetching building model:", { error });
    return NextResponse.json(
      { error: "Failed to fetch building model" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fm/properties/[id]/building-model
 * Generate a new building model for a property
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "building-model:generate",
    requests: 10,
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

    // RBAC: Only property_owner and agent roles can generate models
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
        { error: "Insufficient permissions to generate building models" },
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

    // Parse request body
    const bodyResult = await req.json().catch(() => null);
    if (!bodyResult) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const parseResult = GenerateBuildingModelSchema.safeParse(bodyResult);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid specification", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { spec, syncUnits } = parseResult.data;
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

    // Generate the 3D model
    const generated = generateBuildingModel(spec);

    // Sync units to property if requested
    const updatedUnits: Array<Record<string, unknown>> = property.units || [];

    if (syncUnits) {
      const existingUnits = new Map<string, Record<string, unknown>>();
      for (const unit of updatedUnits) {
        if (unit.designKey) {
          existingUnits.set(unit.designKey as string, unit);
        }
      }

      // Add/update units from generated model
      for (const floor of generated.floors) {
        for (const modelUnit of floor.units) {
          const existing = existingUnits.get(modelUnit.key);
          if (existing) {
            // Update existing unit
            existing.floor = existing.floor ?? String(floor.index + 1);
            existing.sizeSqm = existing.sizeSqm ?? modelUnit.metadata.areaSqm;
            existing.unitNumber = existing.unitNumber ?? modelUnit.metadata.unitNumber;
            existing.bedrooms = existing.bedrooms ?? modelUnit.metadata.bedrooms;
            existing.bathrooms = existing.bathrooms ?? modelUnit.metadata.bathrooms;
            existing.halls = existing.halls ?? modelUnit.metadata.halls;
          } else {
            // Create new unit
            updatedUnits.push({
              _id: new ObjectId(),
              unitNumber: modelUnit.metadata.unitNumber,
              type: "Apartment",
              area: modelUnit.metadata.areaSqm,
              bedrooms: modelUnit.metadata.bedrooms,
              bathrooms: modelUnit.metadata.bathrooms,
              halls: modelUnit.metadata.halls,
              status: "VACANT",
              designKey: modelUnit.key,
              floor: String(floor.index + 1),
              sizeSqm: modelUnit.metadata.areaSqm,
              amenities: [],
            });
          }
        }
      }

      // Update property with synced units
      await db.collection(PROPERTIES_COLLECTION).updateOne(
        { _id: new ObjectId(params.id), orgId: tenantId },
        { $set: { units: updatedUnits, updatedAt: new Date() } }
      );
    }

    // Attach unit IDs to the model
    const hydratedModel = attachUnitDbIds(
      generated,
      updatedUnits.map((u) => ({
        _id: (u._id as ObjectId)?.toString() ?? "",
        designKey: u.designKey as string | undefined,
        electricityMeter: u.electricityMeter as string | undefined,
        waterMeter: u.waterMeter as string | undefined,
      }))
    );

    // Get current version
    const existingModel = await db
      .collection(BUILDING_MODELS_COLLECTION)
      .findOne(
        { propertyId: new ObjectId(params.id), orgId: tenantId },
        { sort: { version: -1 } }
      );

    const newVersion = existingModel ? existingModel.version + 1 : 1;

    // Calculate model size and determine storage location
    const modelJson = JSON.stringify(hydratedModel);
    const modelBytes = Buffer.byteLength(modelJson, "utf8");

    // Decide: inline or S3 storage
    let modelInline: typeof hydratedModel | null = hydratedModel;
    let modelS3: { bucket: string; key: string; bytes: number } | undefined;

    if (modelBytes > MAX_INLINE_BYTES && isS3Configured()) {
      try {
        const s3Key = buildBuildingModelS3Key(tenantId, params.id, newVersion);
        const s3Result = await putJsonToS3({
          key: s3Key,
          json: hydratedModel,
          gzip: true,
          cacheControl: "private, max-age=31536000",
        });
        modelInline = null;
        modelS3 = { bucket: s3Result.bucket, key: s3Result.key, bytes: s3Result.bytes };
        logger.info("Building model stored in S3", { 
          propertyId: params.id, 
          version: newVersion, 
          originalBytes: modelBytes,
          compressedBytes: s3Result.bytes,
        });
      } catch (err) {
        logger.warn("Failed to store building model in S3, falling back to inline", { err });
        // Keep modelInline as-is if S3 fails
      }
    }

    // Create building model document
    const modelDoc: Record<string, unknown> = {
      propertyId: new ObjectId(params.id),
      orgId: tenantId,
      version: newVersion,
      status: "DRAFT",
      generator: "procedural",
      input: spec,
      model: modelInline,
      modelBytes,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: actor.userId,
    };

    // Add S3 reference if model was stored in S3
    if (modelS3) {
      modelDoc.modelS3 = modelS3;
    }

    const result = await db
      .collection(BUILDING_MODELS_COLLECTION)
      .insertOne(modelDoc);

    // Audit log
    await audit({
      actorId: actor.userId ?? actor.id,
      actorEmail: actor.email ?? actor.userId ?? actor.id,
      actorRole: actor.role,
      action: "building_model.generate",
      target: result.insertedId.toString(),
      targetType: "BuildingModel",
      orgId: tenantId,
      success: true,
      meta: {
        propertyId: params.id,
        version: newVersion,
        floors: spec.floors,
        apartmentsPerFloor: spec.apartmentsPerFloor,
        template: spec.template,
        syncUnits,
        modelBytes,
        storedIn: modelS3 ? "s3" : "inline",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        buildingModel: {
          id: result.insertedId.toString(),
          propertyId: params.id,
          version: newVersion,
          status: "DRAFT",
          generator: "procedural",
          input: spec,
          model: hydratedModel,
          modelInline: !!modelInline,
          modelBytes,
          modelS3,
          createdAt: modelDoc.createdAt,
          updatedAt: modelDoc.updatedAt,
        },
        units: updatedUnits.map((u, idx) => ({
          _id: (u._id as ObjectId)?.toString() ?? `unit-${idx}`,
          unitNumber: u.unitNumber,
          type: u.type,
          area: u.area,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          halls: u.halls,
          status: u.status,
          designKey: u.designKey,
          electricityMeter: u.electricityMeter,
          waterMeter: u.waterMeter,
          floor: u.floor,
          sizeSqm: u.sizeSqm,
        })),
      },
    });
  } catch (error) {
    logger.error("Error generating building model:", { error });
    return NextResponse.json(
      { error: "Failed to generate building model" },
      { status: 500 }
    );
  }
}
