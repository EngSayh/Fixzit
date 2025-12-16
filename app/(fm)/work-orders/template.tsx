import { ReactNode } from "react";
import { OrgContextGate } from "@/components/fm/OrgContextGate";

interface WorkOrdersTemplateProps {
  children: ReactNode;
}

/**
 * Template that blocks work-orders routes until an organization context is active.
 * Prevents legacy work-orders entry points from bypassing the FM guard.
 */
export default function WorkOrdersTemplate({
  children,
}: WorkOrdersTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
