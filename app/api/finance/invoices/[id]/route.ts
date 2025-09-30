import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/server/finance/invoice.service";
import { getUserFromToken } from '@/src/lib/auth';
import { z } from 'zod';

const invoiceUpdateSchema = z.object({
  status: z.string().optional(),
  amount: z.number().optional(),
  dueDate: z.string().or(z.date()).optional(),
  description: z.string().optional()
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id:string }>}) {
  const params = await props.params;
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

    // Role-based access control - only finance roles can modify invoices
    if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'BILLING_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to modify invoices' }, { status: 403 });
    }

    const body = invoiceUpdateSchema.parse(await req.json());
    
    const inv = await svc.post(user.orgId, params.id, body, user.id, req.ip ?? "");
    return NextResponse.json({ data: inv });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Invoice update failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to update invoice' }, { status: 400 });
  }
}

