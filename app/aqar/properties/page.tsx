'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Bed, Bath, Square } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/contexts/TranslationContext';

type ApiProperty = {
  id: string;
  code: string;
  name: string;
  type?: string;
  subtype?: string;
  address?: { city?: string; district?: string };
  details?: { totalArea?: number; bedrooms?: number; bathrooms?: number };
  market?: { listingPrice?: number };
  photos?: string[];
  rnplEligible?: boolean;
  auction?: { isAuction?: boolean; endAt?: string };
};

export default function AqarPropertiesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/aqar/properties?page=1&pageSize=24');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) {
          setError(t('aqar.properties.error', 'Could not load properties'));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const city = p.address?.city || '';
      const district = p.address?.district || '';
      const name = p.name || '';
      return (
        name.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q) ||
        district.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-center">
        <h1 className="text-2xl font-bold text-foreground">
          {t('aqar.propertyListings', 'Property Listings')}
        </h1>
        <div className="flex-1 relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('aqar.properties.searchPlaceholder', 'Search by city, district, or title')}
            className="w-full ps-10 pe-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-warning focus:border-transparent"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {t('aqar.properties.count', '{{count}} properties').replace('{{count}}', filtered.length.toString())}
        </div>
      </div>

      {loading && (
        <div className="text-muted-foreground">
          {t('aqar.properties.loading', 'Loading properties...')}
        </div>
      )}
      {!loading && error && (
        <div className="text-destructive">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="grid">
          {filtered.map((p) => {
            const photo = (p.photos && p.photos[0]) || '/images/fallback.jpg';
            const city = p.address?.city || '';
            const district = p.address?.district || '';
            const beds = p.details?.bedrooms || 0;
            const baths = p.details?.bathrooms || 0;
            const area = p.details?.totalArea || 0;
            const price = p.market?.listingPrice || 0;
            const badge = p.subtype || p.type || t('aqar.properties.badge.fallback', 'Property');
            return (
              <article key={p.id} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="relative w-full h-48">
                  <Image src={photo} alt={p.name} fill className="object-cover" />
                  <span className="absolute top-2 start-2 bg-card/90 text-foreground text-xs px-2 py-1 rounded">{badge}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{p.name}</h3>
                  <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{district}{district && city ? ' — ' : ''}{city}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                    {!!beds && (
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        {beds}
                      </div>
                    )}
                    {!!baths && (
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        {baths}
                      </div>
                    )}
                    {!!area && (
                      <div className="flex items-center gap-1">
                        <Square className="w-4 h-4" />
                        {area} m²
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-foreground">{price ? `${price.toLocaleString()} SAR` : ''}</div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {p.rnplEligible && (
                      <span className="inline-flex items-center text-xs font-medium bg-success/10 text-success px-2 py-1 rounded-full">
                        {t('aqar.properties.badge.rnpl', 'RNPL Ready')}
                      </span>
                    )}
                    {p.auction?.isAuction && (
                      <span className="inline-flex items-center text-xs font-medium bg-warning/10 text-warning px-2 py-1 rounded-full">
                        {t('aqar.properties.badge.auction', 'Auction')}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('aqar.properties.empty.title', 'No properties found')}
          </h3>
          <p className="text-muted-foreground">
            {t('aqar.properties.empty.description', 'Try adjusting your search criteria or browse all categories')}
          </p>
        </div>
      )}
    </div>
  );
}
