'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Star, Heart, User, LogIn, Shield, Package } from 'lucide-react';
import Link from 'next/link';
import { guestBrowsingService } from '@/src/lib/guest-browsing';
import { MaterialListing } from '@/src/lib/guest-browsing';

export default function MarketplaceMaterialsPage() {
  const [materials, setMaterials] = useState<MaterialListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    minPrice: '',
    maxPrice: '',
    vendor: ''
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    loadMaterials();
    updateCartCount();
  }, [searchQuery, filters, sortBy]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const result = await guestBrowsingService.getMaterials({
        search: searchQuery || undefined,
        category: filters.category || undefined,
        subcategory: filters.subcategory || undefined,
        minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
        vendor: filters.vendor || undefined,
        page: 1,
        limit: 20
      });
      setMaterials(result.materials);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCartCount = () => {
    const cartItems = guestBrowsingService.getCartItems();
    setCartCount(cartItems.length);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMaterials();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAddToCart = (materialId: string) => {
    guestBrowsingService.addToCart(materialId, 1, 'material');
    updateCartCount();
  };

  const handleFavorite = (materialId: string) => {
    if (guestBrowsingService.isFavorite(materialId, 'material')) {
      guestBrowsingService.removeFromFavorites(materialId, 'material');
    } else {
      guestBrowsingService.addToFavorites(materialId, 'material');
    }
    // Force re-render
    setMaterials([...materials]);
  };

  const handleProceedToCheckout = () => {
    guestBrowsingService.proceedToCheckout();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-yellow-500 fill-current' : 'text-gray-300'
        }`}
      />
    ));
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
                <Link href="/marketplace/properties" className="text-gray-600 hover:text-[#0061A8]">
                  Properties
                </Link>
                <Link href="/marketplace/materials" className="text-gray-600 hover:text-[#0061A8] font-medium">
                  Materials
                </Link>
                <Link href="/aqar" className="text-gray-600 hover:text-[#0061A8]">
                  Aqar Real Estate
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/marketplace/cart" className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#0061A8]">
                <ShoppingCart className="w-4 h-4" />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
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
            <span>You're browsing as a guest. <Link href="/login" className="underline font-medium">Sign in</Link> to add items to cart, contact vendors, and proceed to checkout.</span>
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
                placeholder="Search materials, brands, or specifications..."
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="Construction Materials">Construction Materials</option>
              <option value="HVAC & Electrical">HVAC & Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Tools & Equipment">Tools & Equipment</option>
              <option value="Safety Equipment">Safety Equipment</option>
            </select>

            <select
              value={filters.subcategory}
              onChange={(e) => handleFilterChange('subcategory', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="">All Subcategories</option>
              <option value="Cement">Cement</option>
              <option value="Steel">Steel</option>
              <option value="Pipes">Pipes</option>
              <option value="Wiring">Wiring</option>
              <option value="Tools">Tools</option>
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

            <input
              type="text"
              placeholder="Vendor Name"
              value={filters.vendor}
              onChange={(e) => handleFilterChange('vendor', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />
          </div>

          {/* Sort and View Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{materials.length} materials found</span>
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
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading materials...</p>
          </div>
        )}

        {/* Materials Grid */}
        {!loading && (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
            {materials.map((material) => (
              <div key={material.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={material.images[0]?.url || '/api/placeholder/300/300'}
                    alt={material.title}
                    className="w-full h-48 object-cover"
                  />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {material.vendor.isVerified && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                    {material.availability.inStock && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        In Stock
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleFavorite(material.id)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                  >
                    <Heart 
                      className={`w-4 h-4 ${
                        guestBrowsingService.isFavorite(material.id, 'material') 
                          ? 'text-red-500 fill-current' 
                          : 'text-gray-400 hover:text-red-500'
                      }`} 
                    />
                  </button>
                </div>

                <div className="p-4">
                  <div className="text-xs text-gray-500 mb-1">{material.category}</div>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{material.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {renderStars(material.rating.average)}
                    </div>
                    <span className="text-sm text-gray-600">({material.rating.count})</span>
                  </div>

                  {/* Price and Availability */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xl font-bold text-gray-900">
                        {material.price.toLocaleString()} {material.currency}
                      </span>
                      <span className="text-sm text-gray-500"> / {material.unit}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {material.availability.quantity} available
                    </div>
                  </div>

                  {/* Vendor */}
                  <div className="text-sm text-gray-500 mb-3">
                    by {material.vendor.name}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(material.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#0061A8]/90 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && materials.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Package className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or browse all categories</p>
          </div>
        )}

        {/* Cart Summary */}
        {cartCount > 0 && (
          <div className="fixed bottom-6 right-6 bg-[#0061A8] text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <div className="font-medium">{cartCount} items in cart</div>
                <div className="text-xs opacity-90">Sign in to proceed to checkout</div>
              </div>
              <button
                onClick={handleProceedToCheckout}
                className="px-4 py-2 bg-white text-[#0061A8] rounded-md hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Browse materials freely. Sign in to add to cart, contact vendors, and proceed to checkout.</p>
          </div>
        </div>
      </div>
    </div>
  );
}