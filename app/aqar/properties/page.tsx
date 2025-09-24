"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Bed, Bath, Square } from 'lucide-react';

type AqarProperty = {
  _id: string;
  code: string;
  name: string;
  type?: string;
  subtype?: string;
  address?: { city?: string; district?: string };
  details?: { totalArea?: number; bedrooms?: number; bathrooms?: number };
  market?: { listingPrice?: number };
  photos?: string[];
};

export default function AqarPropertiesPage() {
  const [items, setItems] = useState<AqarProperty[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/aqar/properties?page=1&pageSize=24');
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q) return items;
    const lower = q.toLowerCase();
    return items.filter(p =>
      p.name?.toLowerCase().includes(lower) ||
      p.address?.city?.toLowerCase().includes(lower) ||
      p.address?.district?.toLowerCase().includes(lower)
    );
  }, [q, items]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input value={q} onChange={e=>setQ(e.target.value)}
                     placeholder="Search by city, district, or title"
                     className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent" />
            </div>
          </div>
        </div>

        {loading ? <div>Loading…</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <article key={p._id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(p.photos && p.photos[0]) || '/images/fallback.jpg'} alt={p.name} className="w-full h-48 object-cover" />
                  <div className="absolute bottom-2 right-2 px-3 py-1 rounded-full text-white text-sm font-medium bg-[#0061A8]">
                    {p.subtype || p.type || 'Property'}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{p.name}</h3>
                  <div className="text-sm text-gray-600 mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" />{p.address?.district} — {p.address?.city}</div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {p.details?.bedrooms ? <span className="flex items-center gap-1"><Bed className="w-4 h-4" />{p.details.bedrooms}</span> : null}
                    {p.details?.bathrooms ? <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{p.details.bathrooms}</span> : null}
                    {p.details?.totalArea ? <span className="flex items-center gap-1"><Square className="w-4 h-4" />{p.details.totalArea} m²</span> : null}
                  </div>
                  <div className="mt-2 text-[#0061A8] font-bold">{p.market?.listingPrice ? `${p.market.listingPrice.toLocaleString()} SAR` : ''}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

