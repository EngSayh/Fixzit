/**
 * Souq Orders API - Order management
 * @route /api/souq/orders
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { SouqOrder } from '@/server/models/souq/Order';
import { SouqListing } from '@/server/models/souq/Listing';
import { connectDb } from '@/lib/mongodb-unified';
import { nanoid } from 'nanoid';

const orderCreateSchema = z.object({
  customerId: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  items: z.array(
    z.object({
      listingId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  shippingAddress: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().optional(),
    country: z.string(),
    postalCode: z.string().min(5),
  }),
  billingAddress: z
    .object({
      name: z.string(),
      phone: z.string(),
      addressLine1: z.string(),
      addressLine2: z.string().optional(),
      city: z.string(),
      state: z.string().optional(),
      country: z.string(),
      postalCode: z.string(),
    })
    .optional(),
  paymentMethod: z.enum(['card', 'cod', 'wallet', 'installment']),
});

export async function POST(request: NextRequest) {
  try {
    await connectDb();

    const body = await request.json();
    const validatedData = orderCreateSchema.parse(body);

    const listingIds = validatedData.items.map((item) => item.listingId);
    const listings = await SouqListing.find({
      _id: { $in: listingIds },
    }).populate('productId sellerId');

    if (listings.length !== validatedData.items.length) {
      return NextResponse.json({ error: 'Some listings not found' }, { status: 404 });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const itemRequest of validatedData.items) {
      const listing = listings.find((l) => l._id.toString() === itemRequest.listingId);

      if (!listing) {
        return NextResponse.json(
          { error: `Listing ${itemRequest.listingId} not found` },
          { status: 404 }
        );
      }

      if (listing.availableQuantity < itemRequest.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${listing.sku || 'product'}` },
          { status: 400 }
        );
      }

      const reserved = await listing.reserveStock(itemRequest.quantity);
      if (!reserved) {
        return NextResponse.json(
          { error: `Failed to reserve stock for ${listing.sku || 'product'}` },
          { status: 400 }
        );
      }

      const itemSubtotal = listing.price * itemRequest.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        listingId: listing._id,
        productId: listing.productId,
        fsin: listing.fsin,
        sellerId: listing.sellerId,
        title: (typeof listing.productId === 'object' && listing.productId !== null && 'title' in listing.productId) ? (listing.productId as { title?: string }).title : 'Product',
        quantity: itemRequest.quantity,
        pricePerUnit: listing.price,
        subtotal: itemSubtotal,
        fulfillmentMethod: listing.fulfillmentMethod,
        status: 'pending',
      });
    }

    const tax = subtotal * 0.15;
    const shippingFee = 0;
    const discount = 0;
    const total = subtotal + tax + shippingFee - discount;

    const orderId = `ORD-${nanoid(10).toUpperCase()}`;

    const order = await SouqOrder.create({
      orderId,
      customerId: validatedData.customerId,
      customerEmail: validatedData.customerEmail,
      customerPhone: validatedData.customerPhone,
      items: orderItems,
      shippingAddress: validatedData.shippingAddress,
      billingAddress: validatedData.billingAddress || validatedData.shippingAddress,
      pricing: {
        subtotal,
        shippingFee,
        tax,
        discount,
        total,
        currency: 'SAR',
      },
      payment: {
        method: validatedData.paymentMethod,
        status: validatedData.paymentMethod === 'cod' ? 'authorized' : 'pending',
      },
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: error.issues }, { status: 400 });
    }

    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = {};

    if (customerId) {
      query.customerId = customerId;
    }

    if (sellerId) {
      query['items.sellerId'] = sellerId;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      SouqOrder.find(query)
        .populate('customerId', 'name email')
        .populate('items.sellerId', 'legalName tradeName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SouqOrder.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
