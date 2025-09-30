export const CART_UPDATED_EVENT = 'fixzit-marketplace-cart-updated';

export type MarketplaceCartLine = { qty?: number };
export type MarketplaceCartLike = { lines?: MarketplaceCartLine[] } | null | undefined;

export function computeCartCount(cart: MarketplaceCartLike) {
  if (!cart?.lines) {
    return 0;
  }
  return cart.lines.reduce((sum, line) => sum + (Number(line?.qty) || 0), 0);
}

export function broadcastCartUpdate(cart: MarketplaceCartLike) {
  const count = computeCartCount(cart);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { count } }));
  }
  return count;
}

function parseCartError(payload: any, fallback: string) {
  if (payload?.error && typeof payload.error === 'string') {
    return payload.error;
  }
  if (payload?.message && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback;
}

export async function addProductToCart(productId: string, quantity: number) {
  const response = await fetch('/api/marketplace/cart', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity })
  });

  let payload: any;
  try {
    payload = await response.json();
  } catch (error) {
    payload = undefined;
  }

  if (!response.ok) {
    throw new Error(parseCartError(payload, 'Unable to update cart'));
  }

  const order = payload?.data;
  broadcastCartUpdate(order);
  return order;
}
