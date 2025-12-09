"use client";

import Link from "next/link";
import Image from "next/image";
import { Loader2, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { addProductToCart } from "@/lib/marketplace/cartClient";
import { logger } from "@/lib/logger";

export interface MarketplaceProductCard {
  id: string;
  slug: string;
  title: { en: string; ar?: string };
  summary?: string;
  brand?: string;
  media?: { url: string; role?: string }[];
  buy: {
    price: number;
    currency: string;
    uom: string;
    leadDays?: number;
    minQty?: number;
  };
  rating?: { avg: number; count: number };
  standards?: string[];
}

interface ProductCardProps {
  product: MarketplaceProductCard;
  onAddToCart?: (productId: string) => void;
  isRTL?: boolean;
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function ProductCard({
  product,
  onAddToCart,
  isRTL,
}: ProductCardProps) {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const [adding, setAdding] = useState(false);
  const image =
    product.media?.find((item) => item.role === "GALLERY")?.url ||
    product.media?.[0]?.url ||
    "/images/marketplace/placeholder-product.svg";
  const displayPrice = formatCurrency(
    product.buy.price,
    product.buy.currency || currency,
  );

  const handleAddToCart = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const quantity = Math.max(product.buy.minQty ?? 1, 1);
      await addProductToCart(product.id, quantity);
      onAddToCart?.(product.id);
      toast.success(
        t("marketplace.productCard.toast.success", "Added to cart"),
        {
          description: product.title.en,
        },
      );
    } catch (error) {
      import("../../lib/logger")
        .then(({ logError }) => {
          logError("Failed to add product to cart", error as Error, {
            component: "ProductCard",
            action: "handleAddToCart",
            productId: product.id,
          });
        })
        .catch((loggerError) => {
          logger.error("Failed to load logger:", { error: loggerError });
        });
      const message =
        error instanceof Error
          ? error.message
          : t("marketplace.productCard.toast.error", "Unable to add to cart");
      toast.error(
        t("marketplace.productCard.toast.error", "Unable to add to cart"),
        {
          description: message,
        },
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      data-testid="product-card"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Link
        href={`/marketplace/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        <Image
          src={image}
          alt={product.title.en}
          fill
          sizes="(max-width:768px) 100vw, 33vw"
          className="object-cover transition duration-500 hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {product.brand && (
              <p className="text-xs font-semibold uppercase tracking-wide text-success">
                {product.brand}
              </p>
            )}
            <h3 className="text-sm font-semibold text-foreground">
              <Link href={`/marketplace/product/${product.slug}`}>
                {product.title.en}
              </Link>
            </h3>
            {product.summary && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {product.summary}
              </p>
            )}
          </div>
          {product.rating && product.rating.count > 0 && (
            <div className="flex items-center gap-1 text-xs text-warning">
              <Star
                size={14}
                fill="currentColor"
                className="text-warning"
                strokeWidth={0}
              />
              <span>{product.rating.avg.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({product.rating.count})
              </span>
            </div>
          )}
        </div>

        {product.standards && product.standards.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[11px] font-medium text-primary">
            {product.standards.map((standard) => (
              <span
                key={standard}
                className="rounded-full bg-primary/10 px-2 py-1"
              >
                {standard}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-foreground">
              {displayPrice}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                "marketplace.productCard.unitLabel",
                "per {{uom}} · Min {{count}}",
              )
                .replace("{{uom}}", product.buy.uom)
                .replace("{{count}}", String(product.buy.minQty ?? 1))}
            </p>
            {product.buy.leadDays != null && (
              <p className="text-xs text-success">
                {t(
                  "marketplace.productCard.leadTime",
                  "Lead time {{days}} day(s)",
                ).replace("{{days}}", String(product.buy.leadDays))}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding}
            className="flex items-center gap-2 rounded-full bg-warning px-4 py-2 text-sm font-semibold text-black transition hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {adding ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <ShoppingCart size={16} aria-hidden />
            )}
            {adding
              ? t("marketplace.productCard.button.adding", "Adding…")
              : t("marketplace.productCard.button.add", "Add to Cart")}
          </button>
        </div>
      </div>
    </div>
  );
}
