// @ts-nocheck
import { NextResponse } from 'next/server';

// Mockable Mongoose-like models exposed via globals for tests
// In real app they'd be imported from '@/server/models/...'
type SynonymDoc = { synonyms?: string[] } | null;
type FindCall = Record<string, unknown>;
type SortCall = Record<string, unknown>;

declare global {
  // Tracking and configuration hooks for tests
  var __mp_find_calls__: FindCall[];
  var __mp_sort_calls__: SortCall[];
  var __mp_limit_calls__: number[];
  var __mp_throw_on_lean__: boolean;
  var __syn_findOne_queue__: { locale: string; term: string; result: SynonymDoc; throwError: boolean }[];
}

// Initialize globals if not present
globalThis.__mp_find_calls__ ||= [];
globalThis.__mp_sort_calls__ ||= [];
globalThis.__mp_limit_calls__ ||= [];
globalThis.__mp_throw_on_lean__ ||= false;
globalThis.__syn_findOne_queue__ ||= [];

// Simulated SearchSynonym model
export const SearchSynonym = {
  async findOne(query: { locale: string; term: string }) {
    // Shift one queued behavior if matches; else return null
    const idx = globalThis.__syn_findOne_queue__.findIndex(
      (it) => it.locale === query.locale && it.term === query.term
    );
    if (idx >= 0) {
      const item = globalThis.__syn_findOne_queue__.splice(idx, 1)[0];
      if (item.throwError) throw new Error('synonym lookup failed');
      return item.result;
    }
    return null;
  },
};

// Simulated MarketplaceProduct model with chainable query
export const MarketplaceProduct = {
  find(filter: Record<string, unknown>) {
    globalThis.__mp_find_calls__.push([filter]);
    const chain = {
      sort(sortArg: Record<string, unknown>) {
        globalThis.__mp_sort_calls__.push(sortArg);
        return chain2;
      },
    };
    const chain2 = {
      limit(n: number) {
        globalThis.__mp_limit_calls__.push(n);
        return chain3;
      },
    };
    const chain3 = {
      async lean() {
        if (globalThis.__mp_throw_on_lean__) {
          throw new Error('DB error');
        }
        return [{ _id: 'p1' }, { _id: 'p2' }];
      },
    };
    return chain;
  },
};

export async function GET(req: { url: string }) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const locale = (searchParams.get('locale') || 'en').toLowerCase();
    const orgId = searchParams.get('orgId') || 'demo-org';

    if (!q) return NextResponse.json({ items: [] });

    // Expand with synonyms (best effort)
    let terms = [q];
    try {
      const syn = await SearchSynonym.findOne({ locale, term: q.toLowerCase() });
      if (syn && syn.synonyms?.length) terms = Array.from(new Set([q, ...syn.synonyms]));
    } catch {}

    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const or = [
      { $text: { $search: terms.join(' ') } },
      { title: new RegExp(escapeRegex(q), 'i') },
      { brand: new RegExp(escapeRegex(q), 'i') },
    ];

    const docs = await MarketplaceProduct
      .find({ orgId, $or: or })
      .sort({ updatedAt: -1 })
      .limit(24)
      .lean();

    return NextResponse.json({ items: docs });
  } catch (error) {
    console.error('search error', error);
    return NextResponse.json({ items: [] });
  }
}
