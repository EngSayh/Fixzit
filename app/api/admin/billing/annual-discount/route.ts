import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import DiscountRule from '@/server/models/DiscountRule';
import { requireSuperAdmin } from '@/lib/authz';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

export async function PATCH(req: NextRequest) {
  await dbConnect();
  await requireSuperAdmin(req);
  const { percentage } = await req.json();

  const doc = await DiscountRule.findOneAndUpdate(
    { key: 'ANNUAL_PREPAY' },
    { percentage },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true, discount: doc.percentage });
}


