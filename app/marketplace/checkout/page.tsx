
import CheckoutForm from '@/components/marketplace/CheckoutForm';
import Link from 'next/link';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

async function loadCheckoutData() {
  try {
    const [categoriesResponse, cartResponse] = await Promise.all([
      serverFetchJsonWithTenant<any>('/api/marketplace/categories').catch(err => {
        console.error('Failed to fetch categories for checkout:', err);
        return { data: [] };
      }),
      serverFetchJsonWithTenant<any>('/api/marketplace/cart').catch(err => {
        console.error('Failed to fetch cart for checkout:', err);
        return { data: { _id: null, lines: [], totals: { grand: 0 }, currency: 'SAR' } };
      })
    ]);

    const departments = ((categoriesResponse.data || []) as any[]).map(category => ({
      slug: category.slug,
      name: category.name?.en ?? category.slug
    }));

    const cart = cartResponse.data || { _id: null, lines: [], totals: { grand: 0 }, currency: 'SAR' };

    return { departments, cart };
  } catch (error) {
    console.error('Failed to load checkout page data:', error);
    return {
      departments: [],
      cart: { _id: null, lines: [], totals: { grand: 0 }, currency: 'SAR' }
    };
  }
}

export default async function CheckoutPage() {
  const { departments, cart } = await loadCheckoutData();

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav className="text-sm text-[#0061A8]">
          <Link href="/marketplace/cart" className="hover:underline">
            Cart
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Checkout</span>
        </nav>
        <h1 className="mt-4 text-3xl font-semibold text-[#0F1111]">Checkout & Approvals</h1>
        <p className="mt-2 text-sm text-gray-600">
          Submit the order for approval. Upon delivery confirmation, the order will automatically create the finance posting per your tenant policy.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <CheckoutForm cartId={cart._id} totals={cart.totals} currency={cart.currency} />
          <aside className="space-y-4">
            <div className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#0F1111]">Order contents</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {cart.lines && cart.lines.length > 0 ? (
                  cart.lines.map((line: any) => (
                    <li key={line.productId} className="flex justify-between">
                      <span>{line.product?.title?.en ?? 'Item'} × {line.qty}</span>
                      <span>{line.total} {line.currency}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No items in cart</li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

