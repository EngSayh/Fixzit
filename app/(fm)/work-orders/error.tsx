"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "@/components/ui/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { useTranslation } from "@/contexts/TranslationContext";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Module error caught", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">{t("error.somethingWentWrong", "Something went wrong")}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {error.message || t("error.unexpectedError", "An unexpected error occurred. Please try again.")}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default" aria-label={t("common.tryAgainAria", "Retry the failed operation")}>
          <RefreshCw className="w-4 h-4 me-2" />
          {t("common.tryAgain", "Try Again")}
        </Button>
        <Button asChild variant="outline" aria-label={t("common.goHomeAria", "Navigate to dashboard")}>
          <Link href="/dashboard">
            <Home className="w-4 h-4 me-2" />
            {t("common.goHome", "Go Home")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
