'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Timer, Truck } from 'lucide-react';
import clsx from 'clsx';
import { useCurrency } from '@/contexts/CurrencyContext';
import { addProductToCart } from '@/lib/marketplace/cartClient';
import { logger } from '@/lib/logger';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

// [CODE REVIEW]: FIX - Use 'id', not '_id' (Prisma/PostgreSQL convention)
interface PDPBuyBoxProps {
  product: {
    id: string;
    sku: string;
    buy: { price: number; currency: string; uom: string; leadDays?: number; minQty?: number };
    stock?: { onHand: number; reserved: number; location?: string };
    standards?: string[];
  };
  // eslint-disable-next-line no-unused-vars
  onAddToCart?: (quantity: number) => Promise<void> | void;
  onRequestRFQ?: () => void;
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function PDPBuyBox({ product, onAddToCart, onRequestRFQ }: PDPBuyBoxProps) {
  const { currency } = useCurrency();
  const [quantity, setQuantity] = useState(product.buy.minQty ?? 1);
  const [submitting, setSubmitting] = useState(false);
  const available = (product.stock?.onHand ?? 0) - (product.stock?.reserved ?? 0);
  const auto = useAutoTranslator('marketplace.pdpBuyBox');
  const addToCartFallback = auto('Unable to add to cart', 'errors.addToCart');

  const handleAddToCart = async () => {
    if (submitting || quantity <= 0) return;
    setSubmitting(true);
    try {
      const minQty = Math.max(product.buy.minQty ?? 1, 1);
      const effectiveQuantity = Math.max(quantity, minQty);
      if (effectiveQuantity !== quantity) {
        setQuantity(effectiveQuantity);
      }
      await addProductToCart(product.id, effectiveQuantity);
      onAddToCart?.(effectiveQuantity);
    } catch (error) {
      import('../../lib/logger')
        .then(({ logError }) => {
          logError('Failed to add product to cart', error as Error, {
            component: 'PDPBuyBox',
            action: 'handleAddToCart',
            productId: product.id,
            quantity,
          });
        })
        .catch((loggerError) => {
          logger.error('Failed to load logger:', { error: loggerError });
        });
      if (typeof window !== 'undefined') {
        const message = error instanceof Error ? error.message : addToCartFallback;
        window.alert?.(
          auto('Unable to add to cart: {{message}}', 'errors.addToCartAlert').replace(
            '{{message}}',
            message
          )
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const priceLabel = formatCurrency(product.buy.price, product.buy.currency || currency);

  return (
    <aside className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {auto('SKU {{sku}}', 'header.sku').replace('{{sku}}', product.sku)}
          </p>
          <p className="text-2xl font-semibold text-foreground">{priceLabel}</p>
          <p className="text-xs text-muted-foreground">
            {auto('per {{uom}} · Min order {{min}}', 'header.uom')
              .replace('{{uom}}', product.buy.uom)
              .replace('{{min}}', String(product.buy.minQty ?? 1))}
          </p>
        </div>
        {product.buy.leadDays != null && (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Timer size={14} aria-hidden />
            {auto('Lead {{days}}d', 'badges.leadTime').replace(
              '{{days}}',
              String(product.buy.leadDays)
            )}
          </span>
        )}
      </div>

      <div className={clsx('rounded-2xl border px-4 py-3 text-sm', available > 0 ? 'border-success/40 bg-success/10 text-success-foreground' : 'border-destructive/20 bg-red-50 text-destructive')}>
        <p className="font-semibold">
          {available > 0
            ? auto('Available for immediate fulfilment', 'availability.available')
            : auto('Currently out of stock', 'availability.unavailable')}
        </p>
        {product.stock?.location && (
          <p className="text-xs opacity-80">
            {auto('Location: {{location}}', 'availability.location').replace(
              '{{location}}',
              product.stock.location
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground" htmlFor="quantity-input">
          {auto('Quantity', 'form.quantityLabel')}
        </label>
        <input
          id="quantity-input"
          type="number"
          min={product.buy.minQty ?? 1}
          step={product.buy.minQty ?? 1}
          value={quantity}
          onChange={event => setQuantity(Number(event.target.value) || (product.buy.minQty ?? 1))}
          className="h-11 w-24 rounded-2xl border border-border px-3 text-center text-lg font-semibold"
        />
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={submitting || available <= 0}
          className="flex items-center justify-center gap-2 rounded-full bg-warning px-6 py-3 text-sm font-semibold text-black transition hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {submitting ? auto('Adding…', 'actions.adding') : auto('Add to Cart', 'actions.addToCart')}
        </button>
        <button
          type="button"
          onClick={onRequestRFQ}
          className="flex items-center justify-center gap-2 rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
        >
          {auto('Request RFQ', 'actions.requestRfq')}
        </button>
      </div>

      <ul className="space-y-3 text-sm text-foreground">
        <li className="flex items-center gap-2">
          <Truck size={16} className="text-primary" aria-hidden />
          {auto('Delivery within {{days}} business days across KSA', 'highlights.delivery').replace(
            '{{days}}',
            String(product.buy.leadDays ?? 2)
          )}
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-success" aria-hidden />
          {auto('VAT invoices issued automatically at delivery confirmation', 'highlights.vat')}
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" aria-hidden />
          {auto(
            'Finance approval triggered for orders above policy threshold',
            'highlights.finance'
          )}
        </li>
      </ul>
    </aside>
  );
}
