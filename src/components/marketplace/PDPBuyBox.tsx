'use client&apos;;

import { useState } from &apos;react&apos;;
import { CheckCircle2, Loader2, ShieldCheck, Timer, Truck } from &apos;lucide-react&apos;;
import clsx from &apos;clsx&apos;;
import { useCurrency } from &apos;@/src/contexts/CurrencyContext&apos;;
import { addProductToCart } from &apos;@/src/lib/marketplace/cartClient&apos;;

interface PDPBuyBoxProps {
  product: {
    _id: string;
    sku: string;
    buy: { price: number; currency: string; uom: string; leadDays?: number; minQty?: number };
    stock?: { onHand: number; reserved: number; location?: string };
    standards?: string[];
  };
  onAddToCart?: (quantity: number) => Promise<void> | void;
  onRequestRFQ?: () => void;
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(&apos;en-US&apos;, { style: &apos;currency&apos;, currency }).format(value);
  } catch (error) {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function PDPBuyBox({ product, onAddToCart, onRequestRFQ }: PDPBuyBoxProps) {
  const { currency } = useCurrency();
  const [quantity, setQuantity] = useState(product.buy.minQty ?? 1);
  const [submitting, setSubmitting] = useState(false);
  const available = (product.stock?.onHand ?? 0) - (product.stock?.reserved ?? 0);

  const handleAddToCart = async () => {
    if (submitting || quantity <= 0) return;
    setSubmitting(true);
    try {
      const minQty = Math.max(product.buy.minQty ?? 1, 1);
      const effectiveQuantity = Math.max(quantity, minQty);
      if (effectiveQuantity !== quantity) {
        setQuantity(effectiveQuantity);
      }
      await addProductToCart(product._id, effectiveQuantity);
      onAddToCart?.(effectiveQuantity);
    } catch (error) {
      console.error(&apos;Failed to add product to cart&apos;, error);
      if (typeof window !== &apos;undefined&apos;) {
        const message = error instanceof Error ? error.message : &apos;Unable to add to cart&apos;;
        window.alert?.(`Unable to add to cart: ${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const priceLabel = formatCurrency(product.buy.price, product.buy.currency || currency);

  return (
    <aside className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0061A8]">SKU {product.sku}</p>
          <p className="text-2xl font-semibold text-[#0F1111]">{priceLabel}</p>
          <p className="text-xs text-gray-500">per {product.buy.uom} · Min order {product.buy.minQty ?? 1}</p>
        </div>
        {product.buy.leadDays != null && (
          <span className="flex items-center gap-1 rounded-full bg-[#0061A8]/10 px-3 py-1 text-xs font-semibold text-[#0061A8]">
            <Timer size={14} aria-hidden />
            Lead {product.buy.leadDays}d
          </span>
        )}
      </div>

      <div className={clsx(&apos;rounded-xl border px-4 py-3 text-sm&apos;, available > 0 ? &apos;border-[#00A859]/40 bg-[#00A859]/10 text-[#004728]&apos; : &apos;border-red-200 bg-red-50 text-red-700&apos;)}>
        <p className="font-semibold">{available > 0 ? &apos;Available for immediate fulfilment&apos; : &apos;Currently out of stock&apos;}</p>
        {product.stock?.location && <p className="text-xs opacity-80">Location: {product.stock.location}</p>}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700" htmlFor="quantity-input">
          Quantity
        </label>
        <input
          id="quantity-input"
          type="number"
          min={product.buy.minQty ?? 1}
          step={product.buy.minQty ?? 1}
          value={quantity}
          onChange={event => setQuantity(Number(event.target.value) || (product.buy.minQty ?? 1))}
          className="h-11 w-24 rounded-lg border border-gray-300 px-3 text-center text-lg font-semibold"
        />
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={submitting || available <= 0}
          className="flex items-center justify-center gap-2 rounded-full bg-[#FFB400] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#FFCB4F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {submitting ? &apos;Adding…&apos; : &apos;Add to Cart&apos;}
        </button>
        <button
          type="button"
          onClick={onRequestRFQ}
          className="flex items-center justify-center gap-2 rounded-full border border-[#0061A8] px-6 py-3 text-sm font-semibold text-[#0061A8] transition hover:bg-[#0061A8] hover:text-white"
        >
          Request RFQ
        </button>
      </div>

      <ul className="space-y-3 text-sm text-gray-700">
        <li className="flex items-center gap-2">
          <Truck size={16} className="text-[#0061A8]" aria-hidden />
          Delivery within {product.buy.leadDays ?? 2} business days across KSA
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#00A859]" aria-hidden />
          VAT invoices issued automatically at delivery confirmation
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#0061A8]" aria-hidden />
          Finance approval triggered for orders above policy threshold
        </li>
      </ul>
    </aside>
  );
}
