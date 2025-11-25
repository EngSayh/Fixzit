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

export async function addProductToCart(productId: string, quantity: number) {
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

  if (!response.ok) {
    throw new Error(parseCartError(payload, "Unable to update cart"));
  }

  const order = (payload as Record<string, unknown> | undefined)?.data;
  broadcastCartUpdate(order as MarketplaceCartLike);
  return order;
}
