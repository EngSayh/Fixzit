import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { MarketplaceProduct } from "@/server/models/MarketplaceProduct";

type RouteParams =
  | { params: { slug: string } }
  | { params: Promise<{ slug: string }> };

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" && value !== null && "then" in (value as object)
  );
}

const DEFAULT_TENANT =
  process.env.NEXT_PUBLIC_MARKETPLACE_TENANT || "demo-tenant";

type PriceItem =
  | { listPrice?: number | null; currency?: string | null }
  | null
  | undefined;
type InventoryItem =
  | { onHand?: number | null; leadDays?: number | null }
  | null
  | undefined;

function buildBuyBox(product: {
  prices?: PriceItem[];
  inventories?: InventoryItem[];
}) {
  const firstPrice =
    Array.isArray(product.prices) && product.prices.length > 0
      ? product.prices[0]
      : null;
  const firstInventory =
    Array.isArray(product.inventories) && product.inventories.length > 0
      ? product.inventories[0]
      : null;

  const priceValue =
    typeof firstPrice?.listPrice === "number" ? firstPrice.listPrice : null;
  const currencyValue =
    firstPrice?.currency && firstPrice.currency.trim()
      ? firstPrice.currency
      : "SAR";

  const onHand =
    typeof firstInventory?.onHand === "number" ? firstInventory.onHand : 0;
  const leadDays =
    typeof firstInventory?.leadDays === "number" && firstInventory.leadDays > 0
      ? firstInventory.leadDays
      : 3;

  return {
    price: priceValue,
    currency: currencyValue || "SAR",
    inStock: onHand > 0,
    leadDays,
  };
}

export async function GET(_request: NextRequest, route: RouteParams) {
  const params = isPromise(route.params) ? await route.params : route.params;
  const { slug } = params;
  const decodedSlug = decodeURIComponent(slug);
  const tenantId = process.env.NEXT_PUBLIC_MARKETPLACE_TENANT || DEFAULT_TENANT;

  try {
    const productQuery = MarketplaceProduct.findOne({
      tenantId,
      slug: decodedSlug,
    });
    const productDoc =
      typeof (productQuery as { lean?: () => Promise<unknown> })?.lean ===
      "function"
        ? await (productQuery as { lean: () => Promise<unknown> }).lean()
        : await productQuery;

    if (!productDoc) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 },
      );
    }

    const buyBox = buildBuyBox(
      productDoc as { prices?: PriceItem[]; inventories?: InventoryItem[] },
    );

    return NextResponse.json({
      ok: true,
      data: {
        product: productDoc,
        category: null,
        buyBox,
      },
      product: productDoc,
      buyBox,
    });
  } catch (error) {
    logger.error(
      "Failed to load marketplace product",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
