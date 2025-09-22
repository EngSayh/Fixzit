// src/services/search/adapters/realEstate.ts
import { SearchResult } from '../SearchService';

// Listings & Units used as public "Aqar Souq" domain.
export async function search(q: string): Promise<SearchResult[]> {
  return [
    { id: 'LIST-901', title: `Listing: ${q} Residence`, subtitle: '2BR • North Ring • SAR 85k/yr', href: `/aqar/listings/901`, icon: 'Home', badge: 'Listing' },
  ];
}
