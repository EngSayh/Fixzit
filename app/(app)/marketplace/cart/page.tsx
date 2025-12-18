import Link from "next/link";
import Image from "next/image";
import { serverFetchJsonWithTenant } from "@/lib/marketplace/serverFetch";
import { getServerI18n } from "@/lib/i18n/server";
import { SavedCartBanner } from "@/components/marketplace/SavedCartBanner";

export const dynamic = 'force-dynamic';

interface CartLine {
  productId: string;
  product?: {
    title?: { en?: string };
    slug?: string;
    media?: Array<{ url: string }>;
    buy?: {
      leadDays?: number;
      minQty?: number;
    };
  };
  qty: number;
  quantity: number;
  price: number;
  unitPrice: number;
  total: number;
  currency: string;
}

interface CartData {
  lines: CartLine[];
  total: number;
  totals: {
    subtotal: number;
    vat: number;
    grand: number;
  };
  currency: string;
}

export default async function CartPage() {
  let cart: CartData | null = null;
  let unauthorized = false;
  try {
    const cartResponse = await serverFetchJsonWithTenant<{ data: CartData }>(
      "/api/marketplace/cart",
    );
    cart = cartResponse.data;
  } catch (error) {
    const status =
      (error as Error & { status?: number })?.status ??
      (() => {
        try {
          const parsed = JSON.parse((error as Error).message || "{}");
          return parsed.status;
        } catch {
          return undefined;
        }
      })();
    unauthorized = status === 401 || status === 403;
  }
  const { t } = await getServerI18n();

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <main className="mx-auto max-w-7xl px-4 py-8 flex-1">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("marketplace.cart.title", "Shopping Cart")}
        </h1>
        {unauthorized && (
          <div className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              {t(
                "marketplace.cart.auth.required.title",
                "Sign in to restore your cart",
              )}
            </p>
            <p className="text-amber-800">
              {t(
                "marketplace.cart.auth.required.body",
                "Your cart is saved. Sign in to restore items and proceed to checkout.",
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/login"
                className="inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t("marketplace.cart.auth.required.login", "Sign in")}
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex rounded-full border border-primary/20 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                {t("marketplace.cart.auth.required.browse", "Browse catalogue")}
              </Link>
            </div>
            <SavedCartBanner />
          </div>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            {cart && cart.lines.length ? (
              cart.lines.map((line) => (
                <article
                  key={line.productId}
                  className="rounded-2xl bg-card p-6 shadow"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24 rounded-2xl border border-border overflow-hidden">
                        <Image
                          src={
                            line.product?.media?.[0]?.url ||
                            "/images/marketplace/placeholder-product.svg"
                          }
                          alt={
                            line.product?.title?.en ??
                            t("marketplace.cart.imageAlt", "Product image")
                          }
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          <Link
                            href={`/marketplace/product/${line.product?.slug ?? line.productId}`}
                            className="hover:underline"
                          >
                            {line.product?.title?.en ??
                              t(
                                "marketplace.cart.fallbackTitle",
                                "Marketplace item",
                              )}
                          </Link>
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {t("marketplace.cart.quantity", "Quantity")}:{" "}
                          {line.qty}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("marketplace.cart.unitPrice", "Unit price")}:{" "}
                          {line.price} {line.currency}
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          {t("marketplace.cart.lineTotal", "Line total")}:{" "}
                          {line.total.toFixed(2)} {line.currency}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        {t("marketplace.cart.leadTime", "Lead time")}:{" "}
                        {line.product?.buy?.leadDays ?? 2}{" "}
                        {t("marketplace.cart.days", "day(s)")}
                      </p>
                      <p>
                        {t("marketplace.cart.minOrder", "Min order")}:{" "}
                        {line.product?.buy?.minQty ?? 1}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-card p-10 text-center text-muted-foreground">
                <p className="text-lg font-semibold text-foreground">
                  {t("marketplace.cart.empty.title", "Your cart is empty")}
                </p>
                <p className="mt-2 text-sm">
                  {t(
                    "marketplace.cart.empty.subtitle",
                    "Browse categories to add ASTM and BS EN compliant items.",
                  )}
                </p>
                <Link
                  href="/marketplace"
                  className="mt-4 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {t("marketplace.cart.empty.cta", "Browse catalogue")}
                </Link>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-card p-6 shadow">
              <h2 className="text-lg font-semibold text-foreground">
                {t("marketplace.cart.summary.title", "Order summary")}
              </h2>
              {cart ? (
                <>
                  <dl className="mt-4 space-y-2 text-sm text-foreground">
                    <div className="flex justify-between">
                      <dt>{t("marketplace.cart.summary.subtotal", "Subtotal")}</dt>
                      <dd>
                        {cart.totals.subtotal.toFixed(2)} {cart.currency}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>{t("marketplace.cart.summary.vat", "VAT (15%)")}</dt>
                      <dd>
                        {cart.totals.vat.toFixed(2)} {cart.currency}
                      </dd>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-primary">
                      <dt>{t("marketplace.cart.summary.total", "Total")}</dt>
                      <dd>
                        {cart.totals.grand.toFixed(2)} {cart.currency}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href="/marketplace/checkout"
                    className="mt-6 block rounded-full bg-warning px-6 py-3 text-center text-sm font-semibold text-warning-foreground hover:bg-warning/90"
                  >
                    {t(
                      "marketplace.cart.summary.checkoutCta",
                      "Proceed to checkout",
                    )}
                  </Link>
                </>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground space-y-2">
                  <p>
                    {t(
                      "marketplace.cart.summary.authRequired",
                      "Sign in to view your saved totals and submit for approval.",
                    )}
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {t("marketplace.cart.auth.required.login", "Sign in")}
                  </Link>
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-primary/20 bg-card p-6 text-sm text-foreground shadow">
              <h3 className="text-sm font-semibold text-primary">
                {t("marketplace.cart.policy.title", "Approval policy")}
              </h3>
              <p className="mt-2">
                {t(
                  "marketplace.cart.policy.description",
                  "Orders above SAR {{amount}} will route to the approvals desk before confirmation.",
                ).replace(
                  "{{amount}}",
                  Number(
                    process.env.MARKETPLACE_APPROVAL_THRESHOLD ?? 5000,
                  ).toLocaleString(),
                )}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
