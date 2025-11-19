import { ReactNode } from 'react';
import { OrgContextGate } from '@/components/fm/OrgContextGate';

interface MarketplaceVendorsTemplateProps {
  children: ReactNode;
}

/**
 * Applies the org guard to marketplace vendor management pages.
 */
export default function MarketplaceVendorsTemplate({ children }: MarketplaceVendorsTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
