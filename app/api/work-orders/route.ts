import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";

import { z } from "zod";
import { getSessionUser, requireAbility } from "@/server/middleware/withAuthRbac";
import { resolveSlaTarget, WorkOrderPriority } from "@/lib/sla";
import { WOPriority } from "@/server/work-orders/wo.schema";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priority: WOPriority.default("MEDIUM"),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  requester: z.object({
    type: z.enum(["TENANT","OWNER","STAFF"]).default("TENANT"),
    id: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional()
  }).optional()
});

/**
 * Fetches a paginated list of work orders for the authenticated user's tenant.
 *
 * The handler reads query parameters `q` (text search), `status`, `priority`, `page` (default 1),
 * and `limit` (default 20, capped at 100). Results are always scoped to the session user's
 * tenantId and exclude soft-deleted records (deletedAt exists). Database access is initialized
 * before querying.
 *
 * Uses MongoDB for all data operations with server-side sort/skip/limit.
 *
 * @returns A NextResponse JSON object with shape `{ items, page, limit, total }`.
 */
/**
 * @openapi
 * /api/work-orders:
 *   get:
 *     summary: work-orders operations
 *     tags: [work-orders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  try {
    if (process.env.WO_ENABLED !== 'true') {
      return createSecureResponse({ error: "Work Orders endpoint not available in this deployment" }, 501, req);
    }
    const { db } = await import('@/lib/mongo');
    await db;
    const WOMod = await import('@/server/models/WorkOrder').catch(() => null);
    const WorkOrder = WOMod && WOMod.WorkOrder;
    if (!WorkOrder) {
      return createSecureResponse({ error: "Work Order dependencies are not available in this deployment" }, 501, req);
    }
  await connectToDatabase();
  const user = await getSessionUser(req);
  
  // Check authentication first
  if (!user) {
    return createSecureResponse({ error: 'Authentication required' }, 401, req);
  }
  
  if (!user.orgId) {
    return createSecureResponse(
      { error: 'Unauthorized', message: 'Missing tenant context' },
      401,
      req
    );
  }
  
  // Rate limiting AFTER authentication
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${user.id}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  const match: Record<string, unknown> = { tenantId: user.orgId, deletedAt: { $exists: false } };
  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (q) match.$text = { $search: q };

  // MongoDB-only implementation
  let items: unknown[];
  let total: number;

  // Real MongoDB operations
  items = await WorkOrder.find(match)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  total = await WorkOrder.countDocuments(match);

  return NextResponse.json({ items, page, limit, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Work Orders GET error:', message);
    return createSecureResponse({ 
      error: 'Failed to fetch work orders' 
    }, 500, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.WO_ENABLED !== 'true') {
      return createSecureResponse({ error: "Work Orders endpoint not available in this deployment" }, 501, req);
    }
    const { db } = await import('@/lib/mongo');
    await db;
    const WOMod = await import('@/server/models/WorkOrder').catch(() => null);
    const WorkOrder = WOMod && WOMod.WorkOrder;
    if (!WorkOrder) {
      return createSecureResponse({ error: "Work Order dependencies are not available in this deployment" }, 501, req);
    }
  const user = await requireAbility("CREATE")(req);
  if (user instanceof NextResponse) return user;
  
  // Rate limiting AFTER authentication
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${user.id}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }
  await connectToDatabase();

  const body = await req.json();
  const data = createSchema.parse(body);

  const createdAt = new Date();
  // Generate cryptographically secure work order code
  const uuid = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  const code = `WO-${new Date().getFullYear()}-${uuid}`;
  const { slaMinutes, dueAt } = resolveSlaTarget(data.priority as WorkOrderPriority, createdAt);

  const wo = await WorkOrder.create({
    tenantId: user.orgId,
    code,
    title: data.title,
    description: data.description,
    priority: data.priority,
    category: data.category,
    subcategory: data.subcategory,
    propertyId: data.propertyId,
    unitId: data.unitId,
    requester: data.requester,
    status: "SUBMITTED",
    statusHistory: [{ from: "DRAFT", to: "SUBMITTED", byUserId: user.id, at: new Date() }],
    slaMinutes,
    dueAt,
    createdBy: user.id,
    createdAt
  });
  return createSecureResponse(wo, 201, req);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Work Orders POST error:', message);
    return createSecureResponse({ 
      error: 'Failed to create work order' 
    }, 500, req);
  }
}



