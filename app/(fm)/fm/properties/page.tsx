"use client";

import { useSession } from "next-auth/react";
import { CardGridSkeleton } from "@/components/skeletons";
import { useTranslation } from "@/contexts/TranslationContext";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { FmPropertiesList } from "@/components/fm/properties";

/**
 * FM Properties Page - Centralized using FmPropertiesList component
 * 
 * Previously 849 lines of inline code, now using centralized:
 * - DataTableStandard for data display
 * - TableToolbar for search/filter controls
 * - TableFilterDrawer for filter panel
 * - ActiveFiltersChips for filter visualization
 * 
 * [AGENT-001-A] Migration to centralized table components per UI_UX_ENHANCEMENT_BLUEPRINT_V1.md
 */
export default function PropertiesPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "properties",
  });

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="properties" />
      
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("fm.properties.support.activeOrg", "Support context: {{name}}", {
            name: supportOrg.name,
          })}
        </div>
      )}

      <FmPropertiesList orgId={orgId} />
    </div>
  );
}
