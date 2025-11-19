import { ReactNode } from 'react';
import { OrgContextGate } from '@/components/fm/OrgContextGate';

interface AdminTemplateProps {
  children: ReactNode;
}

/**
 * Template to enforce organization selection for legacy /admin routes.
 * These pages reuse FM admin surfaces and must not load without tenant context.
 */
export default function AdminTemplate({ children }: AdminTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
