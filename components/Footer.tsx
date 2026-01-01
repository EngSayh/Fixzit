"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { ChevronDown, Home } from "@/components/ui/icons";
import SupportPopup from "@/components/SupportPopup";
import { useTranslation } from "@/contexts/TranslationContext";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import CurrencySelector from "@/components/i18n/CurrencySelector";
import StatusIndicator from "@/components/StatusIndicator";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type NavLink = {
  label: string;
  href?: string;
  description?: string;
  onClick?: () => void;
};

type NavGroup = {
  id: string;
  label: string;
  description: string;
  links: NavLink[];
};

type FooterProps = {
  hidePlatformLinks?: boolean;
};

export default function Footer({ hidePlatformLinks = false }: FooterProps) {
  const [supportOpen, setSupportOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const { t, isRTL: translationIsRTL } = useTranslation();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  const handleSupportClick = useCallback(() => {
    setSupportOpen(true);
    setActiveGroup("support");
  }, []);

  const navSections = useMemo<NavGroup[]>(
    () => [
      {
        id: "platform",
        label: t("footer.nav.platform", "Platform"),
        description: t(
          "footer.nav.platformDesc",
          "Operations, finance, and marketplace tools",
        ),
        links: [
          {
            label: t("footer.workOrders", "Work Orders"),
            description: t(
              "footer.workOrdersDescription",
              "Dispatch, SLA timers, and technician routing",
            ),
            href: "/work-orders",
          },
          {
            label: t("footer.properties", "Properties"),
            description: t(
              "footer.propertiesDescription",
              "Units, leases, inspections, and maintenance",
            ),
            href: "/properties",
          },
          {
            label: t("footer.finance", "Finance"),
            description: t(
              "footer.financeDescription",
              "Invoices, receipts, payouts, and ZATCA-ready billing",
            ),
            href: "/finance",
          },
          {
            label: t("footer.marketplace", "Souq Marketplace"),
            description: t(
              "footer.marketplaceDescription",
              "Catalog, vendor onboarding, and orders",
            ),
            href: "/marketplace",
          },
        ],
      },
      {
        id: "company",
        label: t("footer.nav.company", "Company"),
        description: t(
          "footer.nav.companyDesc",
          "Team, careers, and pricing details",
        ),
        links: [
          { label: t("footer.about", "About"), href: "/about" },
          { label: t("footer.careers", "Careers"), href: "/careers" },
          {
            label: t("footer.pricing", "Pricing & Trial"),
            href: "/pricing",
          },
        ],
      },
      {
        id: "resources",
        label: t("footer.nav.resources", "Resources"),
        description: t(
          "footer.nav.resourcesDesc",
          "Docs, reports, and live health metrics",
        ),
        links: [
          {
            label: t("footer.docs", "API Docs"),
            description: t(
              "footer.docsDescription",
              "OpenAPI and integration guides",
            ),
            href: "/docs/api",
          },
          {
            label: t("footer.reports", "Reports & Analytics"),
            description: t(
              "footer.reportsDescription",
              "Dashboards and monitoring across modules",
            ),
            href: "/reports",
          },
          {
            label: t("footer.status", "Status"),
            description: t(
              "footer.statusDetail",
              "Uptime, incidents, and maintenance windows",
            ),
            href: "/support",
          },
        ],
      },
      {
        id: "support",
        label: t("footer.support", "Support"),
        description: t(
          "footer.nav.supportDesc",
          "Help center, policies, and support desk",
        ),
        links: [
          { label: t("footer.help", "Help Center"), href: "/help" },
          {
            label: t("footer.ticket", "Open a ticket"),
            description: t(
              "footer.ticketDescription",
              "Create a support case with Fixzit",
            ),
            onClick: handleSupportClick,
          },
          {
            label: t("footer.privacy", "Privacy"),
            description: t(
              "footer.privacyDescription",
              "How we process and safeguard data",
            ),
            href: "/privacy",
          },
          {
            label: t("footer.terms", "Terms"),
            description: t(
              "footer.termsDescription",
              "Platform terms and acceptable use",
            ),
            href: "/terms",
          },
        ],
      },
    ],
    [handleSupportClick, t],
  );

  // Filter out platform section when in superadmin context
  const filteredSections = useMemo(() => {
    if (hidePlatformLinks) {
      return navSections.filter(section => section.id !== "platform");
    }
    return navSections;
  }, [hidePlatformLinks, navSections]);

  useEffect(() => {
    if (!activeGroup && filteredSections.length > 0) {
      setActiveGroup(filteredSections[0]?.id ?? null);
    }
  }, [activeGroup, filteredSections]);

  const activeNav =
    filteredSections.find((section) => section.id === activeGroup) ??
    filteredSections[0];

  const activeLinks = activeNav?.links ?? [];

  return (
    <footer className="border-t bg-card/70 backdrop-blur">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 text-sm lg:px-6">
        <div
          className={cn(
            "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
            translationIsRTL ? "lg:flex-row-reverse" : "",
          )}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary/70" aria-hidden />
              <span>{t("footer.brand", "Fixzit")}</span>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base font-semibold text-foreground transition hover:text-primary"
            >
              <Home className="h-4 w-4" />
              <span>{t("footer.backHome", "Back to Home")}</span>
            </Link>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {t(
                "footer.description",
                "Facility management + marketplaces in one platform.",
              )}
            </p>
          </div>
          <div
            className={cn(
              "flex flex-wrap items-center gap-3",
              translationIsRTL ? "flex-row-reverse" : "",
            )}
          >
            <StatusIndicator
              label={t(
                "footer.status.operational",
                "All systems operational",
              )}
              detail={t(
                "footer.status.realtime",
                "Live analytics | <180ms P95",
              )}
              status="operational"
            />
            <ThemeToggle />
            <LanguageSelector variant="compact" />
            <CurrencySelector variant="compact" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/70 shadow-lg">
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <nav
              aria-label={t("footer.navigationLabel", "Footer navigation")}
              className="space-y-3"
            >
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2",
                  translationIsRTL ? "flex-row-reverse" : "",
                )}
              >
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveGroup(section.id)}
                    aria-pressed={activeGroup === section.id}
                    aria-label={`${activeGroup === section.id ? 'Collapse' : 'Expand'} ${section.label} section`}
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-150",
                      activeGroup === section.id
                        ? "border-primary/60 bg-primary/10 text-foreground shadow-sm"
                        : "border-transparent bg-muted/30 text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-150",
                        activeGroup === section.id ? "rotate-180" : "",
                      )}
                    />
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {activeNav?.description}
                </p>
              </div>
            </nav>
          </div>
          <div className="border-t border-border/60 px-3 pb-4 sm:px-4">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {activeLinks.map((link) => {
                const content = (
                  <div className="flex h-full flex-col gap-1 text-start">
                    <span className="font-medium text-foreground">
                      {link.label}
                    </span>
                    {link.description ? (
                      <span className="text-[11px] text-muted-foreground">
                        {link.description}
                      </span>
                    ) : null}
                  </div>
                );

                if (link.href) {
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="group flex h-full min-h-[96px] flex-col justify-center rounded-xl border border-transparent bg-background/60 px-4 py-3 transition hover:-translate-y-0.5 hover:border-border hover:bg-background/90 hover:shadow-sm"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={link.label}
                    type="button"
                    className="group flex h-full min-h-[96px] flex-col justify-center rounded-xl border border-transparent bg-background/60 px-4 py-3 text-start transition hover:-translate-y-0.5 hover:border-border hover:bg-background/90 hover:shadow-sm"
                    onClick={link.onClick}
                    aria-label={t("footer.ticket_aria", "Open a support ticket")}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-foreground">
              © {currentYear || "..."}{" "}
              {t(
                "footer.copyright",
                "Sultan Al Hassni Real Estate LLC. All rights reserved.",
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {t("footer.breadcrumbLabel", "Fixzit trail")} ·{" "}
              {t("footer.status.operational", "All systems operational")}
            </div>
          </div>
          <div
            className={cn(
              "flex flex-wrap items-center gap-4",
              translationIsRTL ? "flex-row-reverse" : "",
            )}
          >
            <Link href="/privacy" className="hover:underline">
              {t("footer.privacy", "Privacy")}
            </Link>
            <Link href="/terms" className="hover:underline">
              {t("footer.terms", "Terms")}
            </Link>
            <Link href="/support" className="hover:underline">
              {t("footer.support", "Support")}
            </Link>
          </div>
        </div>
      </div>
      {supportOpen && (
        <SupportPopup open={supportOpen} onClose={() => setSupportOpen(false)} />
      )}
    </footer>
  );
}
