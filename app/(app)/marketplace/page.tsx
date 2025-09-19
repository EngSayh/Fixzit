"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, Package, FileText, ShoppingCart, Users, TrendingUp,
  Search, Filter, Plus, Star, MapPin, Clock, DollarSign,
  Grid3x3, List, Tag, Eye, AlertCircle, CheckCircle, XCircle,
  Calendar, Truck, Download, MessageSquare, AlertTriangle,
  Phone, Mail, Globe, Loader2
} from "lucide-react";

// Tab configuration
const MARKETPLACE_TABS = [
  { id: 'overview', name: 'Overview', icon: TrendingUp, description: 'Marketplace dashboard' },
  { id: 'products', name: 'Products', icon: Package, description: 'Browse products' },
  { id: 'vendors', name: 'Vendors', icon: Building2, description: 'Vendor management' },
  { id: 'rfqs', name: 'RFQs', icon: FileText, description: 'Request for quotes' },
  { id: 'orders', name: 'Orders', icon: ShoppingCart, description: 'Order management' }
];

// Consolidated interfaces
interface MarketplaceStats {
  totalVendors: number;
  activeProducts: number;
  openRFQs: number;
  monthlyOrders: number;
  totalRevenue: number;
  averageRating: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  priceUnit: string;
  quantity: number;
  images: Array<{ url: string; isPrimary: boolean }>;
  vendor: {
    id: string;
    businessName: string;
    city?: string;
    totalRating: number;
    ratingCount: number;
  };
  category: { name: string };
  isActive: boolean;
}

