// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { MarketplaceProduct } from '@/src/server/models/MarketplaceProduct';
import { SearchSynonym } from '@/src/server/models/SearchSynonym';
import { getTenantFromRequest } from '@/src/server/utils/tenant';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const locale = (searchParams.get('locale') || 'en').toLowerCase();
    const tenantId = getTenantFromRequest(req) || 'demo-tenant';

    // If no query provided, return latest products for the tenant (no placeholders)
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

    const docs = await (MarketplaceProduct as any)
      .find({ tenantId, $or: [
        { $text: { $search: terms.join(' ') } },
        { title: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
      ]})
      .sort({ updatedAt: -1 })
      .limit(24)
      .lean();

    return NextResponse.json({ items: docs });
  } catch (error) {
    console.error('search error', error);
    return NextResponse.json({ items: [] });
  }
}

