import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";

import { z } from "zod";
import { getSessionUser, requireAbility } from "@/server/middleware/withAuthRbac";
import { resolveSlaTarget, WorkOrderPriority } from "@/lib/sla";
import { WOPriority } from "@/server/work-orders/wo.schema";

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
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
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    if (process.env.WO_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'Work Orders endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/lib/mongo');
    await (db as any)();
    const WOMod = await import('@/server/models/WorkOrder').catch(() => null);
    const WorkOrder = WOMod && (WOMod as any).WorkOrder;
    if (!WorkOrder) {
      return NextResponse.json({ success: false, error: 'Work Order dependencies are not available in this deployment' }, { status: 501 });
    }
  await connectToDatabase();
  const user = await getSessionUser(req);
  if (!user?.orgId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing tenant context' },
      { status: 401 }
    );
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  const match: any = { tenantId: user.orgId, deletedAt: { $exists: false } };
  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (q) match.$text = { $search: q };

  // MongoDB-only implementation
  let items: any[];
  let total: number;

  // Real MongoDB operations
  items = await (WorkOrder as any).find(match)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  total = await (WorkOrder as any).countDocuments(match);

  return NextResponse.json({ items, page, limit, total });
  } catch (error: any) {
    console.error('Work Orders GET error:', error);
    return createSecureResponse({ 
      error: 'Failed to fetch work orders' 
    }, 500, req);
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    if (process.env.WO_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'Work Orders endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/lib/mongo');
    await (db as any)();
    const WOMod = await import('@/server/models/WorkOrder').catch(() => null);
    const WorkOrder = WOMod && (WOMod as any).WorkOrder;
    if (!WorkOrder) {
      return NextResponse.json({ success: false, error: 'Work Order dependencies are not available in this deployment' }, { status: 501 });
    }
  const user = await requireAbility("CREATE")(req);
  if (user instanceof NextResponse) return user as any;
  await connectToDatabase();

  const body = await req.json();
  const data = createSchema.parse(body);

  const createdAt = new Date();
  // Generate cryptographically secure work order code
  const uuid = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  const code = `WO-${new Date().getFullYear()}-${uuid}`;
  const { slaMinutes, dueAt } = resolveSlaTarget(data.priority as WorkOrderPriority, createdAt);

  const wo = await (WorkOrder as any).create({
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
  } catch (error: any) {
    console.error('Work Orders POST error:', error);
    return createSecureResponse({ 
      error: 'Failed to create work order' 
    }, 500, req);
  }
}



