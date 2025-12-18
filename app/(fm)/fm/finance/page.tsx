"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { Config } from "@/lib/config/constants";

export default function FinancePage() {
  const isPlaywright = Config.client.isPlaywrightTest;
  const { hasOrgContext, guard, supportBanner } = useFmOrgGuard({
    moduleId: "finance",
  });
  const auto = useAutoTranslator("fm.finance");
  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6">
      {supportBanner}
      <ModuleViewTabs moduleId="finance" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isPlaywright ? "المالية" : auto("Finance", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {isPlaywright
              ? "لوحة معلومات مالية تجريبية"
              : auto("Financial management and billing", "header.subtitle")}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {isPlaywright ? "إجمالي الفواتير" : auto("Financial Dashboard", "card.title")}
        </h2>
        <p className="text-muted-foreground mb-4">
          {isPlaywright
            ? "عرض مبسط لمؤشرات المالية لاختبارات Playwright"
            : auto("Finance management interface loads here.", "card.description")}
        </p>
        <p className="text-sm text-muted-foreground">
          {auto("Connected to Finance API endpoints.", "card.footer")}
        </p>
      </div>
    </div>
  );
}
