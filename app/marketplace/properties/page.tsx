'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Bed, Bath, Square, Heart, User, LogIn, TrendingUp, Shield, Star } from 'lucide-react';
import Link from 'next/link';
import { guestBrowsingService } from '@/src/lib/guest-browsing';
import { PropertyListing } from '@/src/lib/guest-browsing';

export default function MarketplacePropertiesPage() {
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    type: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: ''
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');

  useEffect(() => {
    loadProperties();
  }, [searchQuery, filters, sortBy]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const result = await guestBrowsingService.getProperties({
        search: searchQuery || undefined,
        city: filters.city || undefined,
        type: filters.type as any || undefined,
        minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
        bedrooms: filters.bedrooms ? Number(filters.bedrooms) : undefined,
        bathrooms: filters.bathrooms ? Number(filters.bathrooms) : undefined,
        page: 1,
        limit: 20
      });
      setProperties(result.properties);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProperties();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFavorite = (propertyId: string) => {
    if (guestBrowsingService.isFavorite(propertyId, 'property')) {
      guestBrowsingService.removeFromFavorites(propertyId, 'property');
    } else {
      guestBrowsingService.addToFavorites(propertyId, 'property');
    }
    // Force re-render
    setProperties([...properties]);
  };

  const handleContactAgent = (propertyId: string) => {
    guestBrowsingService.contactSeller(propertyId, 'property', 'Interested in this property');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-green-100 text-green-800';
      case 'rent': return 'bg-blue-100 text-blue-800';
      case 'commercial': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/marketplace" className="text-2xl font-bold text-[#0061A8]">
                Fixzit Marketplace
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/marketplace/properties" className="text-gray-600 hover:text-[#0061A8] font-medium">
                  Properties
                </Link>
                <Link href="/marketplace/materials" className="text-gray-600 hover:text-[#0061A8]">
                  Materials
                </Link>
                <Link href="/aqar" className="text-gray-600 hover:text-[#0061A8]">
                  Aqar Real Estate
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#0061A8]">
                <User className="w-4 h-4" />
                Sign In
              </Link>
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#0061A8] text-white rounded-md hover:bg-[#0061A8]/90">
                <LogIn className="w-4 h-4" />
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <Shield className="w-4 h-4" />
            <span>You're browsing as a guest. <Link href="/login" className="underline font-medium">Sign in</Link> to contact sellers, save favorites, and access exclusive features.</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by location, property type, or features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            <select
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="">All Cities</option>
              <option value="Riyadh">Riyadh</option>
              <option value="Jeddah">Jeddah</option>
              <option value="Dammam">Dammam</option>
              <option value="Mecca">Mecca</option>
              <option value="Medina">Medina</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
              <option value="commercial">Commercial</option>
            </select>

            <input
              type="number"
              placeholder="Min Price (SAR)"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />

            <input
              type="number"
              placeholder="Max Price (SAR)"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />

            <select
              value={filters.bedrooms}
              onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="">Bedrooms</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>

            <select
              value={filters.bathrooms}
              onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="">Bathrooms</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>

          {/* Sort and View Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{properties.length} properties found</span>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Filters applied</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              >
                <option value="relevance">Relevance</option>
                <option value="price">Price</option>
                <option value="date">Newest</option>
                <option value="rating">Rating</option>
              </select>

              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-[#0061A8] text-white' : 'text-gray-600'}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-[#0061A8] text-white' : 'text-gray-600'}`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-2 ${viewMode === 'map' ? 'bg-[#0061A8] text-white' : 'text-gray-600'}`}
                >
                  Map
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading properties...</p>
          </div>
        )}

        {/* Properties Grid */}
        {!loading && (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {properties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={property.images[0]?.url || '/api/placeholder/400/250'}
                    alt={property.title}
                    className="w-full h-48 object-cover"
                  />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {property.verification.isVerified && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                    {property.agent.falNumber && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        FAL Verified
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleFavorite(property.id)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                  >
                    <Heart 
                      className={`w-4 h-4 ${
                        guestBrowsingService.isFavorite(property.id, 'property') 
                          ? 'text-red-500 fill-current' 
                          : 'text-gray-400 hover:text-red-500'
                      }`} 
                    />
                  </button>

                  <div className={`absolute bottom-2 right-2 px-3 py-1 rounded-full text-white text-sm font-medium ${
                    property.type === 'sale' ? 'bg-green-600' :
                    property.type === 'rent' ? 'bg-blue-600' : 'bg-purple-600'
                  }`}>
                    {property.type === 'sale' ? 'For Sale' :
                     property.type === 'rent' ? 'For Rent' : 'Commercial'}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{property.title}</h3>

                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {property.location.city}, {property.location.district}
                  </div>

                  <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                    {property.specifications.bedrooms > 0 && (
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        {property.specifications.bedrooms}
                      </div>
                    )}
                    {property.specifications.bathrooms > 0 && (
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        {property.specifications.bathrooms}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Square className="w-4 h-4" />
                      {property.specifications.area} sqm
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-gray-900">
                      {property.price.toLocaleString()} {property.currency}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-gray-600">4.8</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleContactAgent(property.id)}
                      className="flex-1 px-3 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#0061A8]/90 transition-colors text-sm"
                    >
                      Contact Agent
                    </button>
                    <button
                      onClick={() => window.location.href = `/marketplace/properties/${property.id}`}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                    >
                      View Details
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {property.specifications.features.slice(0, 3).map((feature) => (
                      <span key={feature} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Listed by: {property.agent.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && properties.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or browse all categories</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Browse properties freely. Sign in to contact agents, save favorites, and access exclusive listings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}