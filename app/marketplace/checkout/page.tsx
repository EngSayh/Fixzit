import { logger } from '@/lib/logger';
import CheckoutForm from '@/components/marketplace/CheckoutForm';
import Link from 'next/link';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';
import { getServerI18n } from '@/lib/i18n/server';

interface CartLine {
  productId: string;
  product?: {
    title?: { en?: string };
  };
  qty: number;
  price: number;
  currency: string;
}

interface CartData {
  id: string;
  lines: CartLine[];
  totals: { subtotal: number; vat: number; grand: number };
  currency: string;
}

export default async function CheckoutPage() {
  const { t } = await getServerI18n();

  try {
    const [, cartResponse] = await Promise.all([
      serverFetchJsonWithTenant<{ data: unknown }>('/api/marketplace/categories'),
      serverFetchJsonWithTenant<{ data: CartData }>('/api/marketplace/cart')
    ]);

    const cart = cartResponse.data;

    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <main className="mx-auto max-w-7xl px-4 py-8 flex-1">
          <nav className="text-sm text-primary">
            <Link href="/marketplace/cart" className="hover:underline">
              {t('marketplace.checkout.breadcrumb.cart', 'Cart')}
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="text-muted-foreground">
              {t('marketplace.checkout.breadcrumb.checkout', 'Checkout')}
            </span>
          </nav>
          <h1 className="mt-4 text-3xl font-semibold text-foreground">
            {t('marketplace.checkout.title', 'Checkout & Approvals')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              'marketplace.checkout.description',
              'Submit the order for approval. Upon delivery confirmation, the order will automatically create the finance posting per your tenant policy.'
            )}
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <CheckoutForm cartId={cart.id} totals={cart.totals} currency={cart.currency} />
            <aside className="space-y-4">
              <div className="rounded-2xl bg-card p-6 shadow">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('marketplace.checkout.contents.title', 'Order contents')}
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {cart.lines.map((line) => (
                    <li key={line.productId} className="flex justify-between">
                      <span>{line.product?.title?.en ?? line.productId}</span>
                      <span>
                        {line.qty} × {line.price} {line.currency}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow">
                <h3 className="text-sm font-semibold text-primary">
                  {t('marketplace.checkout.finance.title', 'Finance automation')}
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>
                    {t(
                      'marketplace.checkout.finance.point1',
                      'Finance posting triggered automatically on delivery.'
                    )}
                  </li>
                  <li>
                    {t(
                      'marketplace.checkout.finance.point2',
                      'VAT buckets are calculated from catalogue attributes.'
                    )}
                  </li>
                  <li>
                    {t(
                      'marketplace.checkout.finance.point3',
                      'Work order linkage maintained for downstream audits.'
                    )}
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  } catch (error) {
    logger.error('Failed to load checkout page data', { error });
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">
            {t('marketplace.checkout.error.message', 'Failed to load cart data. Please try again later.')}
          </p>
          <Link href="/marketplace/cart" className="mt-4 inline-block text-primary hover:underline">
            {t('marketplace.checkout.error.cta', 'Return to Cart')}
          </Link>
        </div>
      </div>
    );
  }
}
