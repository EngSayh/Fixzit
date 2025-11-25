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
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">
        {t("properties.title", "Properties")}
      </h1>
      <p className="text-muted-foreground">
        {t(
          "properties.description",
          "Browse and manage properties. Use Aqar module for public discovery.",
        )}
      </p>
    </div>
  );
}
