// app/marketplace/properties/page.tsx - Public real estate browsing
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Bed, Bath, Square, Heart, Eye, Shield } from 'lucide-react';

/**
 * Public client page that renders a browsable property listings UI.
 *
 * Renders a two-column layout with a filter sidebar and a responsive properties grid.
 * On mount it attempts to fetch listings from /api/marketplace/properties, normalizes
 * the API shape into the UI model, and falls back to a static sample dataset on error
 * or when the API returns no items. Client-side filters (city, type, price range,
 * bedrooms) are applied to the loaded list; "Apply Filters" writes selected filters
 * into the browser URL query string without reloading. The component also detects
 * right-to-left layout via document.documentElement.dir and adjusts the page title.
 *
 * The UI includes accessible testing hooks (data-testid) on key elements such as the
 * page title, results count, filters and property cards.
 */
export default function PublicPropertiesPage() {
  const SAMPLE_PROPERTIES = [
    { id: 'p1', title: 'Apartment in Al Olaya', city: 'Riyadh', district: 'Al Olaya', price: 90000, bedrooms: 2, bathrooms: 2, area: 120, verified: true, image: '/placeholder-property.jpg' },
    { id: 'p2', title: 'Villa in Al Hamra', city: 'Jeddah', district: 'Al Hamra', price: 250000, bedrooms: 4, bathrooms: 3, area: 300, verified: false, image: '/placeholder-property.jpg' },
    { id: 'p3', title: 'Office in Dammam', city: 'Dammam', district: 'Business', price: 120000, bedrooms: 0, bathrooms: 2, area: 200, verified: true, image: '/placeholder-property.jpg' },
    { id: 'p4', title: 'Studio in Al Malaz', city: 'Riyadh', district: 'Al Malaz', price: 65000, bedrooms: 0, bathrooms: 1, area: 55, verified: true, image: '/placeholder-property.jpg' },
    { id: 'p5', title: 'Shop in Al Rawdah', city: 'Jeddah', district: 'Al Rawdah', price: 180000, bedrooms: 0, bathrooms: 1, area: 80, verified: false, image: '/placeholder-property.jpg' },
    { id: 'p6', title: 'Warehouse in 2nd Industrial', city: 'Dammam', district: 'Industrial', price: 300000, bedrooms: 0, bathrooms: 1, area: 600, verified: true, image: '/placeholder-property.jpg' },
    { id: 'p7', title: 'Luxury Villa in Al Nakheel', city: 'Riyadh', district: 'Al Nakheel', price: 2000000, bedrooms: 5, bathrooms: 5, area: 500, verified: true, image: '/placeholder-property.jpg' },
    { id: 'p8', title: 'Apartment in Al Hamra', city: 'Jeddah', district: 'Al Hamra', price: 85000, bedrooms: 2, bathrooms: 2, area: 110, verified: false, image: '/placeholder-property.jpg' }
  ];
  const [filters, setFilters] = useState({
    city: '',
    type: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: ''
  });

  const [properties, setProperties] = useState<any[]>(SAMPLE_PROPERTIES);
  const [applied, setApplied] = useState(false);
  const [isArabic, setIsArabic] = useState(false);

  async function fetchListingsFromApi(signal?: AbortSignal) {
    const url = new URL('/api/marketplace/properties', window.location.origin);
    const sp = new URLSearchParams(window.location.search);
    // map UI filters → API params
    if (sp.get('city')) url.searchParams.set('city', sp.get('city') as string);
    if (sp.get('minPrice')) url.searchParams.set('minPrice', sp.get('minPrice') as string);
    if (sp.get('maxPrice')) url.searchParams.set('maxPrice', sp.get('maxPrice') as string);
    if (sp.get('bedrooms')) url.searchParams.set('bedrooms', sp.get('bedrooms') as string);
    url.searchParams.set('limit', '60');

    const res = await fetch(url.toString(), { signal, cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load');
    const json = await res.json();
    const items = json?.data?.listings || json?.data || json?.listings || [];
    // Transform API shape → UI shape
    const mapped = items.map((it: any) => ({
      id: it.id || it._id,
      title: it.title || it.property?.title || 'Property',
      city: it.property?.location?.city,
      district: it.property?.location?.district,
      price: it.price,
      bedrooms: it.property?.bedrooms ?? 0,
      bathrooms: it.property?.bathrooms ?? 0,
      area: it.property?.area ?? 0,
      verified: it.badges?.verified || it.verification?.status === 'verified',
      image: it.image?.url || '/placeholder-property.jpg'
    }));
    return mapped;
  }

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const mapped = await fetchListingsFromApi(controller.signal);
        setProperties(mapped.length ? mapped : SAMPLE_PROPERTIES);
      } catch {
        setProperties(SAMPLE_PROPERTIES);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try { setIsArabic(document.documentElement.dir === 'rtl'); } catch {}
  }, []);

  const filteredProperties = properties.filter(property => {
    if (filters.city && !property.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.type && property.type !== filters.type) return false;
    if (filters.minPrice && property.price < parseInt(filters.minPrice)) return false;
    if (filters.maxPrice && property.price > parseInt(filters.maxPrice)) return false;
    if (filters.bedrooms && property.bedrooms !== parseInt(filters.bedrooms)) return false;
    return true;
  });

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="page-title">{isArabic ? 'العقارات' : 'Browse Properties'}</h1>
              <p className="text-gray-600">Find your perfect property across Saudi Arabia</p>
            </div>
            <div className="text-sm text-gray-500" data-testid="results-count">
              {filteredProperties.length} properties found
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="font-semibold mb-4">Filters</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    data-testid="city-filter"
                  >
                    <option value="">All Cities</option>
                    <option value="Riyadh">Riyadh</option>
                    <option value="Jeddah">Jeddah</option>
                    <option value="Dammam">Dammam</option>
                    <option value="Mecca">Mecca</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Property Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">All Types</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Office">Office</option>
                    <option value="Land">Land</option>
                  </select>
                </div>

                <div data-testid="price-filter">
                  <label className="block text-sm font-medium mb-2">Price Range (SAR)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      data-testid="min-price"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      data-testid="max-price"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bedrooms</label>
                  <select
                    value={filters.bedrooms}
                    onChange={(e) => setFilters({...filters, bedrooms: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Any</option>
                    <option value="0">Studio</option>
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3 Bedrooms</option>
                    <option value="4">4+ Bedrooms</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="verified"
                    className="mr-2"
                  />
                  <label htmlFor="verified" className="text-sm">Verified listings only</label>
                </div>
              </div>
            </div>
            <button className="w-full mt-2 px-3 py-2 text-white bg-[#0061A8] rounded" onClick={()=>{
              const params = new URLSearchParams(window.location.search);
              if (filters.city) params.set('city', filters.city);
              if (filters.minPrice) params.set('minPrice', filters.minPrice);
              if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
              const url = `${window.location.pathname}?${params.toString()}`;
              window.history.replaceState({}, '', url);
              setApplied(true);
            }}>
              Apply Filters
            </button>
          </div>

          {/* Properties Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <Link
                  key={property.id}
                  href={`/marketplace/properties/${property.id}`}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                  data-testid="property-card"
                >
                  <div className="relative">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                    {property.verified && (
                      <div className="absolute top-3 right-3 bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1" data-testid="verified-badge">
                        <Shield className="h-3 w-3" />
                        Verified
                      </div>
                    )}
                    <button className="absolute top-3 left-3 p-2 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{property.title}</h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">{property.city}, {property.district}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          <span>{property.bedrooms}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          <span>{property.bathrooms}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4" />
                          <span>{property.area}m²</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-[#0061A8]">
                          {Number(property.price || 0).toLocaleString()}
                        </span>
                        <span className="text-gray-600 ml-1">SAR/year</span>
                      </div>
                      <button className="flex items-center gap-1 text-[#0061A8] hover:text-[#0061A8]/80">
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">View Details</span>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filteredProperties.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
