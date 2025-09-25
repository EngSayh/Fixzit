import TopBarAmazon from '@/src/components/marketplace/TopBarAmazon';
import Link from 'next/link';
import { serverFetchJsonWithTenant } from '@/src/lib/marketplace/serverFetch';

export default async function CartPage() {
  const [categoriesResponse, cartResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<any>('/api/marketplace/cart')
  ]);

  const departments = (categoriesResponse.data as any[]).map(category => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const cart = cartResponse.data;

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <TopBarAmazon departments={departments} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-[#0F1111]">Shopping Cart</h1>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            {cart.lines.length ? (
              cart.lines.map((line: any) => (
                <article key={line.productId} className="rounded-3xl bg-white p-6 shadow">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-4">
                      <img
                        src={line.product?.media?.[0]?.url || '/images/marketplace/placeholder-product.svg'}
                        alt={line.product?.title?.en ?? 'Product image'}
                        className="h-24 w-24 rounded-2xl border border-gray-200 object-cover"
                      />
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
                    <div className="text-sm text-gray-500">
                      <p>Lead time: {line.product?.buy?.leadDays ?? 2} day(s)</p>
                      <p>Min order: {line.product?.buy?.minQty ?? 1}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-[#0061A8]/40 bg-white p-10 text-center text-gray-600">
                <p className="text-lg font-semibold text-[#0F1111]">Your cart is empty</p>
                <p className="mt-2 text-sm">Browse categories to add ASTM and BS EN compliant items.</p>
                <Link
                  href="/marketplace"
                  className="mt-4 inline-flex rounded-full bg-[#0061A8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#00558F]"
                >
                  Browse catalogue
                </Link>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#0F1111]">Order summary</h2>
              <dl className="mt-4 space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{cart.totals.subtotal.toFixed(2)} {cart.currency}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>VAT (15%)</dt>
                  <dd>{cart.totals.vat.toFixed(2)} {cart.currency}</dd>
                </div>
                <div className="flex justify-between text-base font-semibold text-[#0061A8]">
                  <dt>Total</dt>
                  <dd>{cart.totals.grand.toFixed(2)} {cart.currency}</dd>
                </div>
              </dl>
              <Link
                href="/marketplace/checkout"
                className="mt-6 block rounded-full bg-[#FFB400] px-6 py-3 text-center text-sm font-semibold text-black hover:bg-[#FFCB4F]"
              >
                Proceed to checkout
              </Link>
            </div>
            <div className="rounded-3xl border border-[#0061A8]/20 bg-white p-6 text-sm text-gray-700 shadow">
              <h3 className="text-sm font-semibold text-[#0061A8]">Approval policy</h3>
              <p className="mt-2">Orders above SAR {Number(process.env.MARKETPLACE_APPROVAL_THRESHOLD ?? 5000).toLocaleString()} will route to the approvals desk before confirmation.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
