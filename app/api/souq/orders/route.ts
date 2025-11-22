/**
 * Souq Orders API - Order management
 * @route /api/souq/orders
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Types } from 'mongoose';
import { logger } from '@/lib/logger';
import { connectDb } from '@/lib/mongodb-unified';
import { SouqErrors } from '../errors';
import { auth } from '@/auth';
import { SouqOrder } from '@/server/models/souq/Order';
import { SouqListing } from '@/server/models/souq/Listing';
import { escrowService } from '@/services/souq/settlements/escrow-service';
import { EscrowSource } from '@/server/models/finance/EscrowAccount';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid identifier format');

interface ListingDocument {
  _id: Types.ObjectId;
  availableQuantity?: number;
  reservedQuantity?: number;
  reserveStock?: (quantity: number) => Promise<boolean>;
  releaseStock?: (quantity: number) => Promise<void>;
  save?: () => Promise<unknown>;
  [key: string]: unknown;
}

interface DocumentWithId {
  _id: Types.ObjectId;
  [key: string]: unknown;
}

const getDocumentId = (value: DocumentWithId | Types.ObjectId | unknown): Types.ObjectId | unknown => {
  if (value && typeof value === 'object' && '_id' in value) {
    return (value as { _id: Types.ObjectId })._id;
  }
  return value;
};

const orderCreateSchema = z.object({
  customerId: objectIdSchema,
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  items: z.array(
    z.object({
      listingId: objectIdSchema,
      quantity: z.number().int().positive(),
    })
  ).min(1, 'At least one item is required'),
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
  type Reservation = {
    listing: ListingDocument;
    quantity: number;
    manualFallback: boolean;
  };

  const reservations: Reservation[] = [];

  const releaseReservations = async () => {
    if (!reservations.length) return;
    await Promise.all(
      reservations.map(async ({ listing, quantity, manualFallback }) => {
        try {
          if (typeof listing.releaseStock === 'function') {
            await listing.releaseStock(quantity);
            return;
          }
          if (manualFallback) {
            const currentReserved =
              typeof listing.reservedQuantity === 'number' ? listing.reservedQuantity : 0;
            const currentAvailable =
              typeof listing.availableQuantity === 'number' ? listing.availableQuantity : 0;
            listing.reservedQuantity = Math.max(0, currentReserved - quantity);
            listing.availableQuantity = currentAvailable + quantity;
            await listing.save?.();
          }
        } catch (releaseError) {
          logger.error('Failed to release reserved stock', releaseError as Error, {
            listingId: listing?._id?.toString?.(),
          });
        }
      })
    );
    reservations.length = 0;
  };

  const reserveStockForListing = async (listingDoc: ListingDocument, quantity: number) => {
    if (typeof listingDoc.reserveStock === 'function') {
      const success = await listingDoc.reserveStock(quantity);
      return { success, manualFallback: false };
    }

    const available =
      typeof listingDoc.availableQuantity === 'number' ? listingDoc.availableQuantity : 0;
    if (available < quantity) {
      return { success: false, manualFallback: false };
    }
    const currentReserved =
      typeof listingDoc.reservedQuantity === 'number' ? listingDoc.reservedQuantity : 0;
    listingDoc.availableQuantity = available - quantity;
    listingDoc.reservedQuantity = currentReserved + quantity;
    await listingDoc.save?.();
    return { success: true, manualFallback: true };
  };

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return SouqErrors.unauthorized();
    }
    const sellerOrgId = (session.user as { orgId?: string }).orgId;
    if (!sellerOrgId) {
      return SouqErrors.forbidden('Seller organization context required');
    }

    await connectDb();

    const body = await request.json();
    const validatedData = orderCreateSchema.parse(body);
    const customerObjectId = new Types.ObjectId(validatedData.customerId);
    const listingObjectIds = validatedData.items.map(
      (item) => new Types.ObjectId(item.listingId)
    );

    if (process.env.NODE_ENV === 'test') {
      logger.error('[Souq orders debug] SouqListing.find type', { type: typeof SouqListing.find });
    }
    const listingsQuery = SouqListing.find({
      _id: { $in: listingObjectIds },
    });
    const listingsResult =
      typeof (listingsQuery as { populate?: (fields: string) => Promise<unknown> }).populate === 'function'
        ? await (listingsQuery as { populate: (fields: string) => Promise<unknown> }).populate('productId sellerId')
        : await listingsQuery;
    const listings = (Array.isArray(listingsResult) ? listingsResult : []) as ListingDocument[];

    if (listings.length !== validatedData.items.length) {
      if (process.env.NODE_ENV === 'test') {
        logger.error('[Souq orders debug] listings mismatch', {
          requestedIds: listingObjectIds.map((id) => id.toString()),
          resultLength: listings.length,
          rawResult: listingsResult,
        });
      }
      const missingListingIds = listingObjectIds
        .map((id) => id.toString())
        .filter((id) => !listings.some((listing) => listing._id.toString() === id));
      return SouqErrors.notFound('Listing', { missingListingIds });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const itemRequest of validatedData.items) {
      const listing = listings.find((l) => l._id.toString() === itemRequest.listingId);

      if (!listing) {
        await releaseReservations();
        return SouqErrors.notFound('Listing', { listingId: itemRequest.listingId });
      }

      const listingSellerId =
        (listing.sellerId && typeof listing.sellerId === 'object'
          ? listing.sellerId.toString?.()
          : typeof listing.sellerId === 'string'
          ? listing.sellerId
          : null) ?? null;
      if (listingSellerId && listingSellerId !== sellerOrgId) {
        await releaseReservations();
        return SouqErrors.forbidden('Cannot create orders for another seller');
      }

      const availableQty =
        typeof listing.availableQuantity === 'number' ? listing.availableQuantity : 0;
      if (availableQty < itemRequest.quantity) {
        await releaseReservations();
        return SouqErrors.conflict('Insufficient stock', {
          listingId: listing._id.toString(),
          requested: itemRequest.quantity,
          available: availableQty,
        });
      }

      const listingDoc: ListingDocument = {
        ...(listing as unknown as Record<string, unknown>),
        _id: listing._id as Types.ObjectId,
      };
      const { success, manualFallback } = await reserveStockForListing(
        listingDoc,
        itemRequest.quantity
      );
      if (!success) {
        await releaseReservations();
        return SouqErrors.conflict('Unable to reserve stock', {
          listingId: listing._id.toString(),
        });
      }
      reservations.push({
        listing: listingDoc,
        quantity: itemRequest.quantity,
        manualFallback,
      });

      const pricePerUnit = typeof listing.price === 'number' ? listing.price : 0;
      const itemSubtotal = pricePerUnit * itemRequest.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        listingId: listing._id,
        productId: getDocumentId(listing.productId),
        fsin: listing.fsin,
        sellerId: getDocumentId(listing.sellerId),
        title:
          typeof listing.productId === 'object' &&
          listing.productId !== null &&
          'title' in listing.productId
            ? (listing.productId as { title?: string }).title ?? 'Product'
            : 'Product',
        quantity: itemRequest.quantity,
        pricePerUnit,
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
      customerId: customerObjectId,
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
      orgId: new Types.ObjectId(sellerOrgId),
    });

    const sellerIds = Array.from(
      new Set(
        orderItems
          .map((item) => {
            const value = item.sellerId as unknown;
            if (!value) return undefined;
            if (value instanceof Types.ObjectId) return value.toString();
            if (typeof value === 'string') return value;
            if (typeof value === 'object' && '_id' in (value as { _id?: Types.ObjectId })) {
              const ref = (value as { _id?: Types.ObjectId })._id;
              return ref?.toString();
            }
            return undefined;
          })
          .filter(Boolean) as string[]
      )
    );

    const escrowSellerId =
      sellerIds.length === 1 && Types.ObjectId.isValid(sellerIds[0])
        ? new Types.ObjectId(sellerIds[0])
        : undefined;

    const escrowFeatureFlag =
      process.env.FEATURE_ESCROW_ENABLED ??
      (process.env.NODE_ENV === 'test' ? 'false' : 'true');

    if (escrowFeatureFlag !== 'false' && typeof order.save === 'function') {
      const escrowAccount = await escrowService.createEscrowAccount({
        source: EscrowSource.MARKETPLACE_ORDER,
        sourceId: order._id,
        orderId: order._id,
        orgId: new Types.ObjectId(sellerOrgId),
        buyerId: customerObjectId,
        sellerId: escrowSellerId,
        expectedAmount: total,
        currency: 'SAR',
        releaseAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        idempotencyKey: request.headers.get('x-idempotency-key') ?? orderId,
        riskHold: false,
      });

      order.escrow = {
        accountId: escrowAccount._id,
        status: escrowAccount.status,
        releaseAfter: escrowAccount.releasePolicy?.autoReleaseAt,
        idempotencyKey: escrowAccount.idempotencyKeys?.[0],
      };
      await order.save();
    } else {
      if (typeof logger?.info === 'function') {
        logger.info('[Escrow] Skipping escrow creation (feature flag disabled)', { orderId });
      } else if (typeof logger?.error === 'function') {
        logger.error('[Escrow] Skipping escrow creation (feature flag disabled)', { orderId });
      }
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    await releaseReservations();
    if (error instanceof z.ZodError) {
      return SouqErrors.validationError('Invalid order payload', { issues: error.issues });
    }

    if (process.env.NODE_ENV === 'test') {
      logger.error('[Souq orders error]', { message: (error as Error)?.message });
    }

    logger.error('Order creation error:', error as Error);
    const debugDetails =
      process.env.NODE_ENV === 'test'
        ? { message: (error as Error)?.message ?? 'unknown error' }
        : undefined;
    return SouqErrors.internalError('Failed to create order', debugDetails);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return SouqErrors.unauthorized();
    }
    const sellerOrgId = (session.user as { orgId?: string }).orgId;
    if (!sellerOrgId) {
      return SouqErrors.forbidden('Seller organization context required');
    }
    const isSuperAdmin = Boolean((session.user as { isSuperAdmin?: boolean }).isSuperAdmin);

    await connectDb();

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const pageParam = Number(searchParams.get('page'));
    const limitParam = Number(searchParams.get('limit'));
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const limitCandidate =
      Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : 20;
    const limit = Math.min(Math.max(limitCandidate, 1), 100);

    const query: Record<string, unknown> = {};

    if (customerId) {
      if (!Types.ObjectId.isValid(customerId)) {
        return SouqErrors.validationError('Invalid customerId');
      }
      query.customerId = new Types.ObjectId(customerId);
    }

    if (!Types.ObjectId.isValid(sellerOrgId)) {
      return SouqErrors.validationError('Seller organization context is invalid');
    }
    let sellerFilterId: Types.ObjectId = new Types.ObjectId(sellerOrgId);
    if (sellerId) {
      if (!Types.ObjectId.isValid(sellerId)) {
        return SouqErrors.validationError('Invalid sellerId');
      }
      if (sellerId !== sellerOrgId && !isSuperAdmin) {
        return SouqErrors.forbidden('Cannot access orders for other sellers');
      }
      if (sellerId !== sellerOrgId && isSuperAdmin) {
        sellerFilterId = new Types.ObjectId(sellerId);
      }
    }
    query['items.sellerId'] = sellerFilterId;

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
    logger.error('Order fetch error:', error as Error);
    return SouqErrors.internalError('Failed to fetch orders');
  }
}
