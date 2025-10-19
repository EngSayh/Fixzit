'use client';

import { useState } from 'react';
import { Search, Filter, ShoppingCart, Heart, Star, User, LogIn } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviews: number;
  image: string;
  vendor: string;
  inStock: boolean;
  isNew?: boolean;
  discount?: number;
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Steel Rebar 12mm',
    category: 'Construction Materials',
    price: 'SAR 2,450',
    originalPrice: 'SAR 2,650',
    rating: 4.5,
    reviews: 128,
    image: '/img/logo.jpg',
    vendor: 'SteelCorp Ltd',
    inStock: true,
    discount: 8
  },
  {
    id: '2',
    name: 'LED Light Fixtures 60W',
    category: 'Electrical',
    price: 'SAR 185',
    originalPrice: 'SAR 220',
    rating: 4.2,
    reviews: 89,
    image: '/img/logo.jpg',
    vendor: 'LightTech Solutions',
    inStock: true,
    discount: 16,
    isNew: true
  },
  {
    id: '3',
    name: 'Safety Equipment Set',
    category: 'Safety & PPE',
    price: 'SAR 450',
    originalPrice: 'SAR 520',
    rating: 4.8,
    reviews: 234,
    image: '/img/logo.jpg',
    vendor: 'SafetyFirst Inc',
    inStock: true,
    discount: 13
  },
  {
    id: '4',
    name: 'HVAC System Complete',
    category: 'Mechanical',
    price: 'SAR 8,900',
    rating: 4.6,
    reviews: 67,
    image: '/img/logo.jpg',
    vendor: 'ClimateTech Pro',
    inStock: true
  },
  {
    id: '5',
    name: 'Office Furniture Bundle',
    category: 'Furniture',
    price: 'SAR 3,200',
    originalPrice: 'SAR 3,800',
    rating: 4.3,
    reviews: 156,
    image: '/img/logo.jpg',
    vendor: 'Workspace Solutions',
    inStock: false,
    discount: 16
  },
  {
    id: '6',
    name: 'Security Camera System',
    category: 'Security',
    price: 'SAR 1,250',
    rating: 4.7,
    reviews: 203,
    image: '/img/logo.jpg',
    vendor: 'SecureGuard Systems',
    inStock: true
  }
];

export default function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');

  const filteredProducts = SAMPLE_PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(SAMPLE_PRODUCTS.map(p => p.category)))];

  const handleAddToCart = (_productId: string) => {
    // Redirect to login if not authenticated
    window.location.href = '/login?redirect=/souq/catalog&action=add-to-cart';
  };

  const handleViewDetails = (productId: string) => {
    // Allow viewing details without login
    window.location.href = `/souq/catalog/${productId}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/souq" className="text-2xl font-bold text-[#00A859]">
                Fixzit Souq
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/souq/catalog" className="text-gray-600 hover:text-[#00A859]">Catalog</Link>
                <Link href="/souq/vendors" className="text-gray-600 hover:text-[#00A859]">Vendors</Link>
                <Link href="/souq/rfqs" className="text-gray-600 hover:text-[#00A859]">RFQs</Link>
                <Link href="/souq/orders" className="text-gray-600 hover:text-[#00A859]">Orders</Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#00A859]">
                <User className="w-4 h-4" />
                Sign In
              </Link>
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#00A859] text-white rounded-md hover:bg-[#00A859]/90">
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
                placeholder="Search products, categories, or vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A859] focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A859] focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A859] focus:border-transparent"
              >
                <option value="relevance">Relevance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{filteredProducts.length} results found</span>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>Filters applied</span>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative w-full h-48">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.isNew && (
                    <span className="bg-[var(--fixzit-primary-light)] text-white text-xs px-2 py-1 rounded">New</span>
                  )}
                  {product.discount && (
                    <span className="bg-[var(--fixzit-danger-light)] text-white text-xs px-2 py-1 rounded">
                      -{product.discount}%
                    </span>
                  )}
                </div>

                <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
                  <Heart className="w-4 h-4 text-gray-400 hover:text-[var(--fixzit-danger-light)]" />
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.category}</p>

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-[var(--fixzit-accent-lighter)]" />
                    <span className="text-sm font-medium">{product.rating}</span>
                  </div>
                  <span className="text-sm text-gray-500">({product.reviews})</span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-500 line-through">{product.originalPrice}</span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.inStock
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(product.id)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    disabled={!product.inStock}
                    className={`flex-1 px-3 py-2 rounded-md transition-colors text-sm ${
                      product.inStock
                        ? 'bg-[#00A859] text-white hover:bg-[#00A859]/90'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 inline mr-1" />
                    Add to Cart
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Sold by: {product.vendor}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or browse all categories</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Browse our catalog freely. Sign in to add to cart, place orders, and access exclusive deals.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

