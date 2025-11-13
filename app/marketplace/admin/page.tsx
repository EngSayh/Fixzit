
import { logger } from '@/lib/logger';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';
import ClientDate from '@/components/ClientDate';

// [CODE REVIEW]: FIX - Use 'id', not '_id' (Prisma/PostgreSQL convention)
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

export default async function MarketplaceAdminPage() {
  try {
    const [, productsResponse, ordersResponse, rfqResponse] = await Promise.all([
      serverFetchJsonWithTenant<{ data: Category[] }>('/api/marketplace/categories'),
      serverFetchJsonWithTenant<{ data: { items: Product[] } }>('/api/marketplace/products?limit=50'),
      serverFetchJsonWithTenant<{ data: Order[] }>('/api/marketplace/orders'),
      serverFetchJsonWithTenant<{ data: RFQ[] }>('/api/marketplace/rfq')
    ]);

    const products = productsResponse.data.items;
    const orders = ordersResponse.data;
    const rfqs = rfqResponse.data;

  // [CODE REVIEW]: FIX - Use Tailwind theme classes, fix React keys to use 'id'
  return (
    <div className="min-h-screen bg-muted flex flex-col">
      
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <header>
          <h1 className="text-3xl font-semibold text-foreground">Marketplace Administration</h1>
          <p className="text-sm text-muted-foreground">Monitor catalogue health, approvals, and vendor performance.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-card p-6 shadow">
            <p className="text-xs uppercase tracking-wide text-primary">Active products</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{products.length}</p>
          </div>
          <div className="rounded-2xl bg-card p-6 shadow">
            <p className="text-xs uppercase tracking-wide text-primary">Pending approvals</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{orders.filter(order => order.status === 'APPROVAL').length}</p>
          </div>
          <div className="rounded-2xl bg-card p-6 shadow">
            <p className="text-xs uppercase tracking-wide text-primary">Delivered orders</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{orders.filter(order => order.status === 'DELIVERED').length}</p>
          </div>
          <div className="rounded-2xl bg-card p-6 shadow">
            <p className="text-xs uppercase tracking-wide text-primary">Open RFQs</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{rfqs.filter(rfq => rfq.status === 'OPEN').length}</p>
          </div>
        </section>

        <section className="rounded-2xl bg-card p-6 shadow">
          <h2 className="text-lg font-semibold text-foreground">Catalogue snapshot</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.slice(0, 6).map(product => (
              <div key={product.id} className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-sm font-semibold text-foreground">{product.title.en}</p>
                <p className="text-xs text-muted-foreground">SKU {product.sku}</p>
                <p className="text-xs text-muted-foreground">
                  {product.buy.price} {product.buy.currency} / {product.buy.uom}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Standards: {product.standards?.join(', ') || 'N/A'}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-card p-6 shadow">
          <h2 className="text-lg font-semibold text-foreground">Approval queue</h2>
          <table className="mt-4 w-full table-fixed text-start text-sm text-foreground">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Order</th>
                <th className="py-2">Total</th>
                <th className="py-2">Status</th>
                <th className="py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter(order => order.status === 'APPROVAL')
                .map(order => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="py-2">{order.id.slice(-6).toUpperCase()}</td>
                    <td className="py-2">
                      {order.totals.grand.toFixed(2)} {order.currency}
                    </td>
                    <td className="py-2">{order.approvals?.status}</td>
                    <td className="py-2"><ClientDate date={order.createdAt} format="medium" /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
  } catch (error) {
    logger.error('Failed to load marketplace admin data', { error });
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Failed to load marketplace admin data. Please try again later.</p>
        </div>
      </div>
    );
  }
}
