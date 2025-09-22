// app/marketplace/materials/page.tsx - Public materials browsing
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Package, Star, Truck, Shield, ShoppingCart, Filter } from 'lucide-react';

export default function PublicMaterialsPage() {
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    inStock: false
  });

  // Mock data - replace with API call
  const materials = [
    {
      id: '1',
      name: 'Portland Cement 50kg',
      category: 'Cement',
      brand: 'Saudi Cement',
      price: 25,
      currency: 'SAR',
      inStock: true,
      rating: 4.5,
      reviews: 120,
      image: '/placeholder-material.jpg',
      description: 'High-quality Portland cement suitable for all construction needs.',
      specifications: ['50kg bag', 'Type I/II', 'ASTM C150 compliant']
    },
    {
      id: '2',
      name: 'Steel Rebar 12mm',
      category: 'Steel',
      brand: 'SABIC',
      price: 8.50,
      currency: 'SAR',
      inStock: true,
      rating: 4.8,
      reviews: 85,
      image: '/placeholder-material.jpg',
      description: 'High-strength steel rebar for reinforced concrete construction.',
      specifications: ['12mm diameter', 'Grade 60', 'ASTM A615']
    },
    {
      id: '3',
      name: 'Ceramic Floor Tiles 60x60cm',
      category: 'Tiles',
      brand: 'RAK Ceramics',
      price: 45,
      currency: 'SAR',
      inStock: false,
      rating: 4.3,
      reviews: 200,
      image: '/placeholder-material.jpg',
      description: 'Premium ceramic floor tiles with excellent durability and finish.',
      specifications: ['60x60cm', 'Grade AA', 'Anti-slip surface']
    },
    {
      id: '4',
      name: 'HVAC Ductwork 150mm',
      category: 'HVAC',
      brand: 'Carrier',
      price: 120,
      currency: 'SAR',
      inStock: true,
      rating: 4.7,
      reviews: 65,
      image: '/placeholder-material.jpg',
      description: 'Professional HVAC ductwork for commercial and residential use.',
      specifications: ['150mm diameter', 'Galvanized steel', 'Insulated']
    }
  ];

  const categories = ['All', 'Cement', 'Steel', 'Tiles', 'HVAC', 'Electrical', 'Plumbing'];

  const filteredMaterials = materials.filter(material => {
    if (filters.category && filters.category !== 'All' && material.category !== filters.category) return false;
    if (filters.minPrice && material.price < parseInt(filters.minPrice)) return false;
    if (filters.maxPrice && material.price > parseInt(filters.maxPrice)) return false;
    if (filters.inStock && !material.inStock) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Browse Materials</h1>
              <p className="text-gray-600">Construction materials, equipment, and supplies</p>
            </div>
            <div className="text-sm text-gray-500">
              {filteredMaterials.length} materials found
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
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
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

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="inStock"
                    checked={filters.inStock}
                    onChange={(e) => setFilters({...filters, inStock: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="inStock" className="text-sm">In stock only</label>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-6 border mt-6">
              <h3 className="font-semibold mb-4">Need Help?</h3>
              <div className="space-y-3">
                <Link
                  href="/login?next=/marketplace/materials"
                  className="block w-full text-center px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90 transition-colors"
                >
                  Sign In to Buy
                </Link>
                <Link
                  href="/help"
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Get Help
                </Link>
              </div>
            </div>
          </div>

          {/* Materials Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.map((material) => (
                <div
                  key={material.id}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative">
                    <img
                      src={material.image}
                      alt={material.name}
                      className="w-full h-48 object-cover"
                    />
                    {!material.inStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="bg-red-500 text-white px-3 py-1 rounded text-sm">
                          Out of Stock
                        </span>
                      </div>
                    )}
                    <button className="absolute top-3 right-3 p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
                      <ShoppingCart className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {material.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">{material.rating}</span>
                        <span className="text-xs text-gray-500">({material.reviews})</span>
                      </div>
                    </div>

                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{material.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{material.brand}</p>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-2xl font-bold text-[#0061A8]">
                          {material.price.toLocaleString()}
                        </span>
                        <span className="text-gray-600 ml-1">SAR</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Truck className="h-4 w-4" />
                        <span>Delivery Available</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Shield className="h-4 w-4" />
                        <span>Verified Product</span>
                      </div>
                      <button
                        disabled={!material.inStock}
                        className={`px-4 py-2 rounded text-sm transition-colors ${
                          material.inStock
                            ? 'bg-[#00A859] text-white hover:bg-[#00A859]/90'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {material.inStock ? 'Add to Quote' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredMaterials.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
