
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

export default async function MarketplaceAdminPage() {
  const [categoriesResponse, productsResponse, ordersResponse, rfqResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<any>('/api/marketplace/products?limit=50'),
    serverFetchJsonWithTenant<any>('/api/marketplace/orders'),
    serverFetchJsonWithTenant<any>('/api/marketplace/rfq')
  ]);

  const departments = (categoriesResponse.data as unknown[]).map((category: unknown) => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const products = productsResponse.data.items as unknown[];
  const orders = ordersResponse.data as unknown[];
  const rfqs = rfqResponse.data as unknown[];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <header>
          <h1 className="text-3xl font-semibold text-[#0F1111]">Marketplace Administration</h1>
          <p className="text-sm text-gray-600">Monitor catalogue health, approvals, and vendor performance.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-xs uppercase tracking-wide text-[#0061A8]">Active products</p>
            <p className="mt-2 text-3xl font-bold text-[#0F1111]">{products.length}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-xs uppercase tracking-wide text-[#0061A8]">Pending approvals</p>
            <p className="mt-2 text-3xl font-bold text-[#0F1111]">{orders.filter(order => order.status === 'APPROVAL').length}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-xs uppercase tracking-wide text-[#0061A8]">Delivered orders</p>
            <p className="mt-2 text-3xl font-bold text-[#0F1111]">{orders.filter(order => order.status === 'DELIVERED').length}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-xs uppercase tracking-wide text-[#0061A8]">Open RFQs</p>
            <p className="mt-2 text-3xl font-bold text-[#0F1111]">{rfqs.filter(rfq => rfq.status === 'OPEN').length}</p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-[#0F1111]">Catalogue snapshot</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.slice(0, 6).map(product => (
              <div key={product._id} className="rounded-2xl border border-gray-100 bg-[#F8FBFF] p-4">
                <p className="text-sm font-semibold text-[#0F1111]">{product.title.en}</p>
                <p className="text-xs text-gray-600">SKU {product.sku}</p>
                <p className="text-xs text-gray-600">
                  {product.buy.price} {product.buy.currency} / {product.buy.uom}
                </p>
                <p className="mt-2 text-xs text-gray-500">Standards: {product.standards?.join(', ') || 'N/A'}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-[#0F1111]">Approval queue</h2>
          <table className="mt-4 w-full table-fixed text-left text-sm text-gray-700">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-500">
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
                  <tr key={order._id} className="border-t border-gray-100">
                    <td className="py-2">{order._id.slice(-6).toUpperCase()}</td>
                    <td className="py-2">
                      {order.totals.grand.toFixed(2)} {order.currency}
                    </td>
                    <td className="py-2">{order.approvals?.status}</td>
                    <td className="py-2">{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
