"use client";

import React from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

export default function HRPage() {
  const auto = useAutoTranslator("fm.hr");
  const { t } = useTranslation();
  const { hasOrgContext, guard, supportOrg } = useFmOrgGuard({
    moduleId: "hr",
  });

  if (!hasOrgContext) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto("Human Resources", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto("Employee management and HR operations", "header.subtitle")}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {auto("HR Management", "card.title")}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto("Human resources interface loads here.", "card.description")}
        </p>
        <p className="text-sm text-muted-foreground">
          {auto("Connected to HR API endpoints.", "card.footer")}
        </p>
      </div>
    </div>
  );
}
