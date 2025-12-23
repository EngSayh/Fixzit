/**
 * @fileoverview Properties API - Facility Management Module
 * @description CRUD operations for property management within the FM module.
 * Properties represent buildings, facilities, or managed locations.
 *
 * @route GET /api/fm/properties - List properties
 * @route POST /api/fm/properties - Create a property
 * @module api/fm/properties
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - PROPERTY:VIEW for GET, PROPERTY:CREATE for POST
 *
 * Features:
 * - Multi-tenant isolation via orgId
 * - Filterable by type, status, lease_status
 * - Supports pagination (page, limit)
 * - Full-text search on name
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { unwrapFindOneResult } from "@/lib/mongoUtils.server";
import { logger } from "@/lib/logger";
import { parseBodySafe } from "@/lib/api/parse-body";
// RBAC-DRIFT-FIX: Import from fm.types.ts (canonical RBAC source)
import { ModuleKey, SubmoduleKey } from "@/domain/fm/fm.types";
import { FMAction } from "@/types/fm/enums";
import { FMErrors } from "@/app/api/fm/errors";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "../utils/tenant";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

type PropertyDocument = {
  _id: ObjectId;
  orgId: string; // AUDIT-2025-11-26: Changed from org_id to orgId for consistency
  name: string;
  code?: string;
  type?: string;
  status?: string;
  lease_status?: string;
  address?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  area?: number;
  floors?: number;
  createdAt: Date;
  updatedAt: Date;
};

type PropertyPayload = {
  name?: string;
  code?: string;
  type?: string;
  status?: string;
  leaseStatus?: string;
  address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  area?: number;
  floors?: number;
};

const COLLECTION_NAME = "properties";

const normalizeListParam = (value: string | null) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const mapProperty = (doc: PropertyDocument) => ({
  id: doc._id.toString(),
  name: doc.name,
  code: doc.code,
  type: doc.type,
  status: doc.status,
  leaseStatus: doc.lease_status,
  address: doc.address ?? null,
  metadata: doc.metadata ?? {},
  area: doc.area ?? null,
  floors: doc.floors ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function GET(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "fm-properties:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.PROPERTIES,
      submodule: SubmoduleKey.PROP_LIST,
      action: FMAction.VIEW,
    });
    if (actor instanceof NextResponse) return actor;
    // AUDIT-2025-11-26: Pass Super Admin context for proper audit logging
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const statuses = normalizeListParam(searchParams.get("status"));
    const leaseStatuses = normalizeListParam(searchParams.get("leaseStatus"));
    const types = normalizeListParam(searchParams.get("type"));
    const q = searchParams.get("q");

    const query: Record<string, unknown> = { orgId: tenantId }; // AUDIT-2025-11-26: Changed from org_id
    
    // Use $and to combine multiple filter conditions
    const andFilters: Record<string, unknown>[] = [];

    // RBAC-009: Role-based property filtering per STRICT v4.1
    // AUDIT-2025-11-26: Removed broken TENANT filtering (tenants use work-orders, not property list)
    // TENANTs should NOT have direct property list access - they access via work orders
    if (actor.role === "TENANT") {
      return NextResponse.json(
        { error: "Tenants do not have direct property list access" },
        { status: 403 }
      );
    }
    
    // AUDIT-2025-11-26: Support owner roles (corporate/owner)
    // STRICT v4.1: CORPORATE_OWNER is the canonical role (OWNER is legacy alias)
    if (actor.role === "CORPORATE_OWNER") {
      const ownedProperties = (actor as { ownedProperties?: string[] }).ownedProperties || [];
      if (ownedProperties.length === 0) {
        // Owners with no properties see empty list, not error
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
      query._id = { $in: ownedProperties.map(id => {
        try { return new ObjectId(id); } catch { return id; }
      }) };
    }
    
    // AUDIT-2025-11-26: Added PROPERTY_MANAGER filtering
    if (actor.role === "PROPERTY_MANAGER") {
      const assignedProperties = (actor as { assignedProperties?: string[] }).assignedProperties || [];
      if (assignedProperties.length > 0) {
        query._id = { $in: assignedProperties.map(id => {
          try { return new ObjectId(id); } catch { return id; }
        }) };
      }
    }
    
    if (statuses?.length) {
      query.status = { $in: statuses };
    }

    if (leaseStatuses?.length) {
      query.lease_status = { $in: leaseStatuses };
    }

    if (types?.length) {
      query.type = { $in: types };
    }

    if (q) {
      // Escape special regex characters to prevent injection
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const expression = { $regex: escapedQ, $options: "i" } as Record<
        string,
        unknown
      >;
      // FIX: Add search to $and filters instead of overwriting $or
      andFilters.push({
        $or: [
          { name: expression },
          { code: expression },
          { "address.city": expression },
          { "address.state": expression },
        ]
      });
    }
    
    // Apply $and filters if any exist
    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    const db = await getDatabase();
    const collection = db.collection<PropertyDocument>(COLLECTION_NAME);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      collection
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: items.map(mapProperty),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("FM Properties API - GET error", error as Error);
    return FMErrors.internalError();
  }
}

const generatePropertyCode = () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const random = String(Math.floor(Math.random() * 9000) + 1000);
  return `PROP-${stamp}-${random}`;
};

const sanitizePayload = (payload: PropertyPayload) => {
  const sanitized: PropertyPayload = {};
  if (payload.name) {
    sanitized.name = payload.name.trim();
  }
  if (payload.code) {
    sanitized.code = payload.code.trim().toUpperCase();
  }
  if (payload.type) {
    sanitized.type = payload.type.trim();
  }
  if (payload.status) {
    sanitized.status = payload.status.trim();
  }
  if (payload.leaseStatus) {
    sanitized.leaseStatus = payload.leaseStatus.trim();
  }
  if (payload.address && typeof payload.address === "object") {
    sanitized.address = payload.address;
  }
  if (payload.metadata && typeof payload.metadata === "object") {
    sanitized.metadata = payload.metadata;
  }
  if (typeof payload.area === "number") {
    sanitized.area = payload.area;
  }
  if (typeof payload.floors === "number") {
    sanitized.floors = payload.floors;
  }
  return sanitized;
};

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.PROPERTIES,
      submodule: SubmoduleKey.PROP_LIST,
      action: FMAction.CREATE,
    });
    if (actor instanceof NextResponse) return actor;
    // AUDIT-2025-11-26: Pass Super Admin context for proper audit logging
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

    const { data: rawBody, error: parseError } = await parseBodySafe(req, { logPrefix: "[fm:properties:create]" });
    if (parseError) {
      return FMErrors.validationError("Invalid request body");
    }
    const body = sanitizePayload(rawBody ?? {});
    if (!body.name) {
      return FMErrors.validationError("Property name is required");
    }
    if (!body.type) {
      return FMErrors.validationError("Property type is required");
    }

    const db = await getDatabase();
    const collection = db.collection<PropertyDocument>(COLLECTION_NAME);

    const now = new Date();
    const propertyCode = body.code || generatePropertyCode();

    // Query uses native MongoDB driver (already returns lean POJO)
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Native driver returns lean POJO
    const existingCode = await collection.findOne({
      orgId: tenantId, // AUDIT-2025-11-26: Changed from org_id
      code: propertyCode,
    });
    if (existingCode) {
      return FMErrors.conflict("Property code already exists");
    }

    const document: PropertyDocument = {
      _id: new ObjectId(),
      orgId: tenantId, // AUDIT-2025-11-26: Changed from org_id
      name: body.name,
      code: propertyCode,
      type: body.type,
      status: body.status ?? "Active",
      lease_status: body.leaseStatus ?? "Vacant",
      address: body.address ?? null,
      metadata: body.metadata ?? {},
      area: body.area,
      floors: body.floors,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(document);

    return NextResponse.json(
      {
        success: true,
        data: mapProperty(document),
        message: "Property created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Properties API - POST error", error as Error);
    return FMErrors.internalError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.PROPERTIES,
      submodule: SubmoduleKey.PROP_LIST,
      action: FMAction.UPDATE,
    });
    if (actor instanceof NextResponse) return actor;
    // AUDIT-2025-11-26: Pass Super Admin context for proper audit logging
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

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("id");
    if (!propertyId) {
      return FMErrors.validationError("Property id is required");
    }
    if (!ObjectId.isValid(propertyId)) {
      return FMErrors.invalidId("property");
    }

    const { data: rawPayload, error: parseError } = await parseBodySafe(req, { logPrefix: "[fm:properties:update]" });
    if (parseError) {
      return FMErrors.validationError("Invalid request body");
    }
    const payload = sanitizePayload(rawPayload ?? {});
    if (!Object.keys(payload).length) {
      return FMErrors.validationError("At least one field is required");
    }

    const db = await getDatabase();
    const collection = db.collection<PropertyDocument>(COLLECTION_NAME);

    if (payload.code) {
      // Query uses native MongoDB driver (already returns lean POJO)
      // eslint-disable-next-line local/require-lean -- NO_LEAN: Native driver returns lean POJO
      const duplicate = await collection.findOne({
        orgId: tenantId, // AUDIT-2025-11-26: Changed from org_id
        code: payload.code,
        _id: { $ne: new ObjectId(propertyId) },
      });
      if (duplicate) {
        return FMErrors.conflict("Property code already exists");
      }
    }

    const now = new Date();
    const update: Partial<PropertyDocument> = {
      updatedAt: now,
    };

    if (payload.name) update.name = payload.name;
    if (payload.code) update.code = payload.code;
    if (payload.type) update.type = payload.type;
    if (payload.status) update.status = payload.status;
    if (payload.leaseStatus) update.lease_status = payload.leaseStatus;
    if (payload.address) update.address = payload.address;
    if (payload.metadata) update.metadata = payload.metadata;
    if (typeof payload.area === "number") update.area = payload.area;
    if (typeof payload.floors === "number") update.floors = payload.floors;

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(propertyId), orgId: tenantId }, // AUDIT-2025-11-26: Changed from org_id
      { $set: update },
      { returnDocument: "after" },
    );

    const updated = unwrapFindOneResult(result);
    if (!updated) {
      return FMErrors.notFound("Property");
    }

    return NextResponse.json({
      success: true,
      data: mapProperty(updated),
      message: "Property updated successfully",
    });
  } catch (error) {
    logger.error("FM Properties API - PATCH error", error as Error);
    return FMErrors.internalError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.PROPERTIES,
      submodule: SubmoduleKey.PROP_LIST,
      action: FMAction.DELETE,
    });
    if (actor instanceof NextResponse) return actor;
    // AUDIT-2025-11-26: Pass Super Admin context for proper audit logging
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

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("id");
    if (!propertyId) {
      return FMErrors.validationError("Property id is required");
    }
    if (!ObjectId.isValid(propertyId)) {
      return FMErrors.invalidId("property");
    }

    const db = await getDatabase();
    const collection = db.collection<PropertyDocument>(COLLECTION_NAME);
    const result = await collection.findOneAndDelete({
      _id: new ObjectId(propertyId),
      orgId: tenantId, // AUDIT-2025-11-26: Changed from org_id
    });

    const deleted = unwrapFindOneResult(result);
    if (!deleted) {
      return FMErrors.notFound("Property");
    }

    return NextResponse.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    logger.error("FM Properties API - DELETE error", error as Error);
    return FMErrors.internalError();
  }
}
