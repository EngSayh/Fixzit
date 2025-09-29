import TopBarAmazon from &apos;@/src/components/marketplace/TopBarAmazon&apos;;
import { serverFetchJsonWithTenant } from &apos;@/src/lib/marketplace/serverFetch&apos;;

const STATUS_BADGES: Record<string, string> = {
  APPROVAL: &apos;bg-amber-100 text-amber-700&apos;,
  PENDING: &apos;bg-blue-100 text-blue-700&apos;,
  CONFIRMED: &apos;bg-indigo-100 text-indigo-700&apos;,
  FULFILLED: &apos;bg-teal-100 text-teal-700&apos;,
  DELIVERED: &apos;bg-green-100 text-green-700&apos;,
  CANCELLED: &apos;bg-red-100 text-red-700&apos;
};

export default async function OrdersPage() {
  const [categoriesResponse, ordersResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>(&apos;/api/marketplace/categories&apos;),
    serverFetchJsonWithTenant<any>(&apos;/api/marketplace/orders&apos;)
  ]);

  const departments = (categoriesResponse.data as any[]).map(category => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const orders = ordersResponse.data as any[];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <TopBarAmazon departments={departments} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-[#0F1111]">Orders & Approvals</h1>
        <p className="mt-2 text-sm text-gray-600">Track procurement across approval, fulfilment, and finance posting.</p>
        <div className="mt-6 space-y-4">
          {orders.length ? (
            orders.map(order => (
              <article key={order._id} className="rounded-3xl bg-white p-6 shadow">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#0061A8]">Order #{order._id.slice(-6).toUpperCase()}</p>
                    <h2 className="text-lg font-semibold text-[#0F1111]">{order.lines.length} item(s)</h2>
                    <p className="text-sm text-gray-600">Submitted {new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="space-y-2 text-right text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 font-semibold ${STATUS_BADGES[order.status] ?? 'bg-gray-200 text-gray-700&apos;}`}>
                      {order.status}
                    </span>
                    <p className="font-semibold text-[#0061A8]">
                      {order.totals.grand.toFixed(2)} {order.currency}
                    </p>
                    <p className="text-xs text-gray-500">Approval: {order.approvals?.status ?? 'N/A&apos;}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
                  {order.lines.map((line: any) => (
                    <div key={line.productId} className="rounded-2xl border border-gray-100 bg-[#F8FBFF] p-3">
                      <p className="font-semibold text-[#0F1111]">{line.productId}</p>
                      <p className="text-xs text-gray-500">{line.qty} × {line.price} {line.currency}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#0061A8]/40 bg-white p-10 text-center text-gray-600">
              <p className="text-lg font-semibold text-[#0F1111]">No orders yet</p>
              <p className="mt-2 text-sm">Place an order via the marketplace to see approval routing.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
