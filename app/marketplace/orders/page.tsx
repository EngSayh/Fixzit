import { logger } from "@/lib/logger";
import { serverFetchJsonWithTenant } from "@/lib/marketplace/serverFetch";
import ClientDate from "@/components/ClientDate";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = 'force-dynamic';

interface OrderLine {
  productId: string;
  qty: number;
  price: number;
  currency: string;
}

interface Order {
  id: string;
  lines: OrderLine[];
  createdAt: string;
  status: string;
  totals: {
    grand: number;
  };
  currency: string;
  approvals?: {
    status?: string;
  };
}

// Status badge and translation mapping using Tailwind theme classes
const STATUS_RESOURCES: Record<
  string,
  { badge: string; translationKey: string; fallback: string }
> = {
  APPROVAL: {
    badge: "bg-warning/10 text-warning-foreground",
    translationKey: "marketplace.orders.status.approval",
    fallback: "Awaiting approval",
  },
  PENDING: {
    badge: "bg-primary/10 text-primary",
    translationKey: "marketplace.orders.status.pending",
    fallback: "Pending",
  },
  CONFIRMED: {
    badge: "bg-primary/10 text-primary",
    translationKey: "marketplace.orders.status.confirmed",
    fallback: "Confirmed",
  },
  FULFILLED: {
    badge: "bg-success/10 text-success-foreground",
    translationKey: "marketplace.orders.status.fulfilled",
    fallback: "Fulfilled",
  },
  DELIVERED: {
    badge: "bg-success/10 text-success-foreground",
    translationKey: "marketplace.orders.status.delivered",
    fallback: "Delivered",
  },
  CANCELLED: {
    badge: "bg-destructive/10 text-destructive-foreground",
    translationKey: "marketplace.orders.status.cancelled",
    fallback: "Cancelled",
  },
};

export default async function OrdersPage() {
  const { t } = await getServerI18n();
  try {
    const [, ordersResponse] = await Promise.all([
      serverFetchJsonWithTenant<{ data: unknown }>(
        "/api/marketplace/categories",
      ),
      serverFetchJsonWithTenant<{ data: Order[] }>("/api/marketplace/orders"),
    ]);

    const orders = ordersResponse.data;

    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <main className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-3xl font-semibold text-foreground">
            {t("marketplace.orders.title", "Orders & Approvals")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "marketplace.orders.subtitle",
              "Track procurement across approval, fulfilment, and finance posting.",
            )}
          </p>
          <div className="mt-6 space-y-4">
            {orders.length ? (
              orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl bg-card p-6 shadow"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-primary">
                        {t(
                          "marketplace.orders.orderNumber",
                          "Order #{{id}}",
                        ).replace("{{id}}", order.id.slice(-6).toUpperCase())}
                      </p>
                      <h2 className="text-lg font-semibold text-foreground">
                        {t(
                          "marketplace.orders.itemsCount",
                          "{{count}} item(s)",
                        ).replace("{{count}}", order.lines.length.toString())}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {t("marketplace.orders.submitted", "Submitted")}{" "}
                        <ClientDate date={order.createdAt} format="medium" />
                      </p>
                    </div>
                    <div className="space-y-2 text-end text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 font-semibold ${STATUS_RESOURCES[order.status]?.badge ?? "bg-muted text-foreground"}`}
                      >
                        {t(
                          STATUS_RESOURCES[order.status]?.translationKey ??
                            "marketplace.orders.status.pending",
                          STATUS_RESOURCES[order.status]?.fallback ??
                            order.status,
                        )}
                      </span>
                      <p className="font-semibold text-primary">
                        {order.totals.grand.toFixed(2)} {order.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("marketplace.orders.approvalStatus", "Approval")}:{" "}
                        {order.approvals?.status
                          ? t(
                              STATUS_RESOURCES[order.approvals.status]
                                ?.translationKey ??
                                "marketplace.orders.status.pending",
                              STATUS_RESOURCES[order.approvals.status]
                                ?.fallback ?? order.approvals.status,
                            )
                          : t("common.notAvailable", "N/A")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-foreground md:grid-cols-2">
                    {order.lines.map((line) => (
                      <div
                        key={line.productId}
                        className="rounded-2xl border border-border bg-muted p-3"
                      >
                        <p className="font-semibold text-foreground">
                          {line.productId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {line.qty} × {line.price} {line.currency}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-card p-10 text-center text-muted-foreground">
                <p className="text-lg font-semibold text-foreground">
                  {t("marketplace.orders.empty.title", "No orders yet")}
                </p>
                <p className="mt-2 text-sm">
                  {t(
                    "marketplace.orders.empty.subtitle",
                    "Place an order via the marketplace to see approval routing.",
                  )}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  } catch (error) {
    logger.error("Failed to load orders page data", { error });
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">
            {t(
              "marketplace.orders.error.message",
              "Failed to load orders. Please try again later.",
            )}
          </p>
        </div>
      </div>
    );
  }
}
