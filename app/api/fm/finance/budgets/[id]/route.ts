import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { FMErrors } from "@/app/api/fm/errors";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId, buildTenantFilter, isCrossTenantMode } from "@/app/api/fm/utils/tenant";

type BudgetDocument = {
  _id: ObjectId;
  orgId: string;
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

const sanitizePayload = (payload: BudgetPayload) => {
  const sanitized: BudgetPayload = {};
  if (payload.name) sanitized.name = payload.name.trim();
  if (payload.department) sanitized.department = payload.department.trim();
  if (
    typeof payload.allocated === "number" &&
    Number.isFinite(payload.allocated)
  ) {
    sanitized.allocated = payload.allocated;
  }
  if (payload.currency)
    sanitized.currency = payload.currency.trim().toUpperCase();
  return sanitized;
};

const mapBudget = (doc: BudgetDocument) => ({
  id: doc._id.toString(),
  name: doc.name,
  department: doc.department,
  allocated: doc.allocated,
  currency: doc.currency,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    const db = await getDatabase();
    const collection = db.collection<BudgetDocument>(COLLECTION);
    
    const query: Record<string, unknown> = { 
      _id: new ObjectId(id),
      ...buildTenantFilter(tenantId)
    };
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Reject cross-tenant mode for PATCH (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Super Admin must specify tenant context for budget updates" },
        { status: 400 }
      );
    }

    const payload = sanitizePayload(await req.json());
    
    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<BudgetDocument>(COLLECTION);
    
    const query = { 
      _id: new ObjectId(id),
      orgId: tenantId 
    };
    
    const updated = await collection.findOneAndUpdate(
      query,
      { 
        $set: { 
          ...payload, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: "after" }
    );

    // MongoDB Driver v5+: findOneAndUpdate returns document directly

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Reject cross-tenant mode for DELETE (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Super Admin must specify tenant context for budget deletion" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<BudgetDocument>(COLLECTION);
    
    const query = { 
      _id: new ObjectId(id),
      orgId: tenantId 
    };
    
    const deleted = await collection.findOneAndDelete(query);
    // MongoDB Driver v5+: findOneAndDelete returns document directly

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
