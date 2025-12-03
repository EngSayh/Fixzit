"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { BrandLogo } from "@/components/brand";

/**
 * Root Error Boundary Component
 *
 * STRICT v4 COMPLIANCE:
 * - Uses semantic color tokens (text-destructive, bg-destructive/10)
 * - Supports RTL via TranslationContext
 * - Logs errors via centralized logger
 * - Provides recovery actions
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
// Configurable support contact for different environments (prod/staging/sandbox)
const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@fixzit.co";

/**
 * ErrorPage - Root App Router Error Boundary
 * Named ErrorPage to avoid shadowing the global Error constructor
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, isRTL } = useTranslation();
  const router = useRouter();

  // Deduplicate logging by using stable identifiers as dependencies
  // This prevents duplicate logs on re-renders with the same error
  useEffect(() => {
    const errorId = error.digest || error.message;
    logger.error("Application error caught by error boundary", {
      id: errorId,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      component: "app/error.tsx",
    });
  }, [error.digest, error.message, error.stack]);

  // Safe back navigation with fallback for empty history (deep links, first page)
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  return (
    <div
      className="min-h-screen bg-muted flex flex-col items-center justify-center px-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-md w-full text-center">
        {/* Brand Logo */}
        <div className="mb-6">
          <BrandLogo 
            size="lg" 
            alt="Fixzit" 
            fetchOrgLogo={false}
            data-testid="error-logo"
          />
        </div>
        
        {/* Error Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
        </div>

        {/* Error Content */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("errors.generic.title", "Something went wrong")}
          </h1>
          <p className="text-muted-foreground mb-4">
            {t(
              "errors.generic.message",
              "We apologize for the inconvenience. An unexpected error occurred."
            )}
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === "development" && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-start mb-4">
              <p className="text-sm font-mono text-destructive break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recovery Actions */}
        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="w-4 h-4 me-2" />
            {t("common.actions.tryAgain", "Try Again")}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4 me-2" />
            {t("common.actions.goBack", "Go Back")}
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/" className="block">
              <Home className="w-4 h-4 me-2" />
              {t("common.actions.goToHomepage", "Go to Homepage")}
            </Link>
          </Button>
        </div>

        {/* Support Link */}
        <div className="mt-8 text-sm text-muted-foreground">
          <p>
            {t("errors.generic.persistsText", "If this problem persists,")}{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="text-primary hover:underline"
            >
              {t("common.contactSupport", "contact support")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
