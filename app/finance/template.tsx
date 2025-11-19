import { ReactNode } from 'react';
import { OrgContextGate } from '@/components/fm/OrgContextGate';

interface FinanceTemplateProps {
  children: ReactNode;
}

/**
 * Ensures that finance routes (legacy aliases to FM finance) obey the org guard.
 */
export default function FinanceTemplate({ children }: FinanceTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
