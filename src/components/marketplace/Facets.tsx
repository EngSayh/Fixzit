'use client&apos;;

import { useState } from &apos;react&apos;;
import clsx from &apos;clsx&apos;;

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
  onChange: (next: Partial<FacetsProps['selected&apos;]>) => void;
}

export default function Facets({ facets, selected, onChange }: FacetsProps) {
  const [priceMin, setPriceMin] = useState(selected.minPrice?.toString() ?? &apos;');
  const [priceMax, setPriceMax] = useState(selected.maxPrice?.toString() ?? &apos;');

  return (
    <aside className="w-full max-w-xs space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#0061A8]">Categories</h3>
        <ul className="space-y-1 text-sm">
          {facets.categories.map(category => (
            <li key={category.slug}>
              <button
                type="button"
                onClick={() => onChange({ category: category.slug })}
                className={clsx(
                  &apos;w-full rounded-md px-3 py-2 text-left transition&apos;,
                  selected.category === category.slug ? &apos;bg-[#0061A8] text-white&apos; : &apos;hover:bg-gray-100&apos;
                )}
              >
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#0061A8]">Brand</h3>
        <ul className="space-y-1 text-sm">
          {facets.brands.map(brand => (
            <li key={brand}>
              <button
                type="button"
                onClick={() => onChange({ brand })}
                className={clsx(
                  &apos;w-full rounded-md px-3 py-2 text-left transition&apos;,
                  selected.brand === brand ? &apos;bg-[#0061A8] text-white&apos; : &apos;hover:bg-gray-100&apos;
                )}
              >
                {brand}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#0061A8]">Standards</h3>
        <ul className="space-y-1 text-sm">
          {facets.standards.map(standard => (
            <li key={standard}>
              <button
                type="button"
                onClick={() => onChange({ standard })}
                className={clsx(
                  &apos;w-full rounded-md px-3 py-2 text-left transition&apos;,
                  selected.standard === standard ? &apos;bg-[#0061A8] text-white&apos; : &apos;hover:bg-gray-100&apos;
                )}
              >
                {standard}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#0061A8]">Price</h3>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Min"
            className="w-full rounded-md border border-gray-200 px-3 py-2"
            value={priceMin}
            onChange={event => setPriceMin(event.target.value)}
            onBlur={() => onChange({ minPrice: priceMin ? Number(priceMin) : undefined })}
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Max"
            className="w-full rounded-md border border-gray-200 px-3 py-2"
            value={priceMax}
            onChange={event => setPriceMax(event.target.value)}
            onBlur={() => onChange({ maxPrice: priceMax ? Number(priceMax) : undefined })}
          />
        </div>
      </section>
    </aside>
  );
}
