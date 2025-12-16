import { ReactNode } from "react";
import { OrgContextGate } from "@/components/fm/OrgContextGate";

interface FmTemplateProps {
  children: ReactNode;
}

/**
 * Template that enforces organization context for all FM routes.
 * Prevents rendering FM modules without a selected organization to avoid cross-tenant data exposure.
 */
export default function FmTemplate({ children }: FmTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
