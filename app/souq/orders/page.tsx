'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/src/providers/RootProviders';
import { Package, Plus, Calendar, Truck, FileText, Download, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react';

// Mock order data
const MOCK_ORDERS = [
  {
    id: 'PO-2024-0892',
    vendorName: 'ABC Electrical Supplies',
    createdDate: '2024-12-15',
    deliveryDate: '2024-12-28',
    status: 'processing',
    items: 12,
    total: 45780,
    paymentStatus: 'pending',
    trackingNumber: null
  },
  {
    id: 'PO-2024-0891',
    vendorName: 'SafeGuard PPE Solutions',
    createdDate: '2024-12-14',
    deliveryDate: '2024-12-20',
    status: 'shipped',
    items: 25,
    total: 18500,
    paymentStatus: 'paid',
    trackingNumber: 'TRK-123456789'
  },
  {
    id: 'PO-2024-0890',
    vendorName: 'BuildMaster Tools',
    createdDate: '2024-12-10',
    deliveryDate: '2024-12-18',
    status: 'delivered',
    items: 8,
    total: 125000,
    paymentStatus: 'paid',
    trackingNumber: 'TRK-987654321'
  },
  {
    id: 'PO-2024-0889',
    vendorName: 'ProPaint Industries',
    createdDate: '2024-12-08',
    deliveryDate: '2024-12-15',
    status: 'cancelled',
    items: 15,
    total: 32400,
    paymentStatus: 'refunded',
    trackingNumber: null
  }
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: AlertCircle }
};

const PAYMENT_STATUS = {
  pending: { label: 'Payment Pending', color: 'text-yellow-600' },
  paid: { label: 'Paid', color: 'text-green-600' },
  refunded: { label: 'Refunded', color: 'text-gray-600' }
};

export default function OrdersPage() {
  const { t, language, isRTL } = useI18n();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'shipped' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter orders based on tab and search
  const filteredOrders = MOCK_ORDERS.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'pending') return matchesSearch && order.status === 'processing';
    if (activeTab === 'shipped') return matchesSearch && order.status === 'shipped';
    if (activeTab === 'delivered') return matchesSearch && order.status === 'delivered';
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('marketplace.orders', 'Orders & Purchase Orders')}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('marketplace.ordersDescription', 'Track and manage your purchase orders')}
              </p>
            </div>
            
            <Link
              href="/souq/orders/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004d87] transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('marketplace.createOrder', 'Create Order')}
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('common.all', 'All Orders')}
                <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                  {MOCK_ORDERS.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('marketplace.processing', 'Processing')}
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {MOCK_ORDERS.filter(o => o.status === 'processing').length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('shipped')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'shipped'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('marketplace.shipped', 'Shipped')}
                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                  {MOCK_ORDERS.filter(o => o.status === 'shipped').length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('delivered')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'delivered'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('marketplace.delivered', 'Delivered')}
                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  {MOCK_ORDERS.filter(o => o.status === 'delivered').length}
                </span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = (STATUS_CONFIG as any)[order.status]?.icon || (()=>null);
            
            return (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Order Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.id}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${(STATUS_CONFIG as any)[order.status]?.color || ''}`}>
                          <StatusIcon className="w-3 h-3" />
                          {(STATUS_CONFIG as any)[order.status]?.label || order.status}
                        </span>
                        <span className={`text-sm font-medium ${(PAYMENT_STATUS as any)[order.paymentStatus]?.color || ''}`}>
                          {(PAYMENT_STATUS as any)[order.paymentStatus]?.label || order.paymentStatus}
                        </span>
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">{t('marketplace.vendor', 'Vendor')}</p>
                          <p className="font-medium text-gray-900">{order.vendorName}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t('marketplace.orderDate', 'Order Date')}</p>
                          <p className="font-medium text-gray-900">
                            {new Date(order.createdDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t('marketplace.deliveryDate', 'Delivery Date')}</p>
                          <p className="font-medium text-gray-900">
                            {new Date(order.deliveryDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t('marketplace.orderTotal', 'Order Total')}</p>
                          <p className="font-medium text-gray-900">
                            {order.total.toLocaleString()} SAR
                          </p>
                        </div>
                      </div>

                      {/* Tracking Info */}
                      {order.trackingNumber && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <Truck className="inline w-4 h-4 mr-1" />
                            {t('marketplace.tracking', 'Tracking')}: 
                            <span className="font-medium ml-1">{order.trackingNumber}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/souq/orders/${order.id}`}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-[#0061A8] hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        {t('common.view', 'View')}
                      </Link>
                      <button className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                        {t('common.download', 'Download')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Footer */}
                <div className="bg-gray-50 px-6 py-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {order.items} {t('common.items', 'items')}
                    </span>
                    {order.status === 'delivered' && (
                      <button className="text-[#0061A8] hover:text-[#004d87] font-medium">
                        {t('marketplace.reorder', 'Reorder')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t('marketplace.noOrders', 'No orders found')}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('marketplace.noOrdersDescription', 'Start by creating a new purchase order.')}
            </p>
            <div className="mt-6">
              <Link
                href="/souq/orders/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004d87] transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('marketplace.createOrder', 'Create Order')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('marketplace.orderSummary', 'Order Summary')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-[#0061A8]">12</div>
              <div className="text-sm text-gray-600">{t('marketplace.totalOrders', 'Total Orders')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00A859]">8</div>
              <div className="text-sm text-gray-600">{t('marketplace.completedOrders', 'Completed')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#FFB400]">3</div>
              <div className="text-sm text-gray-600">{t('marketplace.inTransit', 'In Transit')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-700">221,680</div>
              <div className="text-sm text-gray-600">{t('marketplace.totalSpent', 'Total Spent (SAR)')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
