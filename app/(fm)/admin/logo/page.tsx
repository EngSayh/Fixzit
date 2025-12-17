"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/contexts/TranslationContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LogoSettingsForm } from "@/components/brand/LogoSettingsForm";

/**
 * Logo Upload Admin Page
 * Super Admin only - Upload and manage platform logo
 * Uses shared LogoSettingsForm component
 */
export default function LogoUpload() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Authorization check
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login?callbackUrl=/admin/logo");
      return;
    }

    if (session.user?.role !== "SUPER_ADMIN") {
      toast.error(
        t(
          "admin.logo.accessDenied",
          "Access Denied: SUPER_ADMIN role required",
        ),
      );
      router.push("/dashboard");
      return;
    }
  }, [session, status, router, t]);

  // Load current logo
  useEffect(() => {
    if (session?.user?.role !== "SUPER_ADMIN") return;

    const loadCurrentLogo = async () => {
      try {
        const response = await fetch("/api/admin/logo/upload");

        if (response.ok) {
          const data = await response.json();
          setCurrentLogoUrl(data.logoUrl);
        }
      } catch {
        // Silently handle error - logo will be null
      } finally {
        setLoading(false);
      }
    };

    loadCurrentLogo();
  }, [session]);

  // Don't render if not authorized
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">
          {t("common.loading", "Loading...")}
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("admin.logo.title", "Logo Management")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "admin.logo.subtitle",
            "Upload and manage platform logo (Super Admin only)",
          )}
        </p>
      </div>

      {/* Logo Settings Form */}
      <LogoSettingsForm
        scope="tenant"
        currentLogoUrl={currentLogoUrl}
      />

      {/* Guidelines */}
      <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
        <h3 className="font-medium text-sm text-foreground">
          {t("admin.logo.guidelinesTitle", "Logo Guidelines")}
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>
            {t(
              "admin.logo.guideline.formats",
              "Supported formats: PNG, JPEG, SVG, WebP",
            )}
          </li>
          <li>{t("admin.logo.guideline.size", "Maximum file size: 5MB")}</li>
          <li>
            {t(
              "admin.logo.guideline.dimensions",
              "Recommended dimensions: 200x80 pixels (or proportional)",
            )}
          </li>
          <li>
            {t(
              "admin.logo.guideline.transparent",
              "Use PNG with transparent background for best results",
            )}
          </li>
          <li>
            {t(
              "admin.logo.guideline.topbar",
              "Logo will appear in the top navigation bar",
            )}
          </li>
          <li>
            {t(
              "admin.logo.guideline.clickable",
              "Logo will be clickable and link to the landing page",
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
