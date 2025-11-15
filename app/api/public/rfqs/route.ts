import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { RFQ } from '@/server/models/RFQ';
import { z } from 'zod';

import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

const DEFAULT_PUBLIC_STATUSES = ['PUBLISHED', 'BIDDING'];

const QuerySchema = z.object({
  tenantId: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(12).refine(val => val <= 50, { message: 'Limit must be 50 or less' })
});

const toIsoString = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * @openapi
 * /api/public/rfqs:
 *   get:
 *     summary: public/rfqs operations
 *     tags: [public]
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
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    const defaultTenant = process.env.NEXT_PUBLIC_MARKETPLACE_TENANT || 'demo-tenant';
    const tenantId = query.tenantId || defaultTenant;

    const page = Math.max(1, query.page);
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      tenantId,
      status: query.status ? query.status : { $in: DEFAULT_PUBLIC_STATUSES }
    };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.city) {
      filter['location.city'] = query.city;
    }

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const { RFQ } = await import('@/server/models/RFQ');
    const [items, total] = await Promise.all([
      RFQ.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RFQ.countDocuments(filter)
    ]);

    interface RFQItem {
      _id?: { toString?: () => string } | string;
      tenantId?: string;
      code?: string;
      title?: string;
      description?: string;
      category?: string;
      subcategory?: string;
      status?: string;
      location?: { city?: string; region?: string; radius?: number };
      budget?: { estimated?: number; currency?: string; range?: string };
      timeline?: { publishDate?: unknown; bidDeadline?: unknown; startDate?: unknown; completionDate?: unknown };
      bidding?: { targetBids?: number; maxBids?: number; anonymous?: boolean; bidLeveling?: boolean };
      requirements?: unknown;
      bids?: unknown[];
      contact?: { name?: string; email?: string; phone?: string };
      attachments?: unknown[];
      createdAt?: unknown;
      updatedAt?: unknown;
    }

    const normalized = (items as unknown as RFQItem[]).map((item) => ({
      id: item._id?.toString?.() ?? String(item._id),
      tenantId: item.tenantId,
      code: item.code,
      title: item.title,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory ?? null,
      status: item.status,
      location: item.location
        ? {
            city: item.location.city ?? null,
            region: item.location.region ?? null,
            radius: item.location.radius ?? null
          }
        : null,
      budget: item.budget
        ? {
            estimated: item.budget.estimated ?? null,
            currency: item.budget.currency ?? 'SAR',
            range: item.budget.range ?? null
          }
        : null,
      timeline: item.timeline
        ? {
            publishDate: toIsoString(item.timeline.publishDate),
            bidDeadline: toIsoString(item.timeline.bidDeadline),
            startDate: toIsoString(item.timeline.startDate),
            completionDate: toIsoString(item.timeline.completionDate)
          }
        : null,
      bidding: item.bidding
        ? {
            targetBids: item.bidding.targetBids ?? 0,
            maxBids: item.bidding.maxBids ?? null,
            anonymous: item.bidding.anonymous ?? true,
            bidLeveling: item.bidding.bidLeveling ?? false
          }
        : null,
      requirements: item.requirements ?? null,
      bidsCount: Array.isArray(item.bids) ? item.bids.length : 0,
      createdAt: toIsoString(item.createdAt),
      updatedAt: toIsoString(item.updatedAt)
    }));

    return NextResponse.json({
      ok: true,
      data: {
        items: normalized,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          tenantId
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Public RFQ fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: 'Internal server error' }, 500, req);
  }
}


