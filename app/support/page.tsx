"use client";

import { useTranslation } from "@/contexts/TranslationContext";

export default function Page() {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">{t("support.title", "Support")}</h1>
      <p>
        {t("support.description", "Coming online – UI wired, API scaffolded.")}
      </p>
    </div>
  );
}
