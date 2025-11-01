
import Link from 'next/link';
import Image from 'next/image';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

interface CartLine {
  productId: string;
  product?: {
    title?: { en?: string };
    slug?: string;
    media?: Array<{ url: string }>;
    buy?: {
      leadDays?: number;
      minQty?: number;
    };
  };
  qty: number;
  quantity: number;
  price: number;
  unitPrice: number;
  total: number;
  currency: string;
}

interface CartData {
  lines: CartLine[];
  total: number;
  totals: {
    subtotal: number;
    vat: number;
    grand: number;
  };
  currency: string;
}

export default async function CartPage() {
  const [_categoriesResponse, cartResponse] = await Promise.all([
    serverFetchJsonWithTenant<{ data: unknown }>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<{ data: CartData }>('/api/marketplace/cart')
  ]);

  const cart = cartResponse.data;

  // [CODE REVIEW]: FIX - Replace all hardcoded colors with Tailwind theme classes
  return (
    <div className="min-h-screen bg-muted flex flex-col">
      
      <main className="mx-auto max-w-7xl px-4 py-8 flex-1">
        <h1 className="text-3xl font-semibold text-foreground">Shopping Cart</h1>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            {cart.lines.length ? (
              cart.lines.map((line) => (
                <article key={line.productId} className="rounded-2xl bg-card p-6 shadow">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24 rounded-2xl border border-border overflow-hidden">
                        <Image
                          src={line.product?.media?.[0]?.url || '/images/marketplace/placeholder-product.svg'}
                          alt={line.product?.title?.en ?? 'Product image'}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          <Link href={`/marketplace/product/${line.product?.slug ?? line.productId}`} className="hover:underline">
                            {line.product?.title?.en ?? 'Marketplace item'}
                          </Link>
                        </h2>
                        <p className="text-sm text-muted-foreground">Quantity: {line.qty}</p>
                        <p className="text-sm text-muted-foreground">Unit price: {line.price} {line.currency}</p>
                        <p className="text-sm font-semibold text-primary">Line total: {line.total.toFixed(2)} {line.currency}</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Lead time: {line.product?.buy?.leadDays ?? 2} day(s)</p>
                      <p>Min order: {line.product?.buy?.minQty ?? 1}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-card p-10 text-center text-muted-foreground">
                <p className="text-lg font-semibold text-foreground">Your cart is empty</p>
                <p className="mt-2 text-sm">Browse categories to add ASTM and BS EN compliant items.</p>
                <Link
                  href="/marketplace"
                  className="mt-4 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Browse catalogue
                </Link>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-card p-6 shadow">
              <h2 className="text-lg font-semibold text-foreground">Order summary</h2>
              <dl className="mt-4 space-y-2 text-sm text-foreground">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{cart.totals.subtotal.toFixed(2)} {cart.currency}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>VAT (15%)</dt>
                  <dd>{cart.totals.vat.toFixed(2)} {cart.currency}</dd>
                </div>
                <div className="flex justify-between text-base font-semibold text-primary">
                  <dt>Total</dt>
                  <dd>{cart.totals.grand.toFixed(2)} {cart.currency}</dd>
                </div>
              </dl>
              <Link
                href="/marketplace/checkout"
                className="mt-6 block rounded-full bg-warning px-6 py-3 text-center text-sm font-semibold text-warning-foreground hover:bg-warning/90"
              >
                Proceed to checkout
              </Link>
            </div>
            <div className="rounded-3xl border border-primary/20 bg-card p-6 text-sm text-foreground shadow">
              <h3 className="text-sm font-semibold text-primary">Approval policy</h3>
              <p className="mt-2">Orders above SAR {Number(process.env.MARKETPLACE_APPROVAL_THRESHOLD ?? 5000).toLocaleString()} will route to the approvals desk before confirmation.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

