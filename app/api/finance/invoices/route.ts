import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/server/finance/invoice.service";
import { rateLimit } from "@/server/security/rateLimit";
import { getUserFromToken } from '@/src/lib/auth';
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

export async function GET(req: NextRequest) {
  try {
    // Authentication & Authorization
    const token = req.headers.get('authorization')?.replace('Bearer ', '')?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based access control - only finance roles can view invoices
    if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'BILLING_ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to view invoices' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;
    const data = await svc.list(user.tenantId, q, status);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Invoice list failed:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authentication & Authorization
    const token = req.headers.get('authorization')?.replace('Bearer ', '')?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based access control - only finance roles can create invoices
    if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'BILLING_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to create invoices' }, { status: 403 });
    }

    const key = `inv:${user.tenantId}:${user.id}`;
    const rl = rateLimit(key, 20, 60_000);
    if (!rl.allowed) return NextResponse.json({ error:"Rate limit exceeded" }, { status:429 });

    const body = invoiceCreateSchema.parse(await req.json());
    
    const data = await svc.create({ ...body, tenantId: user.tenantId }, user.id, req.ip ?? "");
    return NextResponse.json({ data }, { status:201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Invoice creation failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 400 });
  }
}

