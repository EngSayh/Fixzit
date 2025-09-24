import TopBarAmazon from '@/src/components/marketplace/TopBarAmazon';
import CheckoutForm from '@/src/components/marketplace/CheckoutForm';
import { cookies } from 'next/headers';
import Link from 'next/link';

async function fetchWithTenant(path: string) {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('fixzit_auth');
  const res = await fetch(path, {
    cache: 'no-store',
    headers: authCookie ? { Cookie: `fixzit_auth=${authCookie.value}` } : undefined
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export default async function CheckoutPage() {
  const [categoriesResponse, cartResponse] = await Promise.all([
    fetchWithTenant('/api/marketplace/categories'),
    fetchWithTenant('/api/marketplace/cart')
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
                {cart.lines.map((line: any) => (
                  <li key={line.productId} className="flex justify-between">
                    <span>{line.product?.title?.en ?? line.productId}</span>
                    <span>
                      {line.qty} × {line.price} {line.currency}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-[#0061A8]/30 bg-white p-6 shadow">
              <h3 className="text-sm font-semibold text-[#0061A8]">Finance automation</h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                <li>• Finance posting triggered automatically on delivery.</li>
                <li>• VAT buckets are calculated from catalogue attributes.</li>
                <li>• Work order linkage maintained for downstream audits.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
