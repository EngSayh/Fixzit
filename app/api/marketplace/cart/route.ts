import { NextRequest, NextResponse } from 'next/server';
import { getCollections } from '@/lib/db/collections';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

const AddToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive()
});

export async function GET(req: NextRequest) {
  try {
    // Get user from auth
    const token = req.cookies.get('fixzit_auth')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    let payload: any;
    try {
      ({ payload } = await jwtVerify(token, new TextEncoder().encode(secret)));
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { carts, products } = await getCollections();

    // Get or create cart
    let cart = await carts.findOne({ userId: payload.id as string, tenantId: payload.tenantId as string });

    if (!cart) {
      const newCart = {
        userId: payload.id as string,
        tenantId: payload.tenantId as string,
        items: [],
        currency: 'SAR',
        total: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await carts.insertOne(newCart);
      cart = { ...newCart, _id: result.insertedId };
    }

    // Enrich cart items with product data
    const rawIds = cart.items.map(item => item.productId);
    const productObjectIds = rawIds
      .filter((id: string) => ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));
    const productsList = await products.find({
      _id: { $in: productObjectIds },
      tenantId: payload.tenantId as string
    }).toArray();
    const productMap = new Map(productsList.map((p) => [p._id.toString(), p]));

    const enrichedItems = cart.items.map(item => ({
      ...item,
      product: productMap.get(item.productId) ?? null
    }));

    return NextResponse.json({
      ok: true,
      data: {
        ...cart,
        _id: cart._id?.toString?.() ?? cart._id,
        items: enrichedItems
      }
    });
  } catch (error) {
    console.error('Cart fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get user from auth
    const token = req.cookies.get('fixzit_auth')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    let payload: any;
    try {
      ({ payload } = await jwtVerify(token, new TextEncoder().encode(secret)));
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, quantity } = AddToCartSchema.parse(body);

    const { carts, products } = await getCollections();

    // Get product
    if (!ObjectId.isValid(productId)) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
    }

    const product = await products.findOne({
      _id: new ObjectId(productId),
      tenantId: payload.tenantId as string
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check stock
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock', available: product.stock },
        { status: 400 }
      );
    }

    // Get or create cart
    let cart = await carts.findOne({ userId: payload.id as string, tenantId: payload.tenantId as string });

    if (!cart) {
      const newCart = {
        userId: payload.id as string,
        tenantId: payload.tenantId as string,
        items: [],
        currency: product.currency,
        total: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await carts.insertOne(newCart);
      cart = { ...newCart, _id: result.insertedId };
    }

    // Update cart items
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);

    const currentQty = existingItemIndex >= 0 ? cart.items[existingItemIndex].quantity : 0;
    const plannedQty = currentQty + quantity;
    if (product.stock < plannedQty) {
      return NextResponse.json(
        { error: 'Insufficient stock', available: Math.max(product.stock - currentQty, 0) },
        { status: 400 }
      );
    }

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity = plannedQty;
    } else {
      cart.items.push({
        productId,
        quantity,
        price: product.price
      });
    }
    
    // Calculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    
    // Update cart
    await carts.updateOne(
      { userId: payload.id as string, tenantId: payload.tenantId as string },
      { $set: { items: cart.items, total: cart.total, updatedAt: cart.updatedAt } }
    );

    return NextResponse.json({
      ok: true,
      data: { ...cart, _id: cart._id?.toString?.() ?? cart._id }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
