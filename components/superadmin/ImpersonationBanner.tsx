/**
 * Impersonation Banner Component
 * Displays when superadmin is viewing tenant modules in impersonation context
 */

"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const { t } = useI18n();
  const [impersonatedOrgId, setImpersonatedOrgId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Check if impersonation context is active
    const checkImpersonation = async () => {
      try {
        const response = await fetch("/api/superadmin/impersonate/status");
        if (response.ok) {
          const data = await response.json();
          setImpersonatedOrgId(data.orgId || null);
        }
      } catch (error) {
        logger.error("[ImpersonationBanner] Failed to check impersonation status", { error });
      }
    };

    checkImpersonation();
  }, []);

  const handleClearImpersonation = async () => {
    setIsClearing(true);
    try {
      const response = await fetch("/api/superadmin/impersonate", {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.href = "/superadmin/issues";
      } else {
        toast.error(t("superadmin.impersonate.banner.error.clearFailed"));
      }
    } catch (error) {
      toast.error(t("superadmin.impersonate.banner.error.clearFailed"));
      logger.error("[ImpersonationBanner] Failed to clear impersonation", { error });
    } finally {
      setIsClearing(false);
    }
  };

  if (!impersonatedOrgId) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 shadow-lg"
      role="alert"
      aria-live="polite"
      aria-label={t("superadmin.impersonate.banner.title")}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <div className="text-sm font-medium">
            <strong>{t("superadmin.impersonate.banner.title")}:</strong> {t("superadmin.impersonate.banner.viewing")}{" "}
            <code className="bg-yellow-600/20 px-2 py-0.5 rounded font-mono text-xs">
              {impersonatedOrgId}
            </code>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearImpersonation}
          disabled={isClearing}
          className="text-yellow-900 hover:bg-yellow-600/20"
          aria-label={t("superadmin.impersonate.banner.exit")}
        >
          {isClearing ? (
            t("superadmin.impersonate.banner.clearing")
          ) : (
            <>
              <X className="w-4 h-4 mr-1" aria-hidden="true" />
              {t("superadmin.impersonate.banner.exit")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
