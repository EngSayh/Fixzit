/**
 * @fileoverview Public Tour API - Privacy-Safe 3D Building Tour
 * @description Public API for accessing published building tours without authentication.
 *
 * @route GET /api/fm/properties/[id]/tour - Get public tour data
 * @module api/fm/properties/[id]/tour
 * @requires No authentication - Public endpoint
 *
 * Features:
 * - No authentication required (public access)
 * - Only returns PUBLISHED building models
 * - Privacy-safe: removes sensitive unit data (electricityMeter, waterMeter)
 * - Supports caching for better performance
 * - Fetches from inline storage or S3
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getObjectText } from "@/lib/storage/s3";

export const runtime = "nodejs";

const PROPERTIES_COLLECTION = "properties";
const BUILDING_MODELS_COLLECTION = "building_models";

/**
 * Sanitize unit data for public access
 * Removes sensitive fields like meter readings and tenant info
 */
function sanitizeUnitPublic(unit: Record<string, unknown>): Record<string, unknown> {
  const { 
    electricityMeter: _e, 
    waterMeter: _w, 
    orgId: _o,
    tenantId: _t,
    tenant: _tenant,
    ...safe 
  } = unit;
  return safe;
}

/**
 * Sanitize model metadata for public access
 * Removes internal unit IDs and meter numbers from model metadata
 */
function sanitizeModelPublic(model: unknown): unknown {
  if (!model || typeof model !== "object") return model;
  const clone = JSON.parse(JSON.stringify(model)) as {
    floors?: Array<{ units?: Array<{ metadata?: Record<string, unknown> }> }>;
  };
  if (!Array.isArray(clone.floors)) return clone;
  for (const floor of clone.floors) {
    if (!Array.isArray(floor.units)) continue;
    for (const unit of floor.units) {
      if (!unit?.metadata) continue;
      delete unit.metadata.unitDbId;
      delete unit.metadata.electricityMeter;
      delete unit.metadata.waterMeter;
    }
  }
  return clone;
}

/**
 * GET /api/fm/properties/[id]/tour
 * Get public tour data for a published building model
 * 
 * Returns:
 * - Published 3D model data
 * - Privacy-safe unit information
 * - Property metadata
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "tour:public",
    requests: 100,
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

    // Require PUBLIC_ORG_ID for tenant-scoped public tours
    const publicOrgId = process.env.PUBLIC_ORG_ID;
    if (!publicOrgId) {
      logger.warn("Public tour requested without PUBLIC_ORG_ID configured", {
        propertyId: params.id,
      });
      return NextResponse.json(
        { error: "Tour not available for this property" },
        { status: 404 }
      );
    }

    const db = await getDatabase();

    // Get published building model (latest version with PUBLISHED status)
    const record = await db
      .collection(BUILDING_MODELS_COLLECTION)
      .findOne(
        {
          propertyId: new ObjectId(params.id),
          orgId: publicOrgId,
          status: "PUBLISHED",
        },
        { sort: { version: -1 } }
      );

    if (!record) {
      return NextResponse.json(
        { error: "Tour not available for this property" },
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
        logger.error("Failed to fetch tour model from S3:", { 
          err, 
          propertyId: params.id,
        });
        return NextResponse.json(
          { error: "Tour data unavailable" },
          { status: 500 }
        );
      }
    }

    if (!model) {
      return NextResponse.json(
        { error: "Tour data missing" },
        { status: 500 }
      );
    }

    // Get property for units and basic info (scoped to public org)
    const property = await db
      .collection(PROPERTIES_COLLECTION)
      .findOne(
        { _id: new ObjectId(params.id), orgId: publicOrgId },
        { 
          projection: { 
            name: 1, 
            units: 1, 
            address: 1,
            type: 1,
            // Exclude sensitive fields
            orgId: 0,
            tenantId: 0,
          } 
        }
      );

    // Sanitize units for public access
    const units = (property?.units || []).map(sanitizeUnitPublic);

    // Sanitize model metadata to remove internal IDs and meter numbers
    const sanitizedModel = sanitizeModelPublic(model);

    // Build response with caching headers
    const response = NextResponse.json({
      success: true,
      data: {
        model: sanitizedModel,
        version: record.version,
        propertyId: params.id,
        propertyName: property?.name,
        propertyType: property?.type,
        units,
      },
    });

    // Published tours can be cached
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300"
    );

    return response;
  } catch (error) {
    logger.error("Error fetching public tour:", { error });
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
