import { ReactNode } from "react";
import { OrgContextGate } from "@/components/fm/OrgContextGate";

interface PropertiesTemplateProps {
  children: ReactNode;
}

/**
 * Extends the org guard to legacy /properties entry points.
 */
export default function PropertiesTemplate({
  children,
}: PropertiesTemplateProps) {
  return <OrgContextGate>{children}</OrgContextGate>;
}
