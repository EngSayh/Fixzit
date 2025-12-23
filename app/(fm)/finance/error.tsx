"use client";

import { useEffect } from "react";
import { RefreshCw, Home, DollarSign } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Config } from "@/lib/config/constants";

/**
 * Finance Error Boundary
 *
 * STRICT v4 COMPLIANCE:
 * - Uses semantic color tokens
 * - Supports RTL via TranslationContext
 * - Logs errors via centralized logger
 */
export default function FinanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    logger.error("Finance error caught by error boundary", {
      error: error.message,
      digest: error.digest,
      stack: error.stack,
      component: "app/finance/error.tsx",
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
            <DollarSign className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">
          {t("errors.finance.title", "Finance Module Error")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t(
            "errors.finance.message",
            "There was a problem loading the finance module. Please try again."
          )}
        </p>

        {Config.env.isDevelopment && (
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

          <Link href="/dashboard">
            <Button variant="outline">
              <Home className="w-4 h-4 me-2" />
              {t("common.actions.goToDashboard", "Dashboard")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
