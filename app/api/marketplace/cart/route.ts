import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import { dbConnect } from '@/src/db/mongoose';
import Product from '@/src/models/marketplace/Product';
import { objectIdFrom } from '@/src/lib/marketplace/objectIds';
import { serializeOrder, serializeProduct } from '@/src/lib/marketplace/serializers';
import { getOrCreateCart, recalcCartTotals } from '@/src/lib/marketplace/cart';

const AddToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive()
});

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const cart = await getOrCreateCart(context.orgId, context.userId);
    const productIds = cart.lines.map(line => line.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map(product => [product._id.toString(), serializeProduct(product as any)]));

    return NextResponse.json({
      ok: true,
      data: {
        ...serializeOrder(cart),
        lines: cart.lines.map(line => ({
          ...line,
          productId: line.productId.toString(),
          product: productMap.get(line.productId.toString())
        }))
      }
    });
  } catch (error) {
    console.error('Marketplace cart fetch failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to load cart' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const payload = AddToCartSchema.parse(body);
    await dbConnect();

    const productId = objectIdFrom(payload.productId);
    const product = await Product.findOne({ _id: productId, orgId: context.orgId });
    if (!product) {
      return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
    }

    const cart = await getOrCreateCart(context.orgId, context.userId);
    const lineIndex = cart.lines.findIndex(line => line.productId.toString() === productId.toString());

    if (lineIndex >= 0) {
      cart.lines[lineIndex].qty += payload.quantity;
      cart.lines[lineIndex].total = cart.lines[lineIndex].qty * cart.lines[lineIndex].price;
    } else {
      cart.lines.push({
        productId,
        qty: payload.quantity,
        price: product.buy.price,
        currency: product.buy.currency,
        uom: product.buy.uom,
        total: product.buy.price * payload.quantity
      });
    }

    recalcCartTotals(cart);
    await cart.save();

    return NextResponse.json({
      ok: true,
      data: serializeOrder(cart)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    console.error('Marketplace add to cart failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to update cart' }, { status: 500 });
  }
}
