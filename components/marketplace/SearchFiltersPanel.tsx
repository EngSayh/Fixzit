'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Facets, { MarketplaceFacets } from '@/components/marketplace/Facets';

interface SearchFiltersPanelProps {
  facets: MarketplaceFacets;
}

export default function SearchFiltersPanel({ facets }: SearchFiltersPanelProps) {
  const router = useRouter();
  const params = useSearchParams();

  const selected = {
    category: params?.get('cat') ?? undefined,
    brand: params?.get('brand') ?? undefined,
    standard: params?.get('std') ?? undefined,
    minPrice: params?.get('min') ? Number(params.get('min')) : undefined,
    maxPrice: params?.get('max') ? Number(params.get('max')) : undefined
  };

  return (
    <Facets
      facets={facets}
      selected={selected}
      onChange={next => {
        const search = new URLSearchParams(params?.toString() || '');
        if (next.category !== undefined) {
          if (next.category) search.set('cat', next.category);
          else search.delete('cat');
        }
        if (next.brand !== undefined) {
          if (next.brand) search.set('brand', next.brand);
          else search.delete('brand');
        }
        if (next.standard !== undefined) {
          if (next.standard) search.set('std', next.standard);
          else search.delete('std');
        }
        if (next.minPrice !== undefined) {
          if (next.minPrice) search.set('min', String(next.minPrice));
          else search.delete('min');
        }
        if (next.maxPrice !== undefined) {
          if (next.maxPrice) search.set('max', String(next.maxPrice));
          else search.delete('max');
        }
        search.delete('page');
        router.push(`/marketplace/search${search.toString() ? `?${search.toString()}` : ''}`);
      }}
    />
  );
}
