
import Link from 'next/link';
import Image from 'next/image';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

async function loadCartData() {
  try {
    const [categoriesResponse, cartResponse] = await Promise.all([
      serverFetchJsonWithTenant<any>('/api/marketplace/categories').catch(err => {
        console.error('Failed to fetch categories for cart:', err);
        return { data: [] };
      }),
      serverFetchJsonWithTenant<any>('/api/marketplace/cart').catch(err => {
        console.error('Failed to fetch cart:', err);
        return { data: { lines: [], totals: { subtotal: 0, tax: 0, grand: 0, currency: 'SAR' } } };
      })
    ]);

    const departments = ((categoriesResponse.data || []) as any[]).map(category => ({
      slug: category.slug,
      name: category.name?.en ?? category.slug
    }));

    const cart = cartResponse.data || { lines: [], totals: { subtotal: 0, tax: 0, grand: 0, currency: 'SAR' } };

    return { departments, cart };
  } catch (error) {
    console.error('Failed to load cart page data:', error);
    return {
      departments: [],
      cart: { lines: [], totals: { subtotal: 0, tax: 0, grand: 0, currency: 'SAR' } }
    };
  }
}

export default async function CartPage() {
  const { departments, cart } = await loadCartData();

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-[#0F1111]">Shopping Cart</h1>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            {cart.lines && cart.lines.length ? (
              cart.lines.map((line: any) => (
                <article key={line.productId} className="rounded-3xl bg-white p-6 shadow">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24 rounded-2xl border border-gray-200 overflow-hidden">
                        <Image
                          src={line.product?.media?.[0]?.url || '/images/marketplace/placeholder-product.svg'}
                          alt={line.product?.title?.en ?? 'Product image'}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#0F1111]">
                          <Link href={`/marketplace/product/${line.product?.slug ?? line.productId}`} className="hover:underline">
                            {line.product?.title?.en ?? 'Marketplace item'}
                          </Link>
                        </h2>
                        <p className="text-sm text-gray-600">Quantity: {line.qty}</p>
                        <p className="text-sm text-gray-600">Unit price: {line.price} {line.currency}</p>
                        <p className="text-sm font-semibold text-[#0061A8]">Line total: {line.total.toFixed(2)} {line.currency}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl bg-white p-10 text-center text-gray-600">
                <p className="text-lg font-semibold">Your cart is empty</p>
                <Link href="/marketplace" className="mt-4 inline-block text-[#0061A8] hover:underline">
                  Continue shopping
                </Link>
              </div>
            )}
          </section>

          <aside className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-[#0F1111]">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{cart.totals?.subtotal ?? 0} {cart.totals?.currency ?? 'SAR'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{cart.totals?.tax ?? 0} {cart.totals?.currency ?? 'SAR'}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{cart.totals?.grand ?? 0} {cart.totals?.currency ?? 'SAR'}</span>
              </div>
            </div>
            <Link
              href="/marketplace/checkout"
              className="mt-6 block rounded-full bg-[#0061A8] px-6 py-3 text-center text-white font-semibold hover:bg-[#00558F]"
            >
              Proceed to Checkout
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

