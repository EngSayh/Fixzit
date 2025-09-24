import dynamic from 'next/dynamic';

const CatalogView = dynamic(() => import('@/src/components/marketplace/CatalogView'), { ssr: false });

export default function MarketplacePage() {
  return <CatalogView />;
}