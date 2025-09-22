'use client';

import { useState } from 'react';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('catalog');

  const tabs = [
    { id: 'catalog', label: 'Catalog', description: 'Browse products and services' },
    { id: 'vendors', label: 'Vendors', description: 'Manage approved suppliers' },
    { id: 'rfqs', label: 'RFQs & Bids', description: 'Request for quotations' },
    { id: 'orders', label: 'Orders & POs', description: 'Purchase orders & tracking' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixzit Marketplace</h1>
          <p className="text-gray-600">Browse products, vendors, and manage procurement</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {tabs.find(tab => tab.id === activeTab)?.label}
          </h3>
          <p className="text-gray-600 mb-4">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Browse {tabs.find(tab => tab.id === activeTab)?.label}
          </button>
        </div>
      </div>
    </div>
  );
}