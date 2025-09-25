// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { MarketplaceProduct } from '@/src/server/models/MarketplaceProduct';
import { SearchSynonym } from '@/src/server/models/SearchSynonym';
import { getAuthFromRequest, requireMarketplaceReadRole } from '@/src/server/utils/tenant';

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const locale = (searchParams.get('locale') || 'en').toLowerCase();
    const { tenantId, role } = getAuthFromRequest(req);

    if (!tenantId || !requireMarketplaceReadRole(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If no query provided, return latest products for the tenant
    if (!q) {
      const latest = await (MarketplaceProduct as any)
        .find({ tenantId })
        .sort({ updatedAt: -1 })
        .limit(24)
        .lean();
      return NextResponse.json({ items: latest });
    }

    // Expand with synonyms (best effort)
    let terms = [q];
    try {
      const syn = await (SearchSynonym as any).findOne({ locale, term: q.toLowerCase() });
      if (syn && syn.synonyms?.length) terms = Array.from(new Set([q, ...syn.synonyms]));
    } catch {}

    // Build safe filter: $text at top-level; regex fallbacks in $or
    const filter: any = { tenantId };
    if (terms.length) filter.$text = { $search: terms.join(' ') };
    const safe = escapeRegex(q);
    filter.$or = [{ title: { $regex: safe, $options: 'i' } }, { brand: { $regex: safe, $options: 'i' } }];

    const query = (MarketplaceProduct as any).find(filter);
    if (filter.$text) {
      query.sort({ score: { $meta: 'textScore' }, updatedAt: -1 }).select({ score: { $meta: 'textScore' } });
    } else {
      query.sort({ updatedAt: -1 });
    }
    const docs = await query
      .sort({ updatedAt: -1 })
      .limit(24)
      .lean();

    return NextResponse.json({ items: docs });
  } catch (error) {
    console.error('search error', error);
    return NextResponse.json({ items: [] });
  }
}

