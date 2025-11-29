"use client";

import { useEffect } from "react";
import { RefreshCw, Home, Store } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Souq Error Boundary
 *
 * STRICT v4 COMPLIANCE:
 * - Uses semantic color tokens
 * - Supports RTL via TranslationContext
 * - Logs errors via centralized logger
 */
export default function SouqError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    logger.error("Souq error caught by error boundary", {
      error: error.message,
      digest: error.digest,
      stack: error.stack,
      component: "app/souq/error.tsx",
    });
  }, [error]);

  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center px-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <Store className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">
          {t("errors.souq.title", "Souq Error")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t(
            "errors.souq.message",
            "There was a problem loading Souq. Please try again."
          )}
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-start mb-6">
            <p className="text-sm font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <RefreshCw className="w-4 h-4 me-2" />
            {t("common.actions.tryAgain", "Try Again")}
          </Button>

          <Button asChild variant="outline">
            <Link href="/dashboard">
              <Home className="w-4 h-4 me-2" />
              {t("common.actions.goToDashboard", "Dashboard")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
