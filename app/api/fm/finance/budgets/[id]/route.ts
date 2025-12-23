/**
 * @fileoverview FM Finance Budget Detail API
 * @description Manages individual budget records for facility management finance.
 * Supports GET/PUT/DELETE operations on specific budget allocations by department.
 * @module api/fm/finance/budgets/[id]
 *
 * @security Requires FM FINANCE module READ/UPDATE/DELETE permission
 * @security Multi-tenant isolated via orgId
 *
 * @example
 * // GET /api/fm/finance/budgets/123
 * // PUT /api/fm/finance/budgets/123 { name, department, allocated, currency }
 * // DELETE /api/fm/finance/budgets/123
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { unwrapFindOneResult } from "@/lib/mongoUtils.server";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { FMErrors } from "@/app/api/fm/errors";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId, buildTenantFilter, isCrossTenantMode } from "@/app/api/fm/utils/tenant";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { APIParseError, parseBody } from "@/lib/api/parse-body";

type BudgetDocument = {
  _id: ObjectId;
  orgId: string;
  unitId?: string;
  name: string;
  department: string;
  allocated: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

type BudgetPayload = {
  name?: string;
  department?: string;
  allocated?: number;
  currency?: string;
};

const COLLECTION = "fm_budgets";

const parsePayload = (payload: BudgetPayload) => {
  const provided = {
    name: Object.prototype.hasOwnProperty.call(payload, "name"),
    department: Object.prototype.hasOwnProperty.call(payload, "department"),
    allocated: Object.prototype.hasOwnProperty.call(payload, "allocated"),
    currency: Object.prototype.hasOwnProperty.call(payload, "currency"),
  };

  const normalized: BudgetPayload = {};

  if (typeof payload.name === "string") {
    normalized.name = payload.name.trim();
  }
  if (typeof payload.department === "string") {
    normalized.department = payload.department.trim();
  }
  if (
    typeof payload.allocated === "number" &&
    Number.isFinite(payload.allocated)
  ) {
    normalized.allocated = payload.allocated;
  }
  if (typeof payload.currency === "string") {
    normalized.currency = payload.currency.trim().toUpperCase();
  }

  return { normalized, provided };
};

const validatePatchPayload = (
  normalized: BudgetPayload,
  provided: Record<keyof BudgetPayload, boolean>,
): string | null => {
  if (provided.name && !normalized.name) {
    return "Name cannot be empty";
  }
  if (provided.department && !normalized.department) {
    return "Department cannot be empty";
  }
  if (provided.allocated) {
    if (normalized.allocated === undefined || !Number.isFinite(normalized.allocated)) {
      return "Allocated amount must be a positive number";
    }
    if (normalized.allocated <= 0) {
      return "Allocated amount must be greater than 0";
    }
  }
  if (provided.currency && !normalized.currency) {
    return "Currency cannot be empty";
  }
  return null;
};

const mapBudget = (doc: BudgetDocument) => ({
  id: doc._id.toString(),
  name: doc.name,
  department: doc.department,
  allocated: doc.allocated,
  currency: doc.currency,
  unitId: doc.unitId,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const normalizeUnits = (units?: string[] | null): string[] =>
  (units ?? [])
    .map((unit) => unit?.toString?.().trim())
    .filter(Boolean) as string[];

const resolveUnitScope = (params: {
  requestedUnitId?: string | null;
  actorUnits: string[];
  isSuperAdmin?: boolean;
}): { unitIds?: string[]; error?: NextResponse } => {
  const { requestedUnitId, actorUnits, isSuperAdmin } = params;
  const requested = requestedUnitId?.toString().trim();

  if (isSuperAdmin) {
    if (requested) return { unitIds: [requested] };
    return {};
  }

  const hasActorUnits = actorUnits.length > 0;
  const allowedSet = hasActorUnits ? new Set(actorUnits) : null;

  if (requested) {
    if (allowedSet && !allowedSet.has(requested)) {
      return {
        error: NextResponse.json(
          {
            success: false,
            error: "Unit access denied",
          },
          { status: 403 },
        ),
      };
    }
    return { unitIds: [requested] };
  }

  if (hasActorUnits) {
    if (actorUnits.length === 1) {
      return { unitIds: actorUnits };
    }
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Unit context required for budgets",
        },
        { status: 400 },
      ),
    };
  }

  return {
    error: NextResponse.json(
      {
        success: false,
        error: "Unit context required for budgets",
      },
      { status: 400 },
    ),
  };
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "fm-finance-budgets:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid budget ID" },
        { status: 400 }
      );
    }

    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
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

    const actorUnits = normalizeUnits((actor as { units?: string[] }).units);
    const unitScope = resolveUnitScope({
      actorUnits,
      isSuperAdmin: actor.isSuperAdmin,
    });
    if (unitScope.error) return unitScope.error;

    // Reject cross-tenant mode for GET by id (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Super Admin must specify tenant context for budget retrieval",
        },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const collection = db.collection<BudgetDocument>(COLLECTION);
    
    const query: Record<string, unknown> = {
      _id: new ObjectId(id),
      ...buildTenantFilter(tenantId, "orgId", { unitIds: unitScope.unitIds }),
    };
    
    // Query uses native MongoDB driver (already returns lean POJO)
    const budget = await collection.findOne(query);
    
    if (!budget) {
      return NextResponse.json(
        { success: false, error: "Budget not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mapBudget(budget),
    });
  } catch (error) {
    logger.error("FM Budgets API - GET [id] error", error as Error);
    return FMErrors.internalError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid budget ID" },
        { status: 400 }
      );
    }

    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
      action: FMAction.UPDATE,
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

    const actorUnits = normalizeUnits((actor as { units?: string[] }).units);
    const unitScope = resolveUnitScope({
      actorUnits,
      isSuperAdmin: actor.isSuperAdmin,
    });
    if (unitScope.error) return unitScope.error;

    // Reject cross-tenant mode for PATCH (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Super Admin must specify tenant context for budget updates" },
        { status: 400 }
      );
    }

    const rawBody = await parseBody<Record<string, unknown>>(req).catch((error) => {
      if (error instanceof APIParseError) return null;
      throw error;
    });
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const { normalized: payload, provided } = parsePayload(
      rawBody as BudgetPayload,
    );
    const anyProvided = Object.values(provided).some(Boolean);
    if (!anyProvided) {
      return NextResponse.json(
        { success: false, error: "No fields provided to update" },
        { status: 400 }
      );
    }

    const validationError = validatePatchPayload(payload, provided);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const collection = db.collection<BudgetDocument>(COLLECTION);
    
    const tenantFilter = buildTenantFilter(tenantId, "orgId", {
      unitIds: unitScope.unitIds,
    });
    const query = { 
      _id: new ObjectId(id),
      ...tenantFilter 
    };
    
    const updateResult = await collection.findOneAndUpdate(
      query,
      { 
        $set: { 
          ...payload, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: "after" }
    );

    const updated = unwrapFindOneResult(updateResult);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Budget not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mapBudget(updated),
    });
  } catch (error) {
    logger.error("FM Budgets API - PATCH error", error as Error);
    return FMErrors.internalError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid budget ID" },
        { status: 400 }
      );
    }

    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
      action: FMAction.DELETE,
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

    const actorUnits = normalizeUnits((actor as { units?: string[] }).units);
    const unitScope = resolveUnitScope({
      actorUnits,
      isSuperAdmin: actor.isSuperAdmin,
    });
    if (unitScope.error) return unitScope.error;

    // Reject cross-tenant mode for DELETE (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Super Admin must specify tenant context for budget deletion" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<BudgetDocument>(COLLECTION);
    
    const tenantFilter = buildTenantFilter(tenantId, "orgId", {
      unitIds: unitScope.unitIds,
    });
    const query = { 
      _id: new ObjectId(id),
      ...tenantFilter 
    };
    
    const deleted = unwrapFindOneResult(
      await collection.findOneAndDelete(query),
    );
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Budget not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    logger.error("FM Budgets API - DELETE error", error as Error);
    return FMErrors.internalError();
  }
}
