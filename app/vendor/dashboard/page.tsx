'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingUp, Clock, Star } from 'lucide-react';

export default function VendorDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    revenue: 0,
    rating: 0
  });
  
  const [products, setProducts] = useState<Array<{
    id: number;
    title: string;
    stock: number;
    price: number;
    sold: number;
  }>>([]);
  const [orders, setOrders] = useState<Array<{
    id: string;
    customer: string;
    total: number;
    status: string;
  }>>([]);
  
  useEffect(() => {
    // Fetch vendor stats
    fetchVendorData();
  }, []);
  
  const fetchVendorData = async () => {
    // Mock data - replace with API calls
    setStats({
      totalProducts: 24,
      totalOrders: 156,
      revenue: 45780.50,
      rating: 4.7
    });
    
    setProducts([
      { id: 1, title: 'AC Filter 24x24', stock: 150, price: 89.99, sold: 45 },
      { id: 2, title: 'PVC Pipe 2 inch', stock: 500, price: 45.50, sold: 120 }
    ]);
    
    setOrders([
      { id: 'ORD-001', customer: 'Acme Corp', total: 1250.00, status: 'Processing' },
      { id: 'ORD-002', customer: 'Tech Solutions', total: 3400.00, status: 'Shipped' }
    ]);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Vendor Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-fixzit-blue" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <Clock className="h-8 w-8 text-fixzit-green" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold">SAR {stats.revenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-fixzit-yellow" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="text-2xl font-bold">{stats.rating}/5.0</p>
              </div>
              <Star className="h-8 w-8 text-yellow-400 fill-current" />
            </div>
          </div>
        </div>
        
        {/* Products Table */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">My Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">{product.title}</td>
                    <td className="px-6 py-4">{product.stock}</td>
                    <td className="px-6 py-4">SAR {product.price}</td>
                    <td className="px-6 py-4">{product.sold}</td>
                    <td className="px-6 py-4">
                      <button className="text-fixzit-blue hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4">{order.id}</td>
                    <td className="px-6 py-4">{order.customer}</td>
                    <td className="px-6 py-4">SAR {order.total.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === 'Shipped' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
