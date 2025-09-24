'use client';

import { useState } from 'react';
import { useI18n } from '@/src/providers/RootProviders';
import { Plus, Upload, Download, Filter, Search, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';

type TabKey = 'catalog' | 'vendors' | 'rfqs' | 'orders';

export default function FMMarketplacePage() {
  const { t, language, isRTL } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>('catalog');
  const [searchQuery, setSearchQuery] = useState('');

  // Demo data
  const catalogItems = [
    { id: 1, name: 'AC Repair', category: 'HVAC', available: true },
    { id: 2, name: 'Plumbing Services', category: 'Plumbing', available: true },
    { id: 3, name: 'Cleaning Services', category: 'Janitorial', available: true },
    { id: 4, name: 'Electrical Work', category: 'Electrical', available: true },
    { id: 5, name: 'Painting Services', category: 'Maintenance', available: true },
    { id: 6, name: 'Elevator Maintenance', category: 'Equipment', available: true },
  ];

  const vendors = [
    { id: 1, name: 'CoolAir Co.', category: 'AC Repair', rating: 4.7, status: 'Active', contracts: 12 },
    { id: 2, name: 'Spark Electric', category: 'Electrical', rating: 4.4, status: 'Active', contracts: 8 },
    { id: 3, name: 'AquaFlow', category: 'Plumbing', rating: 4.1, status: 'Pending', contracts: 5 },
  ];

  const rfqs = [
    { id: 'RFQ-1024', title: 'Annual AC Maintenance', category: 'AC Repair', due: '2025-10-01', status: 'Open', bids: 3 },
    { id: 'RFQ-1025', title: 'Mall Cleaning Contract', category: 'Cleaning', due: '2025-10-10', status: 'Draft', bids: 0 },
    { id: 'RFQ-1026', title: 'Electrical System Upgrade', category: 'Electrical', due: '2025-10-15', status: 'Open', bids: 2 },
  ];

  const orders = [
    { id: 'PO-8812', vendor: 'CoolAir Co.', amount: 24000, date: '2025-09-12', status: 'Issued' },
    { id: 'PO-8813', vendor: 'Spark Electric', amount: 15500, date: '2025-09-14', status: 'Pending' },
    { id: 'PO-8814', vendor: 'AquaFlow', amount: 8200, date: '2025-09-15', status: 'Delivered' },
  ];

  const tabs = [
    { key: 'catalog' as TabKey, label: t('fm.tabs.catalog', 'Catalog') },
    { key: 'vendors' as TabKey, label: t('fm.tabs.vendors', 'Vendors') },
    { key: 'rfqs' as TabKey, label: t('fm.tabs.rfqs', 'RFQs & Bids') },
    { key: 'orders' as TabKey, label: t('fm.tabs.orders', 'Orders & POs') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar with Search and Actions */}
      <div className="bg-white border-b sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full sm:max-w-xl">
              <input
                type="search"
                placeholder={t('common.search', 'Search vendors, items, RFQs...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 ps-10 pe-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0061A8]/30"
              />
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>

            {/* Primary Actions */}
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#0061A8] text-white font-medium rounded-xl hover:bg-[#0061A8]/90 transition-colors">
                <Plus className="h-4 w-4" />
                {t('common.add', 'Add')}
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <Upload className="h-4 w-4" />
                {t('common.import', 'Import')}
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4" />
                {t('common.export', 'Export')}
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <Filter className="h-4 w-4" />
                {t('common.filter', 'Filter')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[#0061A8] text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Panels */}
        {activeTab === 'catalog' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t('fm.catalog.title', 'Service Catalog')}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalogItems.map((item) => (
                  <button
                    key={item.id}
                    className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-start"
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.category}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-start text-sm font-semibold text-gray-700">
                      {t('fm.vendors.name', 'Vendor')}
                    </th>
                    <th className="px-6 py-3 text-start text-sm font-semibold text-gray-700">
                      {t('fm.vendors.category', 'Category')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('fm.vendors.rating', 'Rating')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('fm.vendors.status', 'Status')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('fm.vendors.contracts', 'Contracts')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{vendor.name}</td>
                      <td className="px-6 py-4 text-gray-600">{vendor.category}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-yellow-500">★</span> {vendor.rating}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            vendor.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">{vendor.contracts}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="h-4 w-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {t('common.showing', 'Showing')} 1-3 {t('common.of', 'of')} 3 {t('common.results', 'results')}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border rounded hover:bg-gray-50">
                  {t('common.previous', 'Previous')}
                </button>
                <button className="px-3 py-1 bg-[#0061A8] text-white rounded">1</button>
                <button className="px-3 py-1 border rounded hover:bg-gray-50">
                  {t('common.next', 'Next')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rfqs' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-start text-sm font-semibold text-gray-700">
                      {t('fm.rfqs.id', 'RFQ #')}
                    </th>
                    <th className="px-6 py-3 text-start text-sm font-semibold text-gray-700">
                      {t('fm.rfqs.title', 'Title')}
                    </th>
                    <th className="px-6 py-3 text-start text-sm font-semibold text-gray-700">
                      {t('fm.rfqs.category', 'Category')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('fm.rfqs.due', 'Due Date')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('fm.rfqs.bids', 'Bids')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('fm.rfqs.status', 'Status')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rfqs.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{rfq.id}</td>
                      <td className="px-6 py-4">{rfq.title}</td>
                      <td className="px-6 py-4 text-gray-600">{rfq.category}</td>
                      <td className="px-6 py-4 text-center">{rfq.due}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {rfq.bids}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            rfq.status === 'Open'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {rfq.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="h-4 w-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-start text-sm font-semibold text-gray-700">
                      {t('fm.orders.id', 'PO #')}
                    </th>
                    <th className="px-6 py-3 text-start text-sm font-semibold text-gray-700">
                      {t('fm.orders.vendor', 'Vendor')}
                    </th>
                    <th className="px-6 py-3 text-end text-sm font-semibold text-gray-700">
                      {t('fm.orders.amount', 'Total (SAR)')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('fm.orders.date', 'Date')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('fm.orders.status', 'Status')}
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{order.id}</td>
                      <td className="px-6 py-4">{order.vendor}</td>
                      <td className="px-6 py-4 text-end">{order.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">{order.date}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            order.status === 'Delivered'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'Issued'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="h-4 w-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}