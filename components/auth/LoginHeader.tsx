"use client";

import { useTranslation } from "@/contexts/TranslationContext";
import Image from "next/image";

/**
 * Login page header component with logo, title, and subtitle.
 *
 * @accessibility
 * - Logo has proper alt text for screen readers
 * - Semantic heading structure (h1)
 * - Supports RTL layouts
 */
export default function LoginHeader() {
  const { t } = useTranslation();

  return (
    <div className="text-center mb-6">
      {/* Logo - Uses Image component for optimization, falls back to styled text */}
      <div
        className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4"
        role="img"
        aria-label={t("brand.logoAlt", "Fixzit Logo")}
      >
        {/* Primary: Try to load logo image */}
        <Image
          src="/images/logo-icon.png"
          alt=""
          width={48}
          height={48}
          className="hidden"
          priority
          onLoad={(e) => {
            // Show image and hide fallback when loaded
            const img = e.currentTarget;
            img.classList.remove("hidden");
            const fallback = img.nextElementSibling;
            if (fallback) fallback.classList.add("hidden");
          }}
          onError={(e) => {
            // Keep fallback visible on error
            e.currentTarget.classList.add("hidden");
          }}
        />
        {/* Fallback: Styled text logo */}
        <span className="text-primary-foreground text-3xl font-bold" aria-hidden="true">
          Fz
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-foreground mb-2">
        {t("login.welcome", "Welcome Back")}
      </h1>

      {/* Subtitle */}
      <p className="text-muted-foreground">
        {t("login.subtitle", "Sign in to your Fixzit account")}
      </p>
    </div>
  );
}
