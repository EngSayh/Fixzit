import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import DiscountRule from '@/server/models/DiscountRule';
import { requireSuperAdmin } from '@/lib/authz';

/**
 * @openapi
 * /api/admin/billing/annual-discount:
 *   patch:
 *     summary: Update annual prepayment discount
 *     description: Updates the discount percentage for annual prepayment. Super admin only.
 *     tags:
 *       - Admin
 *       - Billing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               percentage:
 *                 type: number
 *                 example: 15
 *     responses:
 *       200:
 *         description: Discount updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super admin only
 */
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    await requireSuperAdmin(req);
    const { percentage } = await req.json();

    const doc = await DiscountRule.findOneAndUpdate(
      { key: 'ANNUAL_PREPAY' },
      { percentage },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, discount: doc.percentage });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update annual discount',
        code: 'DISCOUNT_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        correlationId: crypto.randomUUID()
      },
      { status: 500 }
    );
  }
}


