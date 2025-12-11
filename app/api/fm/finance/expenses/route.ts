/**
 * @fileoverview Expenses API - Facility Management Finance Module
 * @description Manages expense records for facility management operations.
 * Supports expense tracking, approval workflows, and reporting.
 *
 * @route GET /api/fm/finance/expenses - List expenses
 * @route POST /api/fm/finance/expenses - Create an expense
 * @module api/fm/finance/expenses
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - FINANCE:VIEW for GET, FINANCE:CREATE for POST
 *
 * Expense Statuses:
 * - pending: Awaiting approval
 * - approved: Approved for payment
 * - rejected: Rejected by approver
 *
 * Features:
 * - Multi-tenant isolation via orgId
 * - Filterable by status, vendor, category
 * - Currency-aware (SAR, USD, etc.)
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId, buildTenantFilter, isCrossTenantMode } from "@/app/api/fm/utils/tenant";
import { FMErrors } from "@/app/api/fm/errors";

type ExpenseStatus = "pending" | "approved" | "rejected";

type ExpenseDocument = {
  _id: ObjectId;
  orgId: string; // AUDIT-2025-11-26: Changed from org_id to orgId for consistency
  vendor: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  status: ExpenseStatus;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type ExpensePayload = {
  vendor?: string;
  category?: string;
  amount?: number;
  currency?: string;
  description?: string;
};

const COLLECTION = "fm_expenses";

const sanitizePayload = (payload: ExpensePayload): ExpensePayload => {
  const sanitized: ExpensePayload = {};
  if (payload.vendor) sanitized.vendor = payload.vendor.trim();
  if (payload.category) sanitized.category = payload.category.trim();
  if (typeof payload.amount === "number" && Number.isFinite(payload.amount)) {
    sanitized.amount = payload.amount;
  }
  if (payload.currency)
    sanitized.currency = payload.currency.trim().toUpperCase();
  if (payload.description) sanitized.description = payload.description.trim();
  return sanitized;
};

const validatePayload = (payload: ExpensePayload): string | null => {
  if (!payload.vendor) return "Vendor is required";
  if (!payload.category) return "Category is required";
  if (typeof payload.amount !== "number" || payload.amount <= 0)
    return "Amount must be greater than 0";
  if (!payload.currency) return "Currency is required";
  return null;
};

const mapExpense = (doc: ExpenseDocument) => ({
  id: doc._id.toString(),
  vendor: doc.vendor,
  category: doc.category,
  amount: doc.amount,
  currency: doc.currency,
  description: doc.description,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function GET(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
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
    const q = searchParams.get("q");
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10)),
    );

    // AUDIT-2025-11-27: Use buildTenantFilter to handle cross-tenant mode for Super Admins
    const query: Record<string, unknown> = { ...buildTenantFilter(tenantId) };
    // SEC-002 FIX: Use $and pattern for search to prevent overwriting role-based filters
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      // Use $and to combine org filter with search filter
      query.$and = [{ $or: [
        { vendor: regex },
        { category: regex },
        { description: regex },
      ] }];
    }

    const db = await getDatabase();
    const collection = db.collection<ExpenseDocument>(COLLECTION);
    const items = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ success: true, data: items.map(mapExpense) });
  } catch (error) {
    logger.error("FM Expenses API - GET error", error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
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

    // AUDIT-2025-11-27: Reject cross-tenant mode for POST (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Super Admin must specify tenant context for expense creation" },
        { status: 400 }
      );
    }

    const payload = sanitizePayload(await req.json());
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const now = new Date();
    const doc: ExpenseDocument = {
      _id: new ObjectId(),
      orgId: tenantId, // AUDIT-2025-11-26: Changed from org_id
      vendor: payload.vendor!,
      category: payload.category!,
      amount: payload.amount!,
      currency: payload.currency || "SAR",
      description: payload.description,
      status: "pending",
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<ExpenseDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json(
      { success: true, data: mapExpense(doc) },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Expenses API - POST error", error as Error);
    return FMErrors.internalError();
  }
}
