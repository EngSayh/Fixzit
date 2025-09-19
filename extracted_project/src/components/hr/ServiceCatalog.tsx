'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Star, Clock, DollarSign, Tag, Users, Plus, Eye } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  priceType: string;
  unit?: string;
  rating: number;
  reviewsCount: number;
  features: string[];
  isActive: boolean;
  metadata?: {
    estimatedHours?: number;
    skillLevel?: string;
    serviceCode?: string;
  };
}

interface ServiceCatalogProps {
  orgId: string;
}

export default function ServiceCatalog({ orgId }: ServiceCatalogProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>({});
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [orgId, searchTerm, selectedCategory, currentPage]);

  const fetchServices = async () => {
    try {
      const params = new URLSearchParams({
        orgId,
        page: currentPage.toString(),
        limit: '12',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && { category: selectedCategory })
      });

      const response = await fetch(`/api/hr/services?${params}`);
      const data = await response.json();

      if (response.ok) {
        setServices(data.services);
        setCategories(data.categories);
        setSummary(data.summary);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedServices = async () => {
    if (!confirm('This will create 1,150+ services in your catalog. Continue?')) return;
    
    setSeeding(true);
    try {
      const response = await fetch('/api/hr/services/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`Successfully created ${data.totalServices} services!`);
        fetchServices();
      } else {
        alert(data.error || 'Failed to seed services');
      }
    } catch (error) {
      console.error('Error seeding services:', error);
      alert('Failed to seed services');
    } finally {
      setSeeding(false);
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getPriceDisplay = (service: Service) => {
    const price = `${service.basePrice.toLocaleString()} SAR`;
    return service.priceType === 'HOURLY' ? `${price}/hr` : price;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Service Catalog</h2>
            <p className="text-gray-600">Comprehensive service directory with 1,150+ services</p>
          </div>
          <div className="flex space-x-3">
            {summary.totalServices === 0 && (
              <button
                onClick={handleSeedServices}
                disabled={seeding}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {seeding ? 'Creating Services...' : 'Seed 1,150+ Services'}
              </button>
            )}
            <button className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#004d86] transition-colors">
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Service
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Tag className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Services</p>
                <p className="text-2xl font-bold text-blue-900">{summary.totalServices || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Active Services</p>
                <p className="text-2xl font-bold text-green-900">{summary.activeServices || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Star className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-600">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {summary.averageRating ? summary.averageRating.toFixed(1) : '0.0'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Filter className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Categories</p>
                <p className="text-2xl font-bold text-purple-900">{categories.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search services..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <div key={service.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{service.description}</p>
                  <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    {service.category}
                  </span>
                </div>
                <div className="ml-4">
                  <span className={`inline-block w-3 h-3 rounded-full ${
                    service.isActive ? 'bg-green-400' : 'bg-red-400'
                  }`}></span>
                </div>
              </div>

              {/* Service Code */}
              {service.metadata?.serviceCode && (
                <div className="text-xs text-gray-500 mb-3">
                  Code: {service.metadata.serviceCode}
                </div>
              )}

              {/* Pricing */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-lg font-bold text-gray-900">
                      {getPriceDisplay(service)}
                    </span>
                  </div>
                  {service.metadata?.estimatedHours && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      {service.metadata.estimatedHours}h
                    </div>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="flex">{renderStars(service.rating)}</div>
                  <span className="text-sm text-gray-600 ml-2">
                    ({service.reviewsCount} reviews)
                  </span>
                </div>
                {service.metadata?.skillLevel && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {service.metadata.skillLevel}
                  </span>
                )}
              </div>

              {/* Features */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {service.features.slice(0, 3).map((feature, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {feature}
                    </span>
                  ))}
                  {service.features.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{service.features.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors">
                  <Eye className="w-4 h-4 mr-1 inline" />
                  View Details
                </button>
                <button className="flex-1 bg-[#0061A8] text-white py-2 px-3 rounded text-sm hover:bg-[#004d86] transition-colors">
                  <Plus className="w-4 h-4 mr-1 inline" />
                  Assign
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {services.length === 0 && !loading && (
        <div className="text-center py-12">
          <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-500 mb-4">
            {summary.totalServices === 0
              ? 'Get started by seeding your service catalog with 1,150+ professional services.'
              : 'Try adjusting your search filters to find relevant services.'
            }
          </p>
          {summary.totalServices === 0 && (
            <button
              onClick={handleSeedServices}
              disabled={seeding}
              className="bg-[#0061A8] text-white px-6 py-2 rounded-lg hover:bg-[#004d86] disabled:opacity-50 transition-colors"
            >
              {seeding ? 'Creating Services...' : 'Seed Service Catalog'}
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} services
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm bg-[#0061A8] text-white rounded">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
                className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}