interface Vendor {
  id: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  city?: string;
  state?: string;
  verificationStatus: string;
  totalRating: number;
  ratingCount: number;
  completedOrders: number;
  specializations: string[];
}

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  description: string;
  priority: string;
  budget?: number;
  deadline: string;
  status: string;
  bidCount: number;
  customer: { name: string; company?: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  paymentStatus: string;
  customer: { name: string; company?: string };
  vendor: { businessName: string };
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<MarketplaceStats>({
    totalVendors: 0,
    activeProducts: 0,
    openRFQs: 0,
    monthlyOrders: 0,
    totalRevenue: 0,
    averageRating: 0
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'overview':
          const statsRes = await fetch('/api/marketplace/stats');
          if (statsRes.ok) setStats(await statsRes.json());
          break;
        case 'products':
          const productsRes = await fetch('/api/marketplace/products');
          if (productsRes.ok) setProducts(await productsRes.json());
          break;
        case 'vendors':
          const vendorsRes = await fetch('/api/marketplace/vendors');
          if (vendorsRes.ok) setVendors(await vendorsRes.json());
          break;
        case 'rfqs':
          const rfqsRes = await fetch('/api/marketplace/rfqs');
          if (rfqsRes.ok) setRFQs(await rfqsRes.json());
          break;
        case 'orders':
          const ordersRes = await fetch('/api/marketplace/orders');
          if (ordersRes.ok) setOrders(await ordersRes.json());
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Overview Tab Component
  const OverviewTab = () => {
    const quickActions = [
      {
        title: "Register as Vendor",
        description: "Join our marketplace",
        icon: Building2,
        href: "#",
        color: "bg-blue-500 hover:bg-blue-600"
      },
      {
        title: "Browse Products",
        description: "Explore catalog",
        icon: Package,
        href: "#",
        color: "bg-green-500 hover:bg-green-600"
      },
      {
        title: "Submit RFQ",
        description: "Request quotes",
        icon: FileText,
        href: "#",
        color: "bg-orange-500 hover:bg-orange-600"
      },
      {
        title: "View Orders",
        description: "Track purchases",
        icon: ShoppingCart,
        href: "#",
        color: "bg-purple-500 hover:bg-purple-600"
      }
    ];

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalVendors}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeProducts}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open RFQs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.openRFQs}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.monthlyOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageRating.toFixed(1)}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={`${action.color} text-white rounded-lg p-6 text-left transition-colors`}
              >
                <action.icon className="h-8 w-8 mb-3" />
                <h4 className="font-semibold">{action.title}</h4>
                <p className="text-sm opacity-90">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Products Tab Component
  const ProductsTab = () => {
    const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-[#0061A8]"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="h-4 w-4 inline mr-2" />
              Filters
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
            </button>
            <button className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86]">
              <Plus className="h-4 w-4 inline mr-2" />
              Add Product
            </button>
          </div>
        </div>

        {/* Products Grid/List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-200">
                  {product.images[0] && (
                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{product.vendor.businessName}</p>
                  <div className="flex items-center mt-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">
                      {product.vendor.totalRating.toFixed(1)} ({product.vendor.ratingCount})
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-lg font-bold text-[#0061A8]">
                      ${product.price}/{product.priceUnit}
                    </span>
                    <button className="text-sm text-blue-600 hover:text-blue-800">View Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.vendor.businessName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.category.name}</td>
                    <td className="px-6 py-4 text-sm font-medium">${product.price}/{product.priceUnit}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.quantity > 0 ? `${product.quantity} units` : 'Out of stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1">{product.vendor.totalRating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-[#0061A8] hover:text-[#004c86] mr-3">View</button>
                      <button className="text-gray-600 hover:text-gray-900">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Vendors Tab Component
  const VendorsTab = () => {
    const filteredVendors = vendors.filter(v => 
      v.businessName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-[#0061A8]"
            />
          </div>
          <button className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86]">
            <Plus className="h-4 w-4 inline mr-2" />
            Register Vendor
          </button>
        </div>

        {/* Vendors Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => (
              <div key={vendor.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{vendor.businessName}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {vendor.city}, {vendor.state}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    vendor.verificationStatus === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {vendor.verificationStatus === 'verified' && <CheckCircle className="h-3 w-3 inline mr-1" />}
                    {vendor.verificationStatus}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span>{vendor.totalRating.toFixed(1)} ({vendor.ratingCount} reviews)</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Package className="h-4 w-4 mr-1" />
                    <span>{vendor.completedOrders} completed orders</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-1" />
                    <span>{vendor.contactPhone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Specializations:</p>
                  <div className="flex flex-wrap gap-1">
                    {vendor.specializations.slice(0, 3).map((spec, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-[#0061A8] text-white text-sm rounded-lg hover:bg-[#004c86]">
                    View Profile
                  </button>
                  <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                    Contact
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // RFQs Tab Component
  const RFQsTab = () => {
    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search RFQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-[#0061A8]"
            />
          </div>
          <button className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86]">
            <Plus className="h-4 w-4 inline mr-2" />
            Create RFQ
          </button>
        </div>

        {/* RFQs Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFQ Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bids</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{rfq.rfqNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{rfq.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>
                        <div>{rfq.customer.name}</div>
                        {rfq.customer.company && (
                          <div className="text-xs text-gray-500">{rfq.customer.company}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {rfq.budget ? `$${rfq.budget.toLocaleString()}` : 'Open'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(rfq.deadline).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {rfq.bidCount} bids
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rfq.status === 'open' ? 'bg-green-100 text-green-800' :
                        rfq.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rfq.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-[#0061A8] hover:text-[#004c86] mr-3">View</button>
                      <button className="text-gray-600 hover:text-gray-900">Bid</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Orders Tab Component
  const OrdersTab = () => {
    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-[#0061A8]"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4 inline mr-2" />
            Export
          </button>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>
                        <div>{order.customer.name}</div>
                        {order.customer.company && (
                          <div className="text-xs text-gray-500">{order.customer.company}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.vendor.businessName}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      ${order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-[#0061A8] hover:text-[#004c86] mr-3">View</button>
                      <button className="text-gray-600 hover:text-gray-900">Track</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
              <p className="text-gray-600">Manage vendors, products, RFQs and orders</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {MARKETPLACE_TABS.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#0061A8] text-[#0061A8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 mr-2 ${
                    activeTab === tab.id ? 'text-[#0061A8]' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-400 font-normal">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'vendors' && <VendorsTab />}
        {activeTab === 'rfqs' && <RFQsTab />}
        {activeTab === 'orders' && <OrdersTab />}
      </div>
    </div>
  );
}