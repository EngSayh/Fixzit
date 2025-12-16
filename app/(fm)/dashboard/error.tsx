"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Dashboard Error Boundary
 *
 * STRICT v4 COMPLIANCE:
 * - Uses semantic color tokens
 * - Supports RTL via TranslationContext
 * - Logs errors via centralized logger
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    logger.error("Dashboard error caught by error boundary", {
      error: error.message,
      digest: error.digest,
      stack: error.stack,
      component: "app/dashboard/error.tsx",
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
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">
          {t("errors.dashboard.title", "Dashboard Error")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t(
            "errors.dashboard.message",
            "There was a problem loading the dashboard. Please try again."
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

          <Link href="/">
            <Button variant="outline">
              <Home className="w-4 h-4 me-2" />
              {t("common.actions.goToHomepage", "Home")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
