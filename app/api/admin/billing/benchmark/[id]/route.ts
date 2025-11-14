import { NextRequest} from 'next/server';
import { dbConnect } from '@/db/mongoose';
import Benchmark from '@/server/models/Benchmark';
import { requireSuperAdmin } from '@/lib/authz';

import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/admin/billing/benchmark/{id}:
 *   patch:
 *     summary: Update billing benchmark
 *     description: Updates a billing benchmark by ID. Super admin only.
 *     tags:
 *       - Admin
 *       - Billing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Benchmark updated successfully
 *       404:
 *         description: Benchmark not found
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await dbConnect();
  await requireSuperAdmin(req);
  const body = await req.json();

  const doc = await Benchmark.findByIdAndUpdate<typeof Benchmark>(params.id, body, { new: true });
  if (!doc) {
    return createSecureResponse({ error: 'NOT_FOUND' }, 404, req);
  }

  return createSecureResponse(doc, 200, req);
}
