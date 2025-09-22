// src/services/search/adapters/fm.ts
import { SearchResult } from '../SearchService';

// NOTE: Wire these to your real API per SDD/Postman (Work Orders, Properties, Units, Tenants, Vendors, Invoices).
// Examples align to the SDD's entity model & endpoints.
export async function search(q: string): Promise<SearchResult[]> {
  // Minimal stub (replace with real fetch calls, RBAC headers, tenant context)
  const results: SearchResult[] = [
    { id: 'WO-1042', title: `WO: ${q} (sample)`, subtitle: 'P2 • Assessment', href: `/fm/work-orders/1042`, icon: 'ClipboardList', badge: 'WO' },
    { id: 'PROP-33', title: `Property: ${q} Towers`, subtitle: 'Riyadh • 120 Units', href: `/fm/properties/33`, icon: 'Building2', badge: 'Property' },
  ];
  return results;
}
