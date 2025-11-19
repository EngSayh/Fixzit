import { ReactNode } from 'react';
import { OrgContextGate } from '@/components/fm/OrgContextGate';

interface SupportTemplateProps {
  children: ReactNode;
}

/**
 * Applies the org guard to support center routes that alias FM Support.
 */
export default function SupportTemplate({ children }: SupportTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
