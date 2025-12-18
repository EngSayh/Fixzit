import Image from "next/image";
import { logger } from "@/lib/logger";
import Link from "next/link";
import PDPBuyBox from "@/components/marketplace/PDPBuyBox";
import ProductCard from "@/components/marketplace/ProductCard";
import { serverFetchJsonWithTenant } from "@/lib/marketplace/serverFetch";
import { getServerI18n } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Config } from "@/lib/config/constants";

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

interface Category {
  slug: string;
  name?: { en?: string };
}

interface MediaFile {
  url: string;
  role?: string;
}

interface Product {
  id: string;
  slug: string;
  title: { en: string };
  summary?: string;
  sku: string;
  brand?: string;
  standards?: string[];
  specs?: Record<string, unknown>;
  media?: MediaFile[];
  related?: Product[];
  buy: {
    price: number;
    currency: string;
    uom: string;
    leadDays?: number;
    minQty?: number;
  };
  stock?: {
    onHand: number;
    reserved: number;
    location?: string;
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const isPlaywright = Config.client.isPlaywrightTest;
  if (isPlaywright) {
    return {
      title: "Playwright Demo Product | Fixzit Marketplace",
      description: "Stub PDP for smoke testing.",
    };
  }
  const resolvedParams = await params;
  const { t } = await getServerI18n();
  const titleSuffix = t(
    "marketplace.product.metadata.title",
    "Fixzit Marketplace",
  );
  const descriptionBase = t(
    "marketplace.product.metadata.description",
    "Shop trusted industrial and FM suppliers across the region.",
  );

  try {
    const productResponse = await serverFetchJsonWithTenant<{
      data: { product: Product };
    }>(`/api/marketplace/products/${resolvedParams.slug}`);
    const product = productResponse.data.product;
    const productName = product?.title?.en ?? resolvedParams.slug;
    const summary = product?.summary?.trim();

    return {
      title: `${productName} | ${titleSuffix}`,
      description: summary
        ? `${summary} - ${descriptionBase}`
        : `${productName} - ${descriptionBase}`,
    };
  } catch (error) {
    logger.warn("MARKETPLACE_PDP_METADATA_FALLBACK", {
      slug: resolvedParams.slug,
      error: (error as Error)?.message ?? String(error),
    });

    return {
      title: `${resolvedParams.slug} | ${titleSuffix}`,
      description: descriptionBase,
    };
  }
}

export default async function ProductDetail(props: ProductPageProps) {
  const isPlaywright = Config.client.isPlaywrightTest;
  if (isPlaywright) {
    const params = await props.params;
    return (
      <div
        className="min-h-screen bg-muted flex flex-col"
        style={{ direction: "ltr" }}
      >
        <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
          <nav className="text-sm text-primary">
            <a href="/marketplace" className="hover:underline">
              Marketplace
            </a>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="text-primary">
              {params.slug ?? "demo-product"}
            </span>
          </nav>
          <section className="rounded-2xl bg-card p-6 shadow-lg space-y-4">
            <h1 className="text-3xl font-semibold text-foreground">
              Playwright Demo Product
            </h1>
            <p className="text-muted-foreground">
              Stubbed product detail for smoke testing.
            </p>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">
                Price: SAR 150.00 • UOM: each
              </p>
              <p className="text-sm text-muted-foreground">
                Availability: In stock
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Add to Cart
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }
  const { t, isRTL } = await getServerI18n();
  if (isPlaywright) {
    const params = await props.params;
    return (
      <div
        className="min-h-screen bg-muted flex flex-col"
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
          <nav className="text-sm text-primary">
            <a href="/marketplace" className="hover:underline">
              {t("marketplace.product.breadcrumb.home", "Marketplace")}
            </a>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="text-primary">
              {params.slug ?? "demo-product"}
            </span>
          </nav>
          <section className="rounded-2xl bg-card p-6 shadow-lg space-y-4">
            <h1 className="text-3xl font-semibold text-foreground">
              Playwright Demo Product
            </h1>
            <p className="text-muted-foreground">
              Stubbed product detail for smoke testing.
            </p>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">
                Price: SAR 150.00 • UOM: each
              </p>
              <p className="text-sm text-muted-foreground">
                Availability: In stock
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Add to Cart
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }
  try {
    const params = await props.params;
    const [, productResponse] = await Promise.all([
      serverFetchJsonWithTenant<{ data: Category[] }>(
        "/api/marketplace/categories",
      ),
      serverFetchJsonWithTenant<{
        data: { product: Product; category?: Category };
      }>(`/api/marketplace/products/${params.slug}`),
    ]);

    // departments unused - future feature
    // const departments = (categories.data as Category[]).map(category => ({
    //   slug: category.slug,
    //   name: category.name?.en ?? category.slug
    // }));

    const product = productResponse.data.product;
    const category = productResponse.data.category;

    const attachments =
      product.media?.filter(
        (file: MediaFile) => file.role === "MSDS" || file.role === "COA",
      ) ?? [];
    const gallery =
      product.media?.filter((file: MediaFile) => file.role === "GALLERY") ?? [];

    // [CODE REVIEW]: FIX - DELETE FIXZIT_COLORS object, use Tailwind theme classes
    return (
      <div
        className="min-h-screen bg-muted flex flex-col"
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        <main className="mx-auto max-w-7xl px-4 py-8">
          <nav className="text-sm text-primary">
            <a href="/marketplace" className="hover:underline">
              {t("marketplace.product.breadcrumb.home", "Marketplace")}
            </a>
            <span className="mx-2 text-muted-foreground">/</span>
            {category && (
              <a
                href={`/marketplace/search?cat=${category.slug}`}
                className="hover:underline"
              >
                {category.name?.en ?? category.slug}
              </a>
            )}
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="text-primary">{product.title.en}</span>
          </nav>

          <section className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="rounded-2xl bg-card p-6 shadow-lg">
                <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl bg-muted h-96">
                      <Image
                        src={
                          gallery[0]?.url ||
                          "/images/marketplace/placeholder-product.svg"
                        }
                        alt={product.title.en}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex gap-3 overflow-x-auto">
                      {gallery.map((image: MediaFile) => (
                        <div
                          key={image.url}
                          className="relative h-16 w-16 rounded-2xl border border-border overflow-hidden"
                        >
                          <Image
                            src={image.url}
                            alt={product.title.en}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-3xl font-semibold text-foreground">
                      {product.title.en}
                    </h1>
                    {product.summary && (
                      <p className="text-sm text-muted-foreground">
                        {product.summary}
                      </p>
                    )}
                    <div className="space-y-2 text-sm text-foreground">
                      <p>
                        <span className="font-semibold">
                          {t("marketplace.product.sku", "SKU")}:
                        </span>{" "}
                        {product.sku}
                      </p>
                      {product.brand && (
                        <p>
                          <span className="font-semibold">
                            {t("marketplace.product.brand", "Brand")}:
                          </span>{" "}
                          {product.brand}
                        </p>
                      )}
                      {product.standards?.length ? (
                        <p>
                          <span className="font-semibold">
                            {t("marketplace.product.standards", "Standards")}:
                          </span>{" "}
                          {product.standards.join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-2xl bg-primary/5 p-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                        {t(
                          "marketplace.product.specs.title",
                          "Key specifications",
                        )}
                      </h2>
                      <ul className="mt-2 space-y-1 text-sm text-foreground">
                        {Object.entries(product.specs || {}).map(
                          ([key, value]) => (
                            <li
                              key={key}
                              className="flex justify-between gap-4"
                            >
                              <span className="font-medium capitalize text-muted-foreground">
                                {key.replace(/_/g, " ")}
                              </span>
                              <span>{String(value)}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    {attachments.length > 0 && (
                      <div className="rounded-2xl border border-primary/30 bg-card p-4">
                        <h3 className="text-sm font-semibold text-primary">
                          {t(
                            "marketplace.product.documents.title",
                            "Compliance documents",
                          )}
                        </h3>
                        <ul className="mt-2 space-y-2 text-sm text-foreground">
                          {attachments.map((file: MediaFile) => (
                            <li key={file.url}>
                              <a
                                href={file.url}
                                className="hover:underline"
                                target="_blank"
                              >
                                {file.role === "MSDS"
                                  ? t(
                                      "marketplace.product.documents.msds",
                                      "Material Safety Data Sheet",
                                    )
                                  : t(
                                      "marketplace.product.documents.coa",
                                      "Certificate of Analysis",
                                    )}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <section className="rounded-2xl bg-card p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-foreground">
                  {t("marketplace.product.related.title", "Related items")}
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {product.related?.length ? (
                    product.related.map((related: Product) => (
                      <ProductCard key={related.id} product={related} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "marketplace.product.related.empty",
                        "Additional items will appear as catalogue grows.",
                      )}
                    </p>
                  )}
                </div>
              </section>
            </div>

            <PDPBuyBox product={product} />
          </section>
        </main>
      </div>
    );
  } catch (error) {
    logger.error("Failed to load product detail", { error });
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">
            {t(
              "marketplace.product.error",
              "Failed to load product details. Please try again later.",
            )}
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-block text-primary hover:underline"
          >
            {t("marketplace.product.errorCta", "Return to Marketplace")}
          </Link>
        </div>
      </div>
    );
  }
}
