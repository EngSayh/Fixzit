'use client&apos;;

import { useRouter, useSearchParams } from &apos;next/navigation&apos;;
import Facets, { MarketplaceFacets } from &apos;@/src/components/marketplace/Facets&apos;;

interface SearchFiltersPanelProps {
  facets: MarketplaceFacets;
}

export default function SearchFiltersPanel({ facets }: SearchFiltersPanelProps) {
  const router = useRouter();
  const params = useSearchParams();

  const selected = {
    category: params.get(&apos;cat&apos;) ?? undefined,
    brand: params.get(&apos;brand&apos;) ?? undefined,
    standard: params.get('std&apos;) ?? undefined,
    minPrice: params.get(&apos;min&apos;) ? Number(params.get(&apos;min&apos;)) : undefined,
    maxPrice: params.get(&apos;max&apos;) ? Number(params.get(&apos;max&apos;)) : undefined
  };

  return (
    <Facets
      facets={facets}
      selected={selected}
      onChange={next => {
        const search = new URLSearchParams(params.toString());
        if (next.category !== undefined) {
          if (next.category) search.set(&apos;cat&apos;, next.category);
          else search.delete(&apos;cat&apos;);
        }
        if (next.brand !== undefined) {
          if (next.brand) search.set(&apos;brand&apos;, next.brand);
          else search.delete(&apos;brand&apos;);
        }
        if (next.standard !== undefined) {
          if (next.standard) search.set('std&apos;, next.standard);
          else search.delete('std&apos;);
        }
        if (next.minPrice !== undefined) {
          if (next.minPrice) search.set(&apos;min&apos;, String(next.minPrice));
          else search.delete(&apos;min&apos;);
        }
        if (next.maxPrice !== undefined) {
          if (next.maxPrice) search.set(&apos;max&apos;, String(next.maxPrice));
          else search.delete(&apos;max&apos;);
        }
        search.delete(&apos;page&apos;);
        router.push(`/marketplace/search${search.toString() ? `?${search.toString()}` : &apos;'}`);
      }}
    />
  );
}
