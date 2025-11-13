
import { logger } from '@/lib/logger';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';
import ClientDate from '@/components/ClientDate';

interface OrderLine {
  productId: string;
  qty: number;
  price: number;
  currency: string;
}

// [CODE REVIEW]: FIX - Use 'id', not '_id' (Prisma/PostgreSQL convention)
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

// [CODE REVIEW]: FIX - Use Tailwind theme classes instead of hardcoded colors
const STATUS_BADGES: Record<string, string> = {
  APPROVAL: 'bg-warning/10 text-warning-foreground',
  PENDING: 'bg-primary/100/10 text-primary',
  CONFIRMED: 'bg-primary/100/10 text-primary',
  FULFILLED: 'bg-teal-500/10 text-teal-700',
  DELIVERED: 'bg-success/10 text-success-foreground',
  CANCELLED: 'bg-destructive/10 text-destructive-foreground'
};

export default async function OrdersPage() {
  try {
    const [, ordersResponse] = await Promise.all([
      serverFetchJsonWithTenant<{ data: unknown }>('/api/marketplace/categories'),
      serverFetchJsonWithTenant<{ data: Order[] }>('/api/marketplace/orders')
    ]);

    const orders = ordersResponse.data;

  // [CODE REVIEW]: FIX - Replace hardcoded colors with theme classes, fix id references
  return (
    <div className="min-h-screen bg-muted flex flex-col">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-foreground">Orders & Approvals</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track procurement across approval, fulfilment, and finance posting.</p>
        <div className="mt-6 space-y-4">
          {orders.length ? (
            orders.map(order => (
              <article key={order.id} className="rounded-2xl bg-card p-6 shadow">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-primary">Order #{order.id.slice(-6).toUpperCase()}</p>
                    <h2 className="text-lg font-semibold text-foreground">{order.lines.length} item(s)</h2>
                    <p className="text-sm text-muted-foreground">Submitted <ClientDate date={order.createdAt} format="medium" /></p>
                  </div>
                  <div className="space-y-2 text-end text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 font-semibold ${STATUS_BADGES[order.status] ?? 'bg-muted text-foreground'}`}>
                      {order.status}
                    </span>
                    <p className="font-semibold text-primary">
                      {order.totals.grand.toFixed(2)} {order.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">Approval: {order.approvals?.status ?? 'N/A'}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-foreground md:grid-cols-2">
                  {order.lines.map((line) => (
                    <div key={line.productId} className="rounded-2xl border border-border bg-muted p-3">
                      <p className="font-semibold text-foreground">{line.productId}</p>
                      <p className="text-xs text-muted-foreground">{line.qty} × {line.price} {line.currency}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-card p-10 text-center text-muted-foreground">
              <p className="text-lg font-semibold text-foreground">No orders yet</p>
              <p className="mt-2 text-sm">Place an order via the marketplace to see approval routing.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
  } catch (error) {
    logger.error('Failed to load orders page data', { error });
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Failed to load orders. Please try again later.</p>
        </div>
      </div>
    );
  }
}
