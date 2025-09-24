// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { MarketplaceProduct } from '@/src/server/models/MarketplaceProduct';
import { SearchSynonym } from '@/src/server/models/SearchSynonym';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const locale = (searchParams.get('locale') || 'en').toLowerCase();
    const tenantId = searchParams.get('tenantId') || 'demo-tenant';

    if (!q) return NextResponse.json({ items: [] });

    // Expand with synonyms (best effort)
    let terms = [q];
    try {
      const syn = await (SearchSynonym as any).findOne({ locale, term: q.toLowerCase() });
      if (syn && syn.synonyms?.length) terms = Array.from(new Set([q, ...syn.synonyms]));
    } catch {}

    const or = [
      { $text: { $search: terms.join(' ') } },
      { title: new RegExp(q, 'i') },
      { brand: new RegExp(q, 'i') },
    ];

    const docs = await (MarketplaceProduct as any)
      .find({ tenantId, $or: or })
      .sort({ updatedAt: -1 })
      .limit(24)
      .lean();

    return NextResponse.json({ items: docs });
  } catch (error) {
    console.error('search error', error);
    return NextResponse.json({ items: [] });
  }
}

