'use client';

import ModuleViewTabs, { useModuleView } from '@/components/fm/ModuleViewTabs';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

export default function MarketplacePage() {
  const auto = useAutoTranslator('fm.marketplace');
  const { currentView } = useModuleView('marketplace');
  const sections: Record<string, { label: string; description: string }> = {
    catalog: {
      label: auto('Catalog', 'sections.catalog.label'),
      description: auto('Browse products and services', 'sections.catalog.description'),
    },
    vendors: {
      label: auto('Vendors', 'sections.vendors.label'),
      description: auto('Manage approved suppliers', 'sections.vendors.description'),
    },
    procurement: {
      label: auto('Procurement', 'sections.procurement.label'),
      description: auto('Create purchase requests and compare bids', 'sections.procurement.description'),
    },
    rfqs: {
      label: auto('RFQs & Bids', 'sections.rfqs.label'),
      description: auto('Request and evaluate vendor quotations', 'sections.rfqs.description'),
    },
  };
  const activeKey = currentView?.value ?? 'catalog';
  const activeSection = sections[activeKey] ?? sections.catalog;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Fixzit Marketplace', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Browse products, vendors, and manage procurement', 'header.subtitle')}
          </p>
        </div>
      </div>

      <ModuleViewTabs moduleId="marketplace" />

      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">{activeSection.label}</h3>
          <p className="text-muted-foreground mb-4">{activeSection.description}</p>
          <button className="px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors">
            {auto('Browse {{section}}', 'actions.browseSection').replace('{{section}}', activeSection.label)}
          </button>
        </div>
      </div>
    </div>
  );
}
