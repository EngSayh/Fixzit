"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search } from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { BrandLogo } from "@/components/brand";
import { EMAIL_DOMAINS } from "@/lib/config/domains";

export function GlobalNotFound() {
  const { t } = useTranslation();

  const commonPages = [
    {
      name: t("common.pages.dashboard", "Dashboard"),
      href: "/dashboard",
      icon: "🏠",
    },
    {
      name: t("common.pages.properties", "Properties"),
      href: "/properties",
      icon: "🏢",
    },
    {
      name: t("common.pages.workOrders", "Work Orders"),
      href: "/work-orders",
      icon: "🧰",
    },
    {
      name: t("common.pages.marketplace", "Marketplace"),
      href: "/marketplace",
      icon: "🛍️",
    },
    {
      name: t("common.pages.finance", "Finance"),
      href: "/finance",
      icon: "💳",
    },
    { name: t("common.pages.hr", "HR"), href: "/hr", icon: "👥" },
    { name: t("common.pages.login", "Login"), href: "/login", icon: "🔐" },
  ];

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Brand Logo */}
        <div className="mb-6">
          <BrandLogo 
            size="lg" 
            alt="Fixzit" 
            fetchOrgLogo={false}
            data-testid="not-found-logo"
          />
        </div>
        
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">
            {t("errors.404.code", "404")}
          </h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {t("errors.404.title", "Page Not Found")}
          </h2>
          <p className="text-muted-foreground">
            {t(
              "errors.404.message",
              "The page you're looking for doesn't exist or has been moved.",
            )}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors"
          >
            <Home size={20} />
            {t("common.actions.goToHomepage", "Go to Homepage")}
          </Link>

          <button type="button"
            onClick={() => window.history.back()}
            className="block w-full px-6 py-3 border border-border text-foreground rounded-2xl hover:bg-muted transition-colors"
            aria-label={t("common.actions.goBack", "Go Back")}
          >
            <ArrowLeft size={20} className="inline me-2" />
            {t("common.actions.goBack", "Go Back")}
          </button>
        </div>

        <div className="bg-card rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Search size={20} className="text-primary" />
            {t("common.popularPages", "Popular Pages")}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {commonPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="flex items-center gap-2 p-3 bg-muted rounded-2xl hover:bg-primary/10 transition-colors text-start"
              >
                <span className="text-lg">{page.icon}</span>
                <span className="text-sm font-medium text-foreground">
                  {page.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 text-sm text-muted-foreground">
          <p>
            {t(
              "errors.404.helpText",
              "If you believe this is an error, please contact",
            )}{" "}
            <a
              href={`mailto:${EMAIL_DOMAINS.support}`}
              className="text-primary hover:text-primary transition-colors"
            >
              {EMAIL_DOMAINS.support}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
