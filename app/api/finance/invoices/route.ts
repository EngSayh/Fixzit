import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/server/finance/invoice.service";
import { rateLimit } from '@/server/security/rateLimit';
import { getUserFromToken } from '@/lib/auth';
import {createSecureResponse } from '@/server/security/headers';
import {zodValidationError, rateLimitError} from '@/server/utils/errorResponses';
import { z } from 'zod';

const invoiceCreateSchema = z.object({
  customerId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().min(1).default('SAR'),
  description: z.string().min(1),
  dueDate: z.string().or(z.date()),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive()
  })).optional()
});

/**
 * @openapi
 * /api/finance/invoices:
 *   get:
 *     summary: finance/invoices operations
 *     tags: [finance]
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
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // Authentication & Authorization
    const token = req.headers.get('authorization')?.replace('Bearer ', '')?.trim();
    if (!token) {
      return createSecureResponse({ error: 'Authentication required' }, 401, req);
    }

    const user = await getUserFromToken(token);

    if (!user) {

      return createSecureResponse({ error: 'Invalid token' }, 401, req);

    }

    if (!user?.orgId) {

      return NextResponse.json(

        { error: 'Unauthorized', message: 'Missing tenant context' },

        { status: 401 }

      );

    }

    // Role-based access control - only finance roles can view invoices
    if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'BILLING_ADMIN', 'MANAGER'].includes(user.role)) {
      return createSecureResponse({ error: 'Insufficient permissions to view invoices' }, 403, req);
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;
    const data = await svc.list(user.orgId, q, status);
    return createSecureResponse({ data }, 200, req);
  } catch (error) {
    console.error('Invoice list failed:', error);
    return createSecureResponse({ error: 'Failed to fetch invoices' }, 500, req);
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // Authentication & Authorization
    const token = req.headers.get('authorization')?.replace('Bearer ', '')?.trim();
    if (!token) {
      return createSecureResponse({ error: 'Authentication required' }, 401, req);
    }

    const user = await getUserFromToken(token);

    if (!user) {

      return createSecureResponse({ error: 'Invalid token' }, 401, req);

    }

    if (!user?.orgId) {

      return NextResponse.json(

        { error: 'Unauthorized', message: 'Missing tenant context' },

        { status: 401 }

      );

    }

    // Role-based access control - only finance roles can create invoices
    if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'BILLING_ADMIN'].includes(user.role)) {
      return createSecureResponse({ error: 'Insufficient permissions to create invoices' }, 403, req);
    }

    const key = `inv:${user.orgId}:${user.id}`;
    const rl = rateLimit(key, 20, 60_000);
    if (!rl.allowed) return createSecureResponse({ error:"Rate limit exceeded" }, 429, req);

    const body = invoiceCreateSchema.parse(await req.json());
    
    const data = await svc.create({ ...body, orgId: user.orgId }, user.id, req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown");
    return createSecureResponse({ data }, 201, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    console.error('Invoice creation failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
    return createSecureResponse({ error: message }, 400, req);
  }
}


