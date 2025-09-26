'use client';

import { useState } from &apos;react&apos;;
import { Search, Filter, MapPin, Bed, Bath, Square, Heart, User, LogIn, TrendingUp } from &apos;lucide-react&apos;;
import Link from &apos;next/link&apos;;

interface Property {
  id: string;
  title: string;
  type: 'sale&apos; | &apos;rent&apos; | &apos;commercial&apos;;
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  image: string;
  agent: string;
  isVerified?: boolean;
  isPremium?: boolean;
  features: string[];
  rating?: number;
}

const SAMPLE_PROPERTIES: Property[] = [
  {
    id: &apos;1',
    title: 'Luxury Villa - Al Olaya&apos;,
    type: 'sale&apos;,
    price: &apos;SAR 3,500,000&apos;,
    location: &apos;Al Olaya, Riyadh&apos;,
    beds: 5,
    baths: 6,
    area: 450,
    image: &apos;/img/logo.jpg&apos;,
    agent: &apos;Premium Properties Ltd&apos;,
    isVerified: true,
    isPremium: true,
    features: [&apos;Swimming Pool&apos;, &apos;Garden&apos;, &apos;Garage&apos;, &apos;Security&apos;],
    rating: 4.8
  },
  {
    id: &apos;2',
    title: 'Modern Apartment - Downtown&apos;,
    type: &apos;rent&apos;,
    price: &apos;SAR 8,500/month&apos;,
    location: &apos;King Fahd Road, Riyadh&apos;,
    beds: 2,
    baths: 2,
    area: 120,
    image: &apos;/img/logo.jpg&apos;,
    agent: &apos;City Living Realty&apos;,
    isVerified: true,
    features: [&apos;City View&apos;, &apos;Balcony&apos;, &apos;Parking&apos;, &apos;Gym Access&apos;],
    rating: 4.5
  },
  {
    id: &apos;3',
    title: &apos;Office Space - Business District&apos;,
    type: &apos;commercial&apos;,
    price: &apos;SAR 15,000/month&apos;,
    location: &apos;Business Bay, Riyadh&apos;,
    beds: 0,
    baths: 2,
    area: 200,
    image: &apos;/img/logo.jpg&apos;,
    agent: &apos;Commercial Properties Co&apos;,
    isVerified: true,
    features: [&apos;Furnished&apos;, &apos;Meeting Rooms&apos;, &apos;Reception&apos;, &apos;Parking&apos;],
    rating: 4.7
  },
  {
    id: &apos;4',
    title: 'Cozy Family Home - Family District&apos;,
    type: 'sale&apos;,
    price: &apos;SAR 1,800,000&apos;,
    location: &apos;Al Malaz, Riyadh&apos;,
    beds: 4,
    baths: 3,
    area: 280,
    image: &apos;/img/logo.jpg&apos;,
    agent: &apos;Family Homes Realty&apos;,
    isVerified: true,
    features: [&apos;Garden&apos;, &apos;Play Area&apos;, &apos;Storage&apos;, &apos;Quiet Area&apos;],
    rating: 4.6
  },
  {
    id: &apos;5',
    title: 'Studio Apartment - City Center&apos;,
    type: &apos;rent&apos;,
    price: &apos;SAR 4,200/month&apos;,
    location: &apos;City Center, Riyadh&apos;,
    beds: 1,
    baths: 1,
    area: 60,
    image: &apos;/img/logo.jpg&apos;,
    agent: &apos;Urban Living&apos;,
    isVerified: true,
    features: [&apos;Modern Design&apos;, &apos;City View&apos;, &apos;Public Transport&apos;],
    rating: 4.3
  },
  {
    id: &apos;6',
    title: &apos;Penthouse with Sea View&apos;,
    type: 'sale',
    price: &apos;SAR 5,200,000&apos;,
    location: &apos;Corniche, Jeddah&apos;,
    beds: 3,
    baths: 4,
    area: 320,
    image: &apos;/api/placeholder/400/250&apos;,
    agent: &apos;Luxury Estates&apos;,
    isVerified: true,
    isPremium: true,
    features: [&apos;Sea View&apos;, &apos;Terrace&apos;, &apos;Private Pool&apos;, &apos;Concierge&apos;],
    rating: 4.9
  }
];

