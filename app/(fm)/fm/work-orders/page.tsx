"use client";

import React from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { WorkOrdersView } from "@/components/fm/WorkOrdersView";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { WORK_ORDERS_MODULE_ID } from "@/config/navigation/constants";

export default function WorkOrdersPage() {
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: WORK_ORDERS_MODULE_ID,
  });

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6 p-6">
      <ModuleViewTabs moduleId={WORK_ORDERS_MODULE_ID} />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("fm.org.supportContext", "Support context: {{name}}", {
            name: supportOrg.name,
          })}
        </div>
      )}
      <WorkOrdersView orgId={orgId} />
    </div>
  );
}
