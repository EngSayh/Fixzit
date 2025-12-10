import React from "react";
import { logger } from "@/lib/logger";
import ProductCard from "@/components/marketplace/ProductCard";
import { serverFetchJsonWithTenant } from "@/lib/marketplace/serverFetch";
import { MARKETPLACE_OFFLINE_DATA } from "@/data/marketplace-offline";
import { getServerI18n } from "@/lib/i18n/server";
import { isTruthy } from "@/lib/utils/env";

interface Category {
  id: string;
  slug: string;
  name?: { en: string };
}

interface Product {
  id?: string;
  _id?: string;
  slug: string;
  title: { en: string };
  media?: Array<{ url: string; alt?: string }>;
  buy: {
    price: number;
    currency: string;
    uom: string;
  };
  stock?: {
    onHand: number;
    reserved: number;
  };
  [key: string]: unknown;
}

interface MarketplaceProductCard {
  id: string;
  slug: string;
  title: { en: string };
  buy: {
    price: number;
    currency: string;
    uom: string;
  };
  [key: string]: unknown;
}

const offlineMarketplaceEnabled = isTruthy(process.env.ALLOW_OFFLINE_MONGODB);

async function loadHomepageData() {
  if (offlineMarketplaceEnabled) {
    logger.info(
      "[Marketplace] Offline dataset enabled (ALLOW_OFFLINE_MONGODB)",
    );
    return MARKETPLACE_OFFLINE_DATA;
  }
  try {
    const [categoriesResponse, featuredResponse] = await Promise.all([
      serverFetchJsonWithTenant<{ data: Category[] }>(
        "/api/marketplace/categories",
      ),
      serverFetchJsonWithTenant<{ data: { items: Product[] } }>(
        "/api/marketplace/products?limit=8",
      ),
    ]);

    const categories = categoriesResponse.data;
    const featured = featuredResponse.data.items;

    const carousels = await Promise.all(
      categories.slice(0, 4).map(async (category) => {
        const response = await serverFetchJsonWithTenant<{
          data: { items: Product[] };
        }>(`/api/marketplace/search?cat=${category.slug}&limit=6`);
        return {
          category,
          items: response.data.items,
        };
      }),
    );

    return { categories, featured, carousels };
  } catch (error) {
    logger.error("Failed to load marketplace homepage data", { error });
    if (offlineMarketplaceEnabled) {
      logger.warn(
        "[Marketplace] Falling back to offline dataset after fetch failure",
      );
      return MARKETPLACE_OFFLINE_DATA;
    }
    // Return empty data to allow graceful degradation
    return { categories: [], featured: [], carousels: [] };
  }
}

export default async function MarketplaceHome() {
  const { featured, carousels } = await loadHomepageData();
  const { t } = await getServerI18n();
  const heroHighlights = [
    t("marketplace.home.hero.highlights.rapidRfq", "Rapid RFQ"),
    t(
      "marketplace.home.hero.highlights.linkedOrders",
      "Work Order linked orders",
    ),
    t(
      "marketplace.home.hero.highlights.financeReady",
      "Finance ready invoices",
    ),
  ];

  return (
    <div className="space-y-6">
      <main className="mx-auto max-w-7xl px-4 py-4">
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#118158] via-[#0D6645] to-[#094D34] p-10 text-white shadow-xl">
            <p className="text-sm uppercase tracking-[0.18em] text-white/80">
              {t("marketplace.home.hero.pill", "Fixzit Souq")}
            </p>
            <h1 className="mt-4 text-[28px] font-bold leading-tight">
              {t(
                "marketplace.home.hero.title",
                "Facilities, MRO & Construction Marketplace",
              )}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] text-white/85">
              {t(
                "marketplace.home.hero.description",
                "Source ASTM and BS EN compliant materials with tenant-level approvals, finance posting, and vendor SLAs baked in.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold">
              {heroHighlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full bg-white/20 px-4 py-2"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-primary/20 bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t("marketplace.home.kpis.title", "Live Operational KPIs")}
            </h2>
            <div className="grid gap-3 text-sm text-[var(--color-text-primary)]">
              <div className="rounded-2xl bg-[var(--color-brand-primary-surface)] p-4">
                <p className="text-xs uppercase tracking-wider text-[#118158]">
                  {t("marketplace.home.kpis.openApprovals", "Open approvals")}
                </p>
                <p className="text-2xl font-bold text-[#118158]">3</p>
              </div>
              <div className="rounded-2xl bg-[#FFF3CD] p-4">
                <p className="text-xs uppercase tracking-wider text-[#856404]">
                  {t(
                    "marketplace.home.kpis.pendingDeliveries",
                    "Pending deliveries",
                  )}
                </p>
                <p className="text-2xl font-bold text-[#856404]">7</p>
              </div>
              <div className="rounded-2xl bg-[#D4EDDA] p-4">
                <p className="text-xs uppercase tracking-wider text-[#28A745]">
                  {t("marketplace.home.kpis.financeReady", "Finance ready")}
                </p>
                <p className="text-2xl font-bold text-success">5</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-primary">
              {t(
                "marketplace.home.featured.title",
                "Featured for your organisation",
              )}
            </h2>
            <a
              href="/marketplace/search"
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("marketplace.home.featured.viewAll", "View all")}
            </a>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featured.map((product, idx) => {
              const p = product as unknown as Product;
              const idFromObject =
                typeof p?._id === "object" && p._id && "toString" in p._id
                  ? (p._id as { toString: () => string }).toString()
                  : String(p?._id ?? "");
              const key = p?.id || idFromObject || p?.slug || `featured-${idx}`;
              const normalized: MarketplaceProductCard = {
                ...p,
                id: key,
                title: p.title,
                buy: p.buy,
                slug: (p as { slug?: string })?.slug ?? key,
              };
              return <ProductCard key={key} product={normalized} />;
            })}
          </div>
        </section>

        {carousels.map((carousel) => (
          <section key={carousel.category.slug} className="mt-12 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">
                {carousel.category.name?.en ?? carousel.category.slug}
              </h3>
              <a
                href={`/marketplace/search?cat=${carousel.category.slug}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t("marketplace.home.categories.explore", "Explore all")}
              </a>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {carousel.items.map((product, idx) => {
                const p = product as Product;
                const key =
                  p.id ??
                  p._id ??
                  (p as { slug?: string })?.slug ??
                  `carousel-${carousel.category.slug}-${idx}`;
                const normalized = {
                  ...p,
                  id: p.id ?? p._id ?? (p as { slug?: string })?.slug ?? key,
                  slug: (p as { slug?: string })?.slug ?? key,
                };
                return <ProductCard key={key} product={normalized} />;
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
