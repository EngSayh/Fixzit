'use client';

import ModuleViewTabs, { useModuleView } from '@/components/fm/ModuleViewTabs';

const sectionDetails: Record<string, { label: string; description: string }> = {
  catalog: { label: 'Catalog', description: 'Browse products and services' },
  vendors: { label: 'Vendors', description: 'Manage approved suppliers' },
  procurement: { label: 'Procurement', description: 'Create purchase requests and compare bids' },
  rfqs: { label: 'RFQs & Bids', description: 'Request and evaluate vendor quotations' },
};

export default function MarketplacePage() {
  const { currentView } = useModuleView('marketplace');
  const activeKey = currentView?.value ?? 'catalog';
  const activeSection = sectionDetails[activeKey] ?? sectionDetails.catalog;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fixzit Marketplace</h1>
          <p className="text-muted-foreground">Browse products, vendors, and manage procurement</p>
        </div>
      </div>

      <ModuleViewTabs moduleId="marketplace" />

      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">{activeSection.label}</h3>
          <p className="text-muted-foreground mb-4">{activeSection.description}</p>
          <button className="px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors">
            Browse {activeSection.label}
          </button>
        </div>
      </div>
    </div>
  );
}
