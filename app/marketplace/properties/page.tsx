// app/marketplace/properties/page.tsx - Public real estate browsing
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Bed, Bath, Square, Heart, Eye, Shield } from 'lucide-react';

export default function PublicPropertiesPage() {
  const [filters, setFilters] = useState({
    city: '',
    type: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: ''
  });

  // Mock data - replace with API call
  const properties = [
    {
      id: '1',
      title: 'Modern Apartment in Riyadh',
      city: 'Riyadh',
      district: 'Al Olaya',
      price: 85000,
      currency: 'SAR',
      bedrooms: 2,
      bathrooms: 2,
      area: 120,
      type: 'Apartment',
      verified: true,
      image: '/placeholder-property.jpg',
      features: ['Parking', 'Gym', 'Security'],
      description: 'Beautiful modern apartment in the heart of Riyadh with excellent amenities.'
    },
    {
      id: '2',
      title: 'Luxury Villa in Jeddah',
      city: 'Jeddah',
      district: 'Al Hamra',
      price: 150000,
      currency: 'SAR',
      bedrooms: 4,
      bathrooms: 3,
      area: 250,
      type: 'Villa',
      verified: true,
      image: '/placeholder-property.jpg',
      features: ['Swimming Pool', 'Garden', 'Garage'],
      description: 'Spacious luxury villa with private garden and swimming pool.'
    },
    {
      id: '3',
      title: 'Commercial Office Space',
      city: 'Dammam',
      district: 'Al Khobar',
      price: 200000,
      currency: 'SAR',
      bedrooms: 0,
      bathrooms: 2,
      area: 180,
      type: 'Office',
      verified: false,
      image: '/placeholder-property.jpg',
      features: ['Central AC', 'Parking', 'Reception'],
      description: 'Prime commercial office space in a modern business district.'
    }
  ];

  const filteredProperties = properties.filter(property => {
    if (filters.city && !property.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.type && property.type !== filters.type) return false;
    if (filters.minPrice && property.price < parseInt(filters.minPrice)) return false;
    if (filters.maxPrice && property.price > parseInt(filters.maxPrice)) return false;
    if (filters.bedrooms && property.bedrooms !== parseInt(filters.bedrooms)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Browse Properties</h1>
              <p className="text-gray-600">Find your perfect property across Saudi Arabia</p>
            </div>
            <div className="text-sm text-gray-500">
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

                <div>
                  <label className="block text-sm font-medium mb-2">Price Range (SAR)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
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
          </div>

          {/* Properties Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <Link
                  key={property.id}
                  href={`/marketplace/properties/${property.id}`}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="relative">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                    {property.verified && (
                      <div className="absolute top-3 right-3 bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1">
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
                          {property.price.toLocaleString()}
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