export default function AqarPropertiesPage() {
  const [searchTerm, setSearchTerm] = useState(&apos;');
  const [selectedType, setSelectedType] = useState(&apos;all&apos;);
  const [priceRange, setPriceRange] = useState(&apos;all&apos;);

  const filteredProperties = SAMPLE_PROPERTIES.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === &apos;all&apos; || property.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale&apos;: return &apos;bg-green-100 text-green-800&apos;;
      case &apos;rent&apos;: return &apos;bg-blue-100 text-blue-800&apos;;
      case &apos;commercial&apos;: return &apos;bg-purple-100 text-purple-800&apos;;
      default: return &apos;bg-gray-100 text-gray-800&apos;;
    }
  };

  const handleFavorite = (propertyId: string) => {
    // Redirect to login if not authenticated
    window.location.href = &apos;/login?redirect=/aqar/properties&action=favorite&apos;;
  };

  const handleContactAgent = (propertyId: string) => {
    // Redirect to login if not authenticated
    window.location.href = &apos;/login?redirect=/aqar/properties&action=contact-agent&apos;;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/aqar" className="text-2xl font-bold text-[#FFB400]">
                Aqar Real Estate
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/aqar/properties" className="text-gray-600 hover:text-[#FFB400]">Properties</Link>
                <Link href="/aqar/map" className="text-gray-600 hover:text-[#FFB400]">Map View</Link>
                <Link href="/aqar/search" className="text-gray-600 hover:text-[#FFB400]">Advanced Search</Link>
                <Link href="/aqar/favorites" className="text-gray-600 hover:text-[#FFB400]">Favorites</Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#FFB400]">
                <User className="w-4 h-4" />
                Sign In
              </Link>
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#FFB400] text-white rounded-md hover:bg-[#FFB400]/90">
                <LogIn className="w-4 h-4" />
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by location, property type, or features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
                <option value="commercial">Commercial</option>
              </select>

              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
              >
                <option value="all">All Prices</option>
                <option value="0-500k">Under SAR 500K</option>
                <option value="500k-1m">SAR 500K - 1M</option>
                <option value="1m-2m">SAR 1M - 2M</option>
                <option value="2m+">Over SAR 2M</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{filteredProperties.length} properties found</span>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>Filters applied</span>
            </div>
          </div>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={property.image}
                  alt={property.title}
                  className="w-full h-48 object-cover"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {property.isPremium && (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Premium
                    </span>
                  )}
                  {property.isVerified && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Verified
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleFavorite(property.id)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                >
                  <Heart className="w-4 h-4 text-gray-400 hover:text-red-500" />
                </button>

                <div className={`absolute bottom-2 right-2 px-3 py-1 rounded-full text-white text-sm font-medium ${
                  property.type === 'sale&apos; ? &apos;bg-green-600&apos; :
                  property.type === &apos;rent&apos; ? &apos;bg-blue-600&apos; : &apos;bg-purple-600&apos;
                }`}>
                  {property.type === 'sale&apos; ? &apos;For Sale&apos; :
                   property.type === &apos;rent&apos; ? &apos;For Rent&apos; : &apos;Commercial&apos;}
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{property.title}</h3>

                <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {property.location}
                </div>

                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  {property.beds > 0 && (
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      {property.beds}
                    </div>
                  )}
                  {property.baths > 0 && (
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      {property.baths}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Square className="w-4 h-4" />
                    {property.area} sqm
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-gray-900">{property.price}</span>
                  {property.rating && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">{property.rating}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleContactAgent(property.id)}
                    className="flex-1 px-3 py-2 bg-[#FFB400] text-white rounded-md hover:bg-[#FFB400]/90 transition-colors text-sm"
                  >
                    Contact Agent
                  </button>
                  <button
                    onClick={() => window.location.href = `/aqar/properties/${property.id}`}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    View Details
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {property.features.slice(0, 3).map((feature) => (
                    <span key={feature} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Listed by: {property.agent}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredProperties.length === 0 && (
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
            <p>Browse properties freely. Sign in to save favorites, contact agents, and access exclusive listings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

