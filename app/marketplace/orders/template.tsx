import { ReactNode } from 'react';
import { OrgContextGate } from '@/components/fm/OrgContextGate';

interface MarketplaceOrdersTemplateProps {
  children: ReactNode;
}

/**
 * Protects marketplace order management routes with the org guard.
 */
export default function MarketplaceOrdersTemplate({ children }: MarketplaceOrdersTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
