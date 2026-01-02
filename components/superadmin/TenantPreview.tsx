"use client";

/**
 * Tenant Preview Component
 * 
 * Allows Superadmins to preview the app as a specific tenant
 * - Non-destructive (read-only mode)
 * - Shows banner when preview active
 * - Exit preview button to return to superadmin view
 * 
 * Usage:
 * <TenantPreview orgId="org_123abc" />
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, X } from "@/components/ui/icons";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface TenantPreviewProps {
  orgId: string;
  orgName?: string;
}

export function TenantPreview({ orgId, orgName }: TenantPreviewProps) {
  const router = useRouter();
  const navigate = (href: string) => {
    if (router?.push) {
      router.push(href);
    } else {
      logger.warn("[TenantPreview] Navigation skipped - no router available", {
        component: "TenantPreview",
        href,
      });
    }
  };
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  useEffect(() => {
    // Check if preview mode is active
    const previewMode = sessionStorage.getItem("preview_mode");
    const previewOrgId = sessionStorage.getItem("preview_org_id");

    if (previewMode === "true" && previewOrgId === orgId) {
      setIsPreviewActive(true);
    }
  }, [orgId]);

  const handleStartPreview = async () => {
    try {
      // Set preview mode in session storage
      sessionStorage.setItem("preview_mode", "true");
      sessionStorage.setItem("preview_org_id", orgId);
      sessionStorage.setItem("preview_org_name", orgName || orgId);

      // Notify backend to switch context (read-only)
      const res = await fetch("/api/superadmin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, read_only: true }),
      });

      if (!res.ok) {
        throw new Error("Failed to start preview mode");
      }

      setIsPreviewActive(true);
      toast.success(`Preview mode activated for ${orgName || orgId}`);

      // Redirect to tenant dashboard
      navigate("/dashboard");
    } catch (error) {
      logger.error("[SuperadminPreview] Preview mode failed", { error });
      toast.error("Failed to start preview mode");
    }
  };

  const handleExitPreview = async () => {
    try {
      // Clear session storage
      sessionStorage.removeItem("preview_mode");
      sessionStorage.removeItem("preview_org_id");
      sessionStorage.removeItem("preview_org_name");

      // Notify backend to exit preview
      await fetch("/api/superadmin/preview", {
        method: "DELETE",
      });

      setIsPreviewActive(false);
      toast.success("Preview mode exited");

      // Redirect to superadmin dashboard
      navigate("/superadmin");
    } catch (error) {
      logger.error("[SuperadminPreview] Exit preview failed", { error });
      toast.error("Failed to exit preview mode");
    }
  };

  if (isPreviewActive) {
    return (
      <Alert className="fixed top-4 start-1/2 -translate-x-1/2 z-50 max-w-2xl bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <Eye className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            Preview Mode: {orgName || orgId} (Read-Only)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExitPreview}
            className="ms-4"
            aria-label="Exit tenant preview mode"
          >
            <X className="w-4 h-4 me-2" />
            Exit Preview
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleStartPreview} aria-label="Start tenant preview mode">
      <Eye className="w-4 h-4 me-2" />
      Preview as Tenant
    </Button>
  );
}

/**
 * Preview Mode Banner (Global)
 * 
 * Shows at top of all pages when preview mode is active
 * Add to root layout or shell component
 */
export function PreviewModeBanner() {
  const [previewData, setPreviewData] = useState<{
    active: boolean;
    orgName: string;
  } | null>(null);

  useEffect(() => {
    const previewMode = sessionStorage.getItem("preview_mode");
    const previewOrgName = sessionStorage.getItem("preview_org_name");

    if (previewMode === "true" && previewOrgName) {
      setPreviewData({ active: true, orgName: previewOrgName });
    }
  }, []);

  if (!previewData?.active) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-200 dark:border-yellow-800">
      <div className="container flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Preview Mode: {previewData.orgName} (Read-Only)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            sessionStorage.clear();
            window.location.href = "/superadmin";
          }}
          aria-label="Exit tenant preview mode"
        >
          <X className="w-4 h-4 me-2" />
          Exit Preview
        </Button>
      </div>
    </div>
  );
}
