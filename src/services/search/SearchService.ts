// src/services/search/SearchService.ts
import { MODULES } from '@/src/config/dynamic-modules';
import * as fm from './adapters/fm';
import * as re from './adapters/realEstate';
import * as mat from './adapters/materials';

export type SearchResult = { 
  id: string; 
  type: string;
  title: string; 
  subtitle?: string; 
  href: string; 
  icon?: string; 
  badge?: string;
  score?: number;
};

export async function search(
  query: string, 
  moduleId: string, 
  scopeMode: 'module' | 'all'
): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return [];
  
  // Get adapter based on module
  const adapter = adapterFor(moduleId);
  const perModule = await adapter.search(query, mod.defaultSearchEntities);
  
  if (scopeMode === 'module') {
    return perModule.slice(0, 20);
  }

  // All modules: merge top results from all adapters
  const [fmRes, reRes, matRes] = await Promise.all([
    fm.search(query, []),
    re.search(query, []),
    mat.search(query, [])
  ]);
  
  return dedupe([...perModule, ...fmRes, ...reRes, ...matRes]).slice(0, 50);
}

function adapterFor(moduleId: string) {
  if (moduleId === 'marketplace-real-estate' || moduleId.includes('aqar')) return re;
  if (moduleId === 'marketplace-materials' || moduleId.includes('souq') || moduleId === 'marketplace') return mat;
  return fm; // default to FM
}

function dedupe(arr: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of arr) {
    const key = `${r.type}:${r.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  // Sort by score if available
  return out.sort((a, b) => (b.score || 0) - (a.score || 0));
}