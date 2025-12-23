"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { EmployeesList } from "@/components/hr/EmployeesList";

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "hr",
  });

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="hr" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("fm.org.supportContext", "Support context: {{name}}", {
            name: supportOrg.name,
          })}
        </div>
      )}

      <EmployeesList orgId={orgId} />
    </div>
  );
}
