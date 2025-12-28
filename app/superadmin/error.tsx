"use client";

/**
 * Superadmin Error Boundary
 * Catches React errors in the superadmin section and displays a user-friendly error page.
 * This prevents the entire page from going blank when a client-side error occurs.
 *
 * @module app/superadmin/error
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SuperadminError({ error, reset }: ErrorProps) {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    // Log the error to console for debugging
    // eslint-disable-next-line no-console -- Error boundary logging
    console.error("[Superadmin Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-xl p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-500/20 p-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <h1 className="text-xl font-semibold text-white mb-2">
          {t("superadmin.error.title", "Something went wrong")}
        </h1>

        <p className="text-slate-400 mb-4 text-sm">
          {t(
            "superadmin.error.message",
            "An error occurred while loading the superadmin panel. This has been logged for investigation.",
          )}
        </p>

        {/* Error details (collapsible for debugging) */}
        <details className="mb-4 text-start">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
            {t("superadmin.error.details", "Technical details")}
          </summary>
          <div className="mt-2 p-3 bg-slate-900 rounded text-xs font-mono text-red-400 overflow-auto max-h-32">
            <p className="break-all">{error.message}</p>
            {error.digest && (
              <p className="mt-1 text-slate-500">
                {t("superadmin.error.digestLabel", "Digest")}: {error.digest}
              </p>
            )}
          </div>
        </details>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={reset}
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 me-2" />
            {t("superadmin.error.tryAgain", "Try Again")}
          </Button>

          <Button
            onClick={() => router.push("/superadmin/login")}
            variant="outline"
            size="sm"
          >
            <Home className="h-4 w-4 me-2" />
            {t("superadmin.error.goToLogin", "Go to Login")}
          </Button>

          <Button
            onClick={() => router.push("/")}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            {t("superadmin.error.exit", "Exit Superadmin")}
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
            <Bug className="h-3 w-3" />
            {t(
              "superadmin.error.footer",
              "If this persists, check the browser console for details",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
