"use client";

import { useTranslation } from "@/contexts/TranslationContext";

export default function Page() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h1 className="text-[24px] font-bold text-[var(--color-text-primary)]">
        {t("compliance.title", "Compliance & Legal")}
      </h1>
      <p className="text-[13px] text-[var(--color-text-secondary)]">
        {t(
          "compliance.description",
          "Coming online – policies, inspections, contracts, audit logs.",
        )}
      </p>
    </div>
  );
}
