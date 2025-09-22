// src/services/search/adapters/materials.ts
import { SearchResult } from '../SearchService';

// Parts/Products (SKUs), Vendors. :contentReference[oaicite:15]{index=15}
export async function search(q: string): Promise<SearchResult[]> {
  return [
    { id: 'SKU-ACF-14x20', title: `HVAC Filter ${q}`, subtitle: '14x20 • MERV 11 • Vendor: CoolAir', href: `/souq/catalog/ACF-14x20`, icon: 'Package', badge: 'SKU' },
  ];
}
