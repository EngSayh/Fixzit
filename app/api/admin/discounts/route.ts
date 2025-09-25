import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { dbConnect } from '@/src/db/mongoose';
import DiscountRule from '@/src/models/DiscountRule';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DISCOUNT_CODE = 'ANNUAL' as const;

const UpdateDiscountSchema = z.object({
  value: z.number().nonnegative(),
  type: z.enum(['percent', 'amount']).default('percent'),
  active: z.boolean().default(true)
});

const ADMIN_ROLES = new Set(['ADMIN', 'STAFF', 'SUPER_ADMIN', 'CORPORATE_ADMIN']);

function formatDiscountResponse(discount: any) {
  return {
    ok: true,
    data:
      discount ?? {
        code: DISCOUNT_CODE,
        type: 'percent',
        value: 0,
        active: false
      }
  };
}

function isAuthorizedAdmin(role?: string | null) {
  if (!role) {
    return false;
  }

  const normalized = role.trim().toUpperCase();
  return ADMIN_ROLES.has(normalized);
}

async function resolveAuthorizedContext(request: NextRequest) {
  const context = await resolveMarketplaceContext(request);
  if (!context.userId || !isAuthorizedAdmin(context.role)) {
    return null;
  }

  return context;
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveAuthorizedContext(request);
    if (!context) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const discount = await DiscountRule.findOne({
      code: DISCOUNT_CODE,
      orgId: context.orgId
    }).lean();

    return NextResponse.json(formatDiscountResponse(discount), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('Failed to fetch admin discount rule', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to load discount configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const context = await resolveAuthorizedContext(req);
    if (!context) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const payload = UpdateDiscountSchema.parse(body);

    const discount = await DiscountRule.findOneAndUpdate(
      { code: DISCOUNT_CODE, orgId: context.orgId },
      {
        code: DISCOUNT_CODE,
        orgId: context.orgId,
        tenantKey: context.tenantKey,
        type: payload.type,
        value: payload.value,
        active: payload.active
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json(formatDiscountResponse(discount));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: error.issues.map(issue => issue.message).join(', ') },
        { status: 400 }
      );
    }

    console.error('Failed to update admin discount rule', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update discount configuration' },
      { status: 500 }
    );
  }
}
