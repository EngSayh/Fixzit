"use client";

import { WifiOff } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOnlineStatus } from "@/components/common/OfflineIndicator";
import { cn } from "@/lib/utils";

type FormOfflineBannerProps = {
  formType?: string;
  hasUnsavedChanges?: boolean;
  draftSavingEnabled?: boolean;
  className?: string;
};

export function FormOfflineBanner({
  formType,
  hasUnsavedChanges = false,
  draftSavingEnabled = false,
  className,
}: FormOfflineBannerProps) {
  const { t } = useTranslation();
  const { isOnline } = useOnlineStatus();

  if (isOnline && !draftSavingEnabled) return null;

  const fallbackLabel = formType
    ? formType.replace(/[-_]+/g, " ")
    : t("forms.generic", "form");
  const formLabel = formType
    ? t(`forms.${formType}.label`, fallbackLabel)
    : fallbackLabel;

  const title = isOnline
    ? t("forms.draftSaved.title", "Draft saved locally")
    : t("forms.offline.title", "Offline mode");
  const description = isOnline
    ? t(
        "forms.draftSaved.description",
        "Your draft is stored locally while you work.",
      )
    : t(
        "forms.offline.description",
        "Changes to this {{form}} will be saved on this device and synced when you're back online.",
        { form: formLabel },
      );

  return (
    <Alert
      className={cn(
        isOnline
          ? "border-border bg-muted text-muted-foreground"
          : "border-warning/30 bg-warning/10 text-warning-foreground",
        className,
      )}
    >
      <AlertTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {!isOnline && <WifiOff className="h-4 w-4 text-warning" />}
        {title}
      </AlertTitle>
      <AlertDescription className="text-xs">
        {description}
        {!isOnline && hasUnsavedChanges
          ? ` ${t(
              "forms.offline.unsaved",
              "Unsaved changes stay available until you submit.",
            )}`
          : ""}
      </AlertDescription>
    </Alert>
  );
}

export function SubmitOfflineWarning({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-warning-foreground",
        className,
      )}
    >
      <WifiOff className="h-4 w-4 text-warning" />
      <span>
        {t(
          "forms.offline.submitWarning",
          "Offline: this submission will be queued for sync.",
        )}
      </span>
    </div>
  );
}
