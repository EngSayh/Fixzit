/**
 * @fileoverview FM Marketplace Orders API
 * @description Manages procurement orders for facility management. Handles order creation,
 * approval workflows, and order tracking with multi-tenant isolation.
 * @module api/fm/marketplace/orders
 *
 * @security Requires FM module MARKETPLACE permission
 * @security Multi-tenant isolated via orgId
 *
 * @example
 * // GET /api/fm/marketplace/orders?status=pending_approval
 * // POST /api/fm/marketplace/orders { requester, department, justification, items[] }
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

type OrderItem = {
  description: string;
  quantity: number;
  unitCost: number;
  deliveryNeed?: string;
};

type OrderDocument = {
  _id: ObjectId;
  orgId: string; // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
  requester: string;
  department: string;
  justification: string;
  items: OrderItem[];
  total: number;
  status: "pending_approval" | "submitted";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type OrderPayload = {
  requester?: string;
  department?: string;
  justification?: string;
  items?: OrderItem[];
};

const COLLECTION = "fm_marketplace_orders";

const sanitizePayload = (payload: OrderPayload): OrderPayload => {
  const sanitized: OrderPayload = {};
  if (payload.requester) sanitized.requester = payload.requester.trim();
  if (payload.department) sanitized.department = payload.department.trim();
  if (payload.justification)
    sanitized.justification = payload.justification.trim();
  if (Array.isArray(payload.items)) {
    sanitized.items = payload.items.map((item) => ({
      description: (item.description || "").trim(),
      deliveryNeed: item.deliveryNeed ? item.deliveryNeed.trim() : undefined,
      quantity: Number(item.quantity) || 0,
      unitCost: Number(item.unitCost) || 0,
    }));
  }
  return sanitized;
};

const validatePayload = (payload: OrderPayload): string | null => {
  if (!payload.requester) return "Requester is required";
  if (!payload.department) return "Department is required";
  if (!payload.justification || payload.justification.length < 10)
    return "Justification is too short";
  if (!payload.items || !payload.items.length)
    return "At least one line item is required";
  const invalidItem = payload.items.find(
    (item) => !item.description || item.quantity <= 0 || item.unitCost < 0,
  );
  if (invalidItem)
    return "Each line requires description, quantity > 0, and non-negative unit cost";
  return null;
};

const mapOrder = (doc: OrderDocument) => ({
  id: doc._id.toString(),
  requester: doc.requester,
  department: doc.department,
  justification: doc.justification,
  items: doc.items,
  total: doc.total,
  status: doc.status,
  createdAt: doc.createdAt,
});

// FUNC-003 FIX: Add GET route for listing marketplace orders
export async function GET(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.MARKETPLACE,
      action: FMAction.VIEW,
    });
    if (actor instanceof NextResponse) return actor;

    // AUDIT-2025-11-29: Pass Super Admin context for proper audit logging
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
    const q = searchParams.get("q");
    const status = searchParams.get("status");
    const department = searchParams.get("department");

    // AUDIT-2025-11-29: Use buildTenantFilter for cross-tenant support
    const query: Record<string, unknown> = { ...buildTenantFilter(tenantId) };
    
    // Use $and to combine filters
    const filters: Record<string, unknown>[] = [];
    
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      filters.push({ $or: [{ requester: regex }, { department: regex }, { justification: regex }] });
    }
    
    if (status) {
      query.status = status;
    }
    
    if (department) {
      query.department = department;
    }
    
    if (filters.length > 0) {
      query.$and = filters;
    }

    const db = await getDatabase();
    const collection = db.collection<OrderDocument>(COLLECTION);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: items.map(mapOrder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("FM Marketplace Orders API - GET error", error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.MARKETPLACE,
      action: FMAction.CREATE,
    });
    if (actor instanceof NextResponse) return actor;

    // AUDIT-2025-11-29: Pass Super Admin context for proper audit logging
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

    // AUDIT-2025-11-29: Reject cross-tenant mode for POST (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Super Admin must specify tenant context for order creation" },
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

    const total = payload.items!.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );
    const now = new Date();
    const doc: OrderDocument = {
      _id: new ObjectId(),
      orgId: tenantId, // AUDIT-2025-11-29: Changed from org_id
      requester: payload.requester!,
      department: payload.department!,
      justification: payload.justification!,
      items: payload.items!,
      total,
      status: "pending_approval",
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<OrderDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json(
      { success: true, data: mapOrder(doc) },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Marketplace Orders API - POST error", error as Error);
    return FMErrors.internalError();
  }
}
