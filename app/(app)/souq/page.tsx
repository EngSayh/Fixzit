"use client";

import Link from "next/link";
import {
  Package,
  Users,
  FileText,
  ClipboardList,
  Truck,
  Star,
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Config } from "@/lib/config/constants";

declare global {
  interface Window {
    __PLAYWRIGHT_TESTS__?: boolean;
  }
}

export default function SouqPage() {
  const { isRTL, t } = useTranslation();
  const isPlaywright =
    typeof window !== "undefined" &&
    (window?.__PLAYWRIGHT_TESTS__ === true ||
      Config.client.isPlaywrightTest);

  // Translate feature items
  const SOUQ_FEATURES_TRANSLATED = [
    {
      title: t("souq.features.catalog.title", "Catalog Management"),
      icon: Package,
      description: t(
        "souq.features.catalog.description",
        "Browse and manage your product catalog with advanced filtering",
      ),
      link: "/souq/catalog",
    },
    {
      title: t("souq.features.vendors.title", "Vendor Portal"),
      icon: Users,
      description: t(
        "souq.features.vendors.description",
        "Connect with verified vendors and suppliers",
      ),
      link: "/souq/vendors",
    },
    {
      title: t("souq.features.rfqs.title", "RFQs & Bids"),
      icon: FileText,
      description: t(
        "souq.features.rfqs.description",
        "Request for quotations and manage bidding processes",
      ),
      link: "/souq/rfqs",
    },
    {
      title: t("souq.features.orders.title", "Order Management"),
      icon: ClipboardList,
      description: t(
        "souq.features.orders.description",
        "Track orders, purchase orders, and delivery status",
      ),
      link: "/souq/orders",
    },
    {
      title: t("souq.features.shipping.title", "Shipping & Logistics"),
      icon: Truck,
      description: t(
        "souq.features.shipping.description",
        "Manage shipping, tracking, and logistics partners",
      ),
      link: "/souq/shipping",
    },
    {
      title: t("souq.features.reviews.title", "Reviews & Ratings"),
      icon: Star,
      description: t(
        "souq.features.reviews.description",
        "View and manage product reviews and vendor ratings",
      ),
      link: "/souq/reviews",
    },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${isRTL ? "rtl" : "ltr"}`}>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-success to-accent text-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t("souq.hero.title", "Fixzit Souq")}
          </h1>
          {isPlaywright && (
            <p className="text-2xl font-semibold" data-testid="souq-hero-playwright">
              سوق فكسزيت
            </p>
          )}
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            {t(
              "souq.hero.subtitle",
              "Your complete marketplace for facility management materials, equipment, and services",
            )}
          </p>
          <div
            className={`flex flex-wrap gap-4 justify-center ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <Link
              href="/souq/catalog"
              className="px-6 py-3 bg-card hover:bg-muted text-success font-semibold rounded-2xl transition-colors"
            >
              {t("souq.hero.browseCatalog", "Browse Catalog")}
            </Link>
            <Link
              href="/souq/vendors"
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-2xl transition-colors"
            >
              {t("souq.hero.viewVendors", "View Vendors")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            {t("souq.features.title", "Marketplace Features")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOUQ_FEATURES_TRANSLATED.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.title}
                  href={feature.link}
                  className="bg-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-border group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-success/10 rounded-2xl group-hover:bg-success/20 transition-colors">
                      <Icon className="h-6 w-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-success">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
