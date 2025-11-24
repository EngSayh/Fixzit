import Order from "@/server/models/marketplace/Order";
import { Types } from "mongoose";

export async function getOrCreateCart(
  orgId: Types.ObjectId,
  buyerUserId: Types.ObjectId,
) {
  let cart = await Order.findOne({ orgId, buyerUserId, status: "CART" });
  if (!cart) {
    cart = await Order.create({
      orgId,
      buyerUserId,
      status: "CART",
      lines: [],
      totals: { subtotal: 0, vat: 0, grand: 0 },
      currency: "SAR",
    });
  }
  return cart;
}

interface CartLine {
  total: number;
}

interface CartDoc {
  lines: CartLine[];
  totals?: {
    subtotal: number;
    vat: number;
    grand: number;
  };
}

export function recalcCartTotals(cart: CartDoc) {
  const subtotal = cart.lines.reduce(
    (sum: number, line) => sum + line.total,
    0,
  );
  const vat = subtotal * 0.15;
  cart.totals = {
    subtotal,
    vat,
    grand: subtotal + vat,
  };
}
