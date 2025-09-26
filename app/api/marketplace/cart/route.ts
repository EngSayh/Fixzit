import { NextRequest, NextResponse } from 'next/server';
import { getCollections } from '@/lib/db/collections';
import { jwtVerify } from 'jose';
import { z } from 'zod';

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
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const { carts, products } = await getCollections();
    
    // Get or create cart
    let cart = await carts.findOne({ userId: payload.id as string });
    
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
      cart = { ...newCart, _id: result.insertedId.toString() };
    }
    
    // Enrich cart items with product data
    const cartItems = cart.items || [];
    const productIds = cartItems.map(item => item.productId);
    const productsList = await products.find({ _id: { $in: productIds } }).toArray();
    const productMap = new Map(productsList.map(p => [p._id, p]));
    
    const enrichedItems = cartItems.map(item => ({
      ...item,
      product: productMap.get(item.productId)
    }));
    
    return NextResponse.json({
      ok: true,
      data: {
        ...cart,
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
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const body = await req.json();
    const { productId, quantity } = AddToCartSchema.parse(body);
    
    const { carts, products } = await getCollections();
    
    // Get product
    const product = await products.findOne({ _id: productId });
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
    let cart = await carts.findOne({ userId: payload.id as string });
    
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
      cart = { ...newCart, _id: result.insertedId.toString() };
    }
    
    // Update cart items
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += quantity;
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
      { _id: cart._id },
      { $set: { items: cart.items, total: cart.total, updatedAt: cart.updatedAt } }
    );
    
    return NextResponse.json({
      ok: true,
      data: cart
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
