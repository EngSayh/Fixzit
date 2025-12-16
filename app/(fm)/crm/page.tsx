"use client";

import { useTranslation } from "@/contexts/TranslationContext";

export default function Page() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h1 className="text-[24px] font-bold text-[var(--color-text-primary)]">
        {t("crm.title", "CRM")}
      </h1>
      <p className="text-[13px] text-[var(--color-text-secondary)]">
        {t("crm.description", "Coming online – UI wired, API scaffolded.")}
      </p>
    </div>
  );
}
