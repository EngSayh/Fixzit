import { ReactNode } from 'react';
import { OrgContextGate } from '@/components/fm/OrgContextGate';

interface HrTemplateProps {
  children: ReactNode;
}

/**
 * Applies the org guard to HR entry points outside /fm.
 */
export default function HrTemplate({ children }: HrTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
