import { ReactNode } from 'react';
import { OrgContextGate } from '@/components/fm/OrgContextGate';

interface MarketplaceListingsTemplateProps {
  children: ReactNode;
}

/**
 * Extends the org guard to internal marketplace listing tools.
 */
export default function MarketplaceListingsTemplate({ children }: MarketplaceListingsTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
