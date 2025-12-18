export const CART_UPDATED_EVENT = "fixzit-marketplace-cart-updated";

export type MarketplaceCartLine = { qty?: number };
export type MarketplaceCartLike =
  | { lines?: MarketplaceCartLine[] }
  | null
  | undefined;

export function computeCartCount(cart: MarketplaceCartLike) {
  if (!cart?.lines) {
    return 0;
  }
  return cart.lines.reduce((sum, line) => sum + (Number(line?.qty) || 0), 0);
}

export function broadcastCartUpdate(cart: MarketplaceCartLike) {
  const count = computeCartCount(cart);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CART_UPDATED_EVENT, { detail: { count } }),
    );
  }
  return count;
}

function parseCartError(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null) {
    const obj = payload as Record<string, unknown>;
    if (obj.error && typeof obj.error === "string") {
      return obj.error;
    }
    if (obj.message && typeof obj.message === "string") {
      return obj.message;
    }
  }
  return fallback;
}

export const GUEST_CART_KEY = "marketplace_saved_cart";

function persistGuestCart(line: {
  productId: string;
  quantity: number;
  title?: string;
  price?: number;
  currency?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    const existing = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
    const next = Array.isArray(existing) ? existing : [];
    next.push({
      productId: line.productId,
      qty: line.quantity,
      price: line.price,
      currency: line.currency,
      title: line.title,
    });
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

export async function addProductToCart(
  productId: string,
  quantity: number,
  meta?: { title?: string; price?: number; currency?: string }
) {
  const response = await fetch("/api/marketplace/cart", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity }),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (response.status === 401 || response.status === 403) {
    persistGuestCart({
      productId,
      quantity,
      title: meta?.title,
      price: meta?.price,
      currency: meta?.currency,
    });
    throw new Error("Please sign in to restore your saved cart and checkout.");
  }

  if (!response.ok) {
    throw new Error(parseCartError(payload, "Unable to update cart"));
  }

  const order = (payload as Record<string, unknown> | undefined)?.data;
  broadcastCartUpdate(order as MarketplaceCartLike);
  return order;
}
