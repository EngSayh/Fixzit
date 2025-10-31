'use client';

import React, { useState } from 'react';

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
          <h1 className="text-2xl font-bold text-foreground">Fixzit Marketplace</h1>
          <p className="text-muted-foreground">Browse products, vendors, and manage procurement</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">
            {tabs.find(tab => tab.id === activeTab)?.label}
          </h3>
          <p className="text-muted-foreground mb-4">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
          <button className="px-4 py-2 bg-[var(--fixzit-primary)] text-white rounded-2xl hover:bg-[var(--fixzit-primary-dark)] transition-colors">
            Browse {tabs.find(tab => tab.id === activeTab)?.label}
          </button>
        </div>
      </div>
    </div>
  );
}

