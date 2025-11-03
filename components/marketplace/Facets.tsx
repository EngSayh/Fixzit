'use client';

import { useState } from 'react';
import clsx from 'clsx';

export interface MarketplaceFacets {
  categories: { slug: string; name: string }[];
  brands: string[];
  standards: string[];
  minPrice?: number;
  maxPrice?: number;
}

interface FacetsProps {
  facets: MarketplaceFacets;
  selected: {
    category?: string;
    brand?: string;
    standard?: string;
    minPrice?: number;
    maxPrice?: number;
  };
  // eslint-disable-next-line no-unused-vars
  onChange: (next: Partial<FacetsProps['selected']>) => void;
}

export default function Facets({ facets, selected, onChange }: FacetsProps) {
  const [priceMin, setPriceMin] = useState(selected.minPrice?.toString() ?? '');
  const [priceMax, setPriceMax] = useState(selected.maxPrice?.toString() ?? '');

  return (
    <aside className="w-full max-w-xs space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Categories</h3>
        <ul className="space-y-1 text-sm">
          {facets.categories.map(category => (
            <li key={category.slug}>
              <button
                type="button"
                onClick={() => onChange({ category: category.slug })}
                className={clsx(
                  'w-full rounded-2xl px-3 py-2 text-left transition',
                  selected.category === category.slug ? 'bg-primary text-white' : 'hover:bg-muted'
                )}
              >
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Brand</h3>
        <ul className="space-y-1 text-sm">
          {facets.brands.map(brand => (
            <li key={brand}>
              <button
                type="button"
                onClick={() => onChange({ brand })}
                className={clsx(
                  'w-full rounded-2xl px-3 py-2 text-left transition',
                  selected.brand === brand ? 'bg-primary text-white' : 'hover:bg-muted'
                )}
              >
                {brand}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Standards</h3>
        <ul className="space-y-1 text-sm">
          {facets.standards.map(standard => (
            <li key={standard}>
              <button
                type="button"
                onClick={() => onChange({ standard })}
                className={clsx(
                  'w-full rounded-2xl px-3 py-2 text-left transition',
                  selected.standard === standard ? 'bg-primary text-white' : 'hover:bg-muted'
                )}
              >
                {standard}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Price</h3>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Min"
            className="w-full rounded-2xl border border-border px-3 py-2"
            value={priceMin}
            onChange={event => setPriceMin(event.target.value)}
            onBlur={() => onChange({ minPrice: priceMin ? Number(priceMin) : undefined })}
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Max"
            className="w-full rounded-2xl border border-border px-3 py-2"
            value={priceMax}
            onChange={event => setPriceMax(event.target.value)}
            onBlur={() => onChange({ maxPrice: priceMax ? Number(priceMax) : undefined })}
          />
        </div>
      </section>
    </aside>
  );
}
