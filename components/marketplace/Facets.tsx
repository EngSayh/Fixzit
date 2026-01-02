"use client";

import { useState } from "react";
import clsx from "clsx";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

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
  onChange: (next: Partial<FacetsProps["selected"]>) => void;
}

export default function Facets({ facets, selected, onChange }: FacetsProps) {
  const [priceMin, setPriceMin] = useState(selected.minPrice?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(selected.maxPrice?.toString() ?? "");
  const auto = useAutoTranslator("marketplace.facets");

  return (
    <aside className="w-full max-w-xs space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
          {auto("Categories", "sections.categories")}
        </h3>
        <ul className="space-y-1 text-sm">
          {facets.categories.map((category) => (
            <li key={category.slug}>
              <button
                type="button"
                onClick={() => onChange({ category: category.slug })}
                className={clsx(
                  "w-full rounded-2xl px-3 py-2 text-start transition",
                  selected.category === category.slug
                    ? "bg-primary text-white"
                    : "hover:bg-muted",
                )}
                aria-label={`Filter by category: ${category.name}`}
                aria-pressed={selected.category === category.slug}
              >
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
          {auto("Brand", "sections.brand")}
        </h3>
        <ul className="space-y-1 text-sm">
          {facets.brands.map((brand) => (
            <li key={brand}>
              <button
                type="button"
                onClick={() => onChange({ brand })}
                className={clsx(
                  "w-full rounded-2xl px-3 py-2 text-start transition",
                  selected.brand === brand
                    ? "bg-primary text-white"
                    : "hover:bg-muted",
                )}
                aria-label={`Filter by brand: ${brand}`}
                aria-pressed={selected.brand === brand}
              >
                {brand}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
          {auto("Standards", "sections.standards")}
        </h3>
        <ul className="space-y-1 text-sm">
          {facets.standards.map((standard) => (
            <li key={standard}>
              <button
                type="button"
                onClick={() => onChange({ standard })}
                className={clsx(
                  "w-full rounded-2xl px-3 py-2 text-start transition",
                  selected.standard === standard
                    ? "bg-primary text-white"
                    : "hover:bg-muted",
                )}
                aria-label={`Filter by standard: ${standard}`}
                aria-pressed={selected.standard === standard}
              >
                {standard}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
          {auto("Price", "sections.price")}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="number"
            inputMode="decimal"
            placeholder={auto("Min", "price.minPlaceholder")}
            className="w-full rounded-2xl border border-border px-3 py-2"
            value={priceMin}
            onChange={(event) => setPriceMin(event.target.value)}
            onBlur={() =>
              onChange({ minPrice: priceMin ? Number(priceMin) : undefined })
            }
          />
          <span className="text-muted-foreground">
            {auto("to", "price.separator")}
          </span>
          <input
            type="number"
            inputMode="decimal"
            placeholder={auto("Max", "price.maxPlaceholder")}
            className="w-full rounded-2xl border border-border px-3 py-2"
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
            onBlur={() =>
              onChange({ maxPrice: priceMax ? Number(priceMax) : undefined })
            }
          />
        </div>
      </section>
    </aside>
  );
}
