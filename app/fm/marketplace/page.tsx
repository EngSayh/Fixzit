import dynamic from 'next/dynamic';

const CatalogView = dynamic(() => import('@/src/components/marketplace/CatalogView'), { ssr: false });

export default function MarketplacePage() {
  return (
    <CatalogView
      title="Marketplace Catalog"
      subtitle="Sourcing-ready catalog aligned with tenant approvals and procurement controls"
      context="fm"
    />
  );
}

