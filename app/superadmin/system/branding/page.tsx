"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/contexts/TranslationContext";
import { LogoSettingsForm } from "@/components/brand/LogoSettingsForm";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Superadmin System Branding Page
 * Platform-wide logo and branding management
 */
export default function SuperadminBrandingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrentLogo = async () => {
      try {
        const response = await fetch("/api/superadmin/settings/logo");

        if (response.status === 401) {
          router.push("/superadmin/login");
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setCurrentLogoUrl(data.logoUrl);
        }
      } catch (error) {
        console.error("Failed to load logo settings", error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentLogo();
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("superadmin.branding.title", "Platform Branding")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "superadmin.branding.subtitle",
            "Manage platform-wide logo and branding settings",
          )}
        </p>
      </div>

      {/* Logo Settings Form */}
      <LogoSettingsForm
        scope="platform"
        currentLogoUrl={currentLogoUrl}
        onSuccess={() => {
          // Reload logo in 1 second
          setTimeout(() => window.location.reload(), 1000);
        }}
      />
    </div>
  );
}
