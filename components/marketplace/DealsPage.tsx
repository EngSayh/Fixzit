/* Client component: Marketplace deals page with unauthenticated UX */
"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/contexts/TranslationContext";
import { SavedCartBanner } from "./SavedCartBanner";
import { RecentlyViewed } from "./RecentlyViewed";
import { Button } from "@/components/ui/button";
import { Tag, TrendingUp, Gift, Lock } from "@/components/ui/icons";

export function DealsPage() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const isAuthenticated = status === "authenticated" && session?.user;

  // Mock deals data - in production would come from API
  const deals = [
    {
      id: "1",
      title: "Commercial HVAC Maintenance Package",
      discount: "25% OFF",
      price: 1499,
      originalPrice: 1999,
      currency: "SAR",
      vendor: "CoolTech Solutions",
      imageUrl: "/images/deals/hvac.jpg",
    },
    {
      id: "2",
      title: "Premium Cleaning Supplies Bundle",
      discount: "30% OFF",
      price: 799,
      originalPrice: 1142,
      currency: "SAR",
      vendor: "CleanPro Supplies",
      imageUrl: "/images/deals/cleaning.jpg",
    },
    {
      id: "3",
      title: "Security System Installation",
      discount: "20% OFF",
      price: 3999,
      originalPrice: 4999,
      currency: "SAR",
      vendor: "SecureFirst",
      imageUrl: "/images/deals/security.jpg",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("marketplace.deals.title", "Exclusive Deals")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t(
              "marketplace.deals.subtitle",
              "Save on facility management services and supplies"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>
            {t("marketplace.deals.expiry", "Limited time offers")}
          </span>
        </div>
      </div>

      {/* Unauthenticated User CTA */}
      {!isAuthenticated && (
        <div className="mb-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/20 p-2">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t(
                    "marketplace.deals.signInTitle",
                    "Sign in to unlock exclusive deals"
                  )}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    "marketplace.deals.signInSubtitle",
                    "Create an account or sign in to access member-only pricing, bulk discounts, and personalized recommendations."
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/signup">
                  {t("marketplace.deals.signUp", "Sign Up")}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login">
                  {t("marketplace.deals.signIn", "Sign In")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Cart Banner (unauthenticated only) */}
      {!isAuthenticated && (
        <div className="mb-6">
          <SavedCartBanner />
        </div>
      )}

      {/* Deal Categories */}
      <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
        {[
          { key: "all", label: t("marketplace.deals.categories.all", "All Deals"), icon: Tag },
          { key: "hvac", label: t("marketplace.deals.categories.hvac", "HVAC"), icon: Gift },
          { key: "cleaning", label: t("marketplace.deals.categories.cleaning", "Cleaning"), icon: Gift },
          { key: "security", label: t("marketplace.deals.categories.security", "Security"), icon: Gift },
          { key: "electrical", label: t("marketplace.deals.categories.electrical", "Electrical"), icon: Gift },
        ].map(({ key, label, icon: Icon }) => (
          <button type="button"
            key={key}
            className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Deals Grid */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-video bg-muted">
              {/* Placeholder image - in production would use next/image */}
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Gift className="h-12 w-12" />
              </div>
              <div className="absolute end-3 top-3 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
                {deal.discount}
              </div>
            </div>
            <div className="p-4">
              <h3 className="line-clamp-2 text-lg font-semibold text-foreground">
                {deal.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {deal.vendor}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {deal.price.toFixed(2)} {deal.currency}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {deal.originalPrice.toFixed(2)}
                </span>
              </div>
              <Button
                asChild
                className="mt-4 w-full"
                variant={isAuthenticated ? "default" : "outline"}
              >
                {isAuthenticated ? (
                  <Link href={`/marketplace/product/${deal.id}`}>
                    {t("marketplace.deals.viewDeal", "View Deal")}
                  </Link>
                ) : (
                  <Link href="/login">
                    {t("marketplace.deals.signInToView", "Sign In to View")}
                  </Link>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Recently Viewed (unauthenticated only) */}
      {!isAuthenticated && (
        <div className="mt-8">
          <RecentlyViewed />
        </div>
      )}

      {/* Additional Benefits Section */}
      {!isAuthenticated && (
        <div className="mt-12 rounded-2xl border border-border bg-muted/50 p-6">
          <h2 className="mb-4 text-xl font-bold text-foreground">
            {t("marketplace.deals.benefitsTitle", "Why Sign In?")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <h3 className="font-semibold text-foreground">
                {t("marketplace.deals.benefit1Title", "Exclusive Discounts")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "marketplace.deals.benefit1Description",
                  "Access member-only pricing and bulk purchase discounts up to 40% off."
                )}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {t(
                  "marketplace.deals.benefit2Title",
                  "Personalized Recommendations"
                )}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "marketplace.deals.benefit2Description",
                  "Get tailored deals based on your facility management needs."
                )}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {t("marketplace.deals.benefit3Title", "Saved Carts & History")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "marketplace.deals.benefit3Description",
                  "Sync your cart and order history across all devices."
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
