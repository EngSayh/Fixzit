import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import { connectToDatabase } from '@/src/lib/mongodb-unified';
import RFQ from '@/src/models/marketplace/RFQ';
import { serializeRFQ } from '@/src/lib/marketplace/serializers';
import { objectIdFrom } from '@/src/lib/marketplace/objectIds';

const CreateRFQSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  budget: z.number().positive().optional(),
  currency: z.string().default('SAR'),
  deadline: z.string().datetime().optional()
});

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const client = await connectToDatabase();
    const rfqs = await RFQ.find({ orgId: context.orgId }).sort({ createdAt: -1 }).limit(50);
    return NextResponse.json({ ok: true, data: rfqs.map(rfq => serializeRFQ(rfq)) });
  } catch (error) {
    console.error('Marketplace RFQ list failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to load RFQs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = CreateRFQSchema.parse(body);
    const client = await connectToDatabase();

    const rfq = await RFQ.create({
      orgId: context.orgId,
      requesterId: context.userId,
      title: payload.title,
      description: payload.description,
      categoryId: payload.categoryId ? objectIdFrom(payload.categoryId) : undefined,
      quantity: payload.quantity,
      budget: payload.budget,
      currency: payload.currency,
      deadline: payload.deadline ? new Date(payload.deadline) : undefined,
      status: 'OPEN'
    });

    return NextResponse.json({ ok: true, data: serializeRFQ(rfq) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    console.error('Marketplace RFQ create failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to create RFQ' }, { status: 500 });
  }
}

