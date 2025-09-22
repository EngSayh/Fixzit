// src/services/search/SearchService.ts
import * as fm from './adapters/fm';
import * as realEstate from './adapters/realEstate';
import * as materials from './adapters/materials';

export type SearchResult = { id: string; title: string; subtitle?: string; href: string; icon?: string; badge?: string };

export async function search(query: string, moduleId: string, scopeMode: 'module' | 'all'): Promise<SearchResult[]> {
  const perModule = await adapterFor(moduleId).search(query);
  if (scopeMode === 'module') return perModule;

  // All modules: merge top results from all adapters (simple example)
  const [fmRes, reRes, matRes] = await Promise.all([
    fm.search(query), realEstate.search(query), materials.search(query)
  ]);
  return dedupe([...perModule, ...fmRes, ...reRes, ...matRes]).slice(0, 20);
}

function adapterFor(moduleId: string) {
  if (moduleId.startsWith('aqar') || moduleId.startsWith('marketplace-real-estate')) return realEstate;
  if (moduleId.startsWith('marketplace') || moduleId.startsWith('souq')) return materials;
  return fm; // default to FM
}

function dedupe(arr: SearchResult[]): SearchResult[] {
  const seen = new Set<string>(); const out: SearchResult[] = [];
  for (const r of arr) { if (!seen.has(r.href)) { seen.add(r.href); out.push(r); } }
  return out;
}
