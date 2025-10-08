import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/server/finance/invoice.service";
import { getUserFromToken } from '@/lib/auth';
import { z } from 'zod';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

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
      return createSecureResponse({ error: 'Authentication required' }, 401, req);
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return createSecureResponse({ error: 'Invalid token' }, 401, req);
    }

    // Role-based access control - only finance roles can modify invoices
    if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'BILLING_ADMIN'].includes(user.role)) {
      return createSecureResponse({ error: 'Insufficient permissions to modify invoices' }, 403, req);
    }

    const body = invoiceUpdateSchema.parse(await req.json());
    
    const inv = await svc.post(user.orgId, params.id, body, user.id, req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown");
    return createSecureResponse({ data: inv }, 200, req);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Invoice update failed:', error);
    return createSecureResponse({ error: error.message || 'Failed to update invoice' }, 400, req);
  }
}

