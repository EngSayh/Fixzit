"use client";

import { useTranslation } from "@/contexts/TranslationContext";

/**
 * Page component that displays a "Properties" heading and a short description.
 *
 * Renders a top-level container with a bold heading and a muted paragraph guiding users
 * to browse and manage properties and referencing the Aqar module for public discovery.
 *
 * @returns The component's JSX element.
 */
export default function Page() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h1 className="text-[24px] font-bold text-[var(--color-text-primary)]">
        {t("properties.title", "Properties")}
      </h1>
      <p className="text-[13px] text-[var(--color-text-secondary)]">
        {t(
          "properties.description",
          "Browse and manage properties. Use Aqar module for public discovery.",
        )}
      </p>
    </div>
  );
}
