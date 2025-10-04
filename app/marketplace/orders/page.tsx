
import Link from 'next/link';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

async function loadOrdersData() {
  try {
    const [categoriesResponse, ordersResponse] = await Promise.all([
      serverFetchJsonWithTenant<any>('/api/marketplace/categories').catch(err => {
        console.error('Failed to fetch categories for orders:', err);
        return { data: [] };
      }),
      serverFetchJsonWithTenant<any>('/api/marketplace/orders').catch(err => {
        console.error('Failed to fetch orders:', err);
        return { data: [] };
      })
    ]);

    const departments = ((categoriesResponse.data || []) as any[]).map(category => ({
      slug: category.slug,
      name: category.name?.en ?? category.slug
    }));

    const orders = (ordersResponse.data || []) as any[];

    return { departments, orders };
  } catch (error) {
    console.error('Failed to load orders page data:', error);
    return { departments: [], orders: [] };
  }
}

export default async function OrdersPage() {
  const { departments, orders } = await loadOrdersData();

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-[#0F1111]">My Orders</h1>
        <div className="mt-6 space-y-4">
          {orders.length > 0 ? (
            orders.map((order: any) => (
              <article key={order._id} className="rounded-3xl bg-white p-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0F1111]">Order #{order.orderNumber}</h2>
                    <p className="text-sm text-gray-600">Status: {order.status}</p>
                  </div>
                  <Link
                    href={`/marketplace/orders/${order._id}`}
                    className="text-[#0061A8] hover:underline font-semibold"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center text-gray-600">
              <p className="text-lg font-semibold">No orders yet</p>
              <Link href="/marketplace" className="mt-4 inline-block text-[#0061A8] hover:underline">
                Start shopping
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

