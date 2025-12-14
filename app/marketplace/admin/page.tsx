import { logger } from "@/lib/logger";
import { serverFetchJsonWithTenant } from "@/lib/marketplace/serverFetch";
import ClientDate from "@/components/ClientDate";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = 'force-dynamic';

interface Product {
  id: string;
  title: { en: string };
  sku: string;
  buy: {
    price: number;
    currency: string;
    uom: string;
  };
  standards?: string[];
}

interface Order {
  id: string;
  status: string;
  currency: string;
  totals: {
    grand: number;
  };
  approvals?: {
    status: string;
  };
  createdAt: string | Date;
}

interface RFQ {
  id: string;
  status: string;
}

interface Category {
  id: string;
  slug: string;
  name?: { en: string };
}
const APPROVAL_STATUS_LABELS: Record<
  string,
  { key: string; fallback: string }
> = {
  APPROVAL: {
    key: "marketplace.orders.status.approval",
    fallback: "Awaiting approval",
  },
  PENDING: { key: "marketplace.orders.status.pending", fallback: "Pending" },
  CONFIRMED: {
    key: "marketplace.orders.status.confirmed",
    fallback: "Confirmed",
  },
  FULFILLED: {
    key: "marketplace.orders.status.fulfilled",
    fallback: "Fulfilled",
  },
  DELIVERED: {
    key: "marketplace.orders.status.delivered",
    fallback: "Delivered",
  },
  CANCELLED: {
    key: "marketplace.orders.status.cancelled",
    fallback: "Cancelled",
  },
};

export default async function MarketplaceAdminPage() {
  const { t } = await getServerI18n();
  const formatApprovalStatus = (status?: string | null) => {
    if (!status) {
      return t("marketplace.orders.status.unknown", "Unknown");
    }
    const normalized = status.toUpperCase();
    const config = APPROVAL_STATUS_LABELS[normalized];
    return config ? t(config.key, config.fallback) : status;
  };

  try {
    const [, productsResponse, ordersResponse, rfqResponse] = await Promise.all(
      [
        serverFetchJsonWithTenant<{ data: Category[] }>(
          "/api/marketplace/categories",
        ),
        serverFetchJsonWithTenant<{ data: { items: Product[] } }>(
          "/api/marketplace/products?limit=50",
        ),
        serverFetchJsonWithTenant<{ data: Order[] }>("/api/marketplace/orders"),
        serverFetchJsonWithTenant<{ data: RFQ[] }>("/api/marketplace/rfq"),
      ],
    );

    const products = productsResponse.data.items;
    const orders = ordersResponse.data;
    const rfqs = rfqResponse.data;

    // [CODE REVIEW]: FIX - Use Tailwind theme classes, fix React keys to use 'id'
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
          <header>
            <h1 className="text-3xl font-semibold text-foreground">
              {t("marketplace.admin.title", "Marketplace Administration")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                "marketplace.admin.subtitle",
                "Monitor catalogue health, approvals, and vendor performance.",
              )}
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-card p-6 shadow">
              <p className="text-xs uppercase tracking-wide text-primary">
                {t(
                  "marketplace.admin.metrics.activeProducts",
                  "Active products",
                )}
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {products.length}
              </p>
            </div>
            <div className="rounded-2xl bg-card p-6 shadow">
              <p className="text-xs uppercase tracking-wide text-primary">
                {t(
                  "marketplace.admin.metrics.pendingApprovals",
                  "Pending approvals",
                )}
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {orders.filter((order) => order.status === "APPROVAL").length}
              </p>
            </div>
            <div className="rounded-2xl bg-card p-6 shadow">
              <p className="text-xs uppercase tracking-wide text-primary">
                {t(
                  "marketplace.admin.metrics.deliveredOrders",
                  "Delivered orders",
                )}
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {orders.filter((order) => order.status === "DELIVERED").length}
              </p>
            </div>
            <div className="rounded-2xl bg-card p-6 shadow">
              <p className="text-xs uppercase tracking-wide text-primary">
                {t("marketplace.admin.metrics.openRfqs", "Open RFQs")}
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {rfqs.filter((rfq) => rfq.status === "OPEN").length}
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-6 shadow">
            <h2 className="text-lg font-semibold text-foreground">
              {t("marketplace.admin.catalogue.title", "Catalogue snapshot")}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-border bg-muted p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {product.title.en}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("marketplace.admin.catalogue.sku", "SKU")} {product.sku}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.buy.price} {product.buy.currency} /{" "}
                    {product.buy.uom}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("marketplace.admin.catalogue.standards", "Standards")}:{" "}
                    {product.standards?.join(", ") || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-card p-6 shadow">
            <h2 className="text-lg font-semibold text-foreground">
              {t("marketplace.admin.approvals.title", "Approval queue")}
            </h2>
            <table className="mt-4 w-full table-fixed text-start text-sm text-foreground">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">
                    {t("marketplace.admin.approvals.order", "Order")}
                  </th>
                  <th className="py-2">
                    {t("marketplace.admin.approvals.total", "Total")}
                  </th>
                  <th className="py-2">
                    {t("marketplace.admin.approvals.status", "Status")}
                  </th>
                  <th className="py-2">
                    {t("marketplace.admin.approvals.submitted", "Submitted")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders
                  .filter((order) => order.status === "APPROVAL")
                  .map((order) => (
                    <tr key={order.id} className="border-t border-border">
                      <td className="py-2">
                        {order.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-2">
                        {order.totals.grand.toFixed(2)} {order.currency}
                      </td>
                      <td className="py-2">
                        {formatApprovalStatus(order.approvals?.status)}
                      </td>
                      <td className="py-2">
                        <ClientDate date={order.createdAt} format="medium" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    );
  } catch (error) {
    logger.error("Failed to load marketplace admin data", { error });
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">
            {t(
              "marketplace.admin.error",
              "Failed to load marketplace admin data. Please try again later.",
            )}
          </p>
        </div>
      </div>
    );
  }
}
