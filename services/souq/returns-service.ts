/**
 * Returns Service
 * Handles return merchandise authorization (RMA) workflow
 * - Auto-approval logic
 * - Return label generation
 * - Pickup scheduling
 * - Inspection workflow
 * - Refund processing
 */

import { SouqRMA as RMA } from '@/server/models/souq/RMA';
import { SouqOrder as Order } from '@/server/models/souq/Order';
import type { IOrder } from '@/server/models/souq/Order';
import { SouqListing as Listing } from '@/server/models/souq/Listing';
import { inventoryService } from './inventory-service';
import { fulfillmentService } from './fulfillment-service';
import { addJob, QUEUE_NAMES } from '@/lib/queues/setup';
import { nanoid } from 'nanoid';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger';

// Helper type for accessing order properties safely
interface OrderWithDates extends IOrder {
  deliveredAt?: Date;
  updatedAt: Date;
}

interface InitiateReturnParams {
  orderId: string;
  buyerId: string;
  items: Array<{
    listingId: string;
    quantity: number;
    reason: 'defective' | 'damaged' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 'better_price' | 'other';
    comments?: string;
  }>;
  buyerPhotos?: string[];
}

interface ApproveReturnParams {
  rmaId: string;
  adminId: string;
  approvalNotes?: string;
}

interface InspectReturnParams {
  rmaId: string;
  inspectorId: string;
  condition: 'like_new' | 'good' | 'acceptable' | 'damaged' | 'defective';
  restockable: boolean;
  inspectionNotes?: string;
  inspectionPhotos?: string[];
}

interface ProcessRefundParams {
  rmaId: string;
  refundAmount: number;
  refundMethod: 'original_payment' | 'wallet' | 'bank_transfer';
  processorId: string;
}

class ReturnsService {
  /**
   * Resolve seller for requested return items. Enforces single seller per RMA to avoid cross-seller returns.
   */
  private resolveSellerForItems(order: IOrder, items: InitiateReturnParams['items']): mongoose.Types.ObjectId {
    const sellerIds = new Set<string>();
    for (const item of items) {
      const orderItem = order.items.find((oi) => oi.listingId.toString() === item.listingId);
      if (!orderItem?.sellerId) {
        throw new Error(`Seller not found for listing ${item.listingId}`);
      }
      sellerIds.add(orderItem.sellerId.toString());
    }
    if (sellerIds.size !== 1) {
      throw new Error('Returns cannot span multiple sellers; split the request per seller');
    }
    const sellerId = Array.from(sellerIds)[0];
    return new mongoose.Types.ObjectId(sellerId);
  }

  /**
   * Check if an order item is eligible for return
   */
  async checkEligibility(
    orderId: string,
    listingId: string,
    preloadedOrder?: IOrder | null,
  ): Promise<{
    eligible: boolean;
    reason?: string;
    daysRemaining?: number;
  }> {
    const order = preloadedOrder ?? (await this.findOrder(orderId));
    if (!order) {
      return { eligible: false, reason: 'Order not found' };
    }

    if (order.status !== 'delivered') {
      return { eligible: false, reason: 'Order not yet delivered' };
    }

    // Check return window (30 days from delivery)
    const orderWithDates = order as OrderWithDates;
    const deliveryDate = orderWithDates.deliveredAt || orderWithDates.updatedAt;
    if (!deliveryDate) {
      return { eligible: false, reason: 'Delivery date unavailable' };
    }
    const daysSinceDelivery = Math.floor((Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
    const returnWindow = 30;

    if (daysSinceDelivery > returnWindow) {
      return { eligible: false, reason: 'Return window expired (30 days)' };
    }

    // Check if already returned
    const existingRMA = await RMA.findOne({ 
      orderId: order._id.toString(), 
      'items.listingId': listingId,
      status: { $in: ['initiated', 'approved', 'in_transit', 'received', 'inspected'] }
    }).lean();

    if (existingRMA) {
      return { eligible: false, reason: 'Return already in progress for this item' };
    }

    return { 
      eligible: true, 
      daysRemaining: returnWindow - daysSinceDelivery 
    };
  }

  /**
   * Initiate a return request
   */
  async initiateReturn(params: InitiateReturnParams): Promise<string> {
    const { orderId, buyerId, items, buyerPhotos } = params;

    // Validate order
    const order = await this.findOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.customerId.toString() !== buyerId) {
      throw new Error('Unauthorized: Not your order');
    }

    const sellerId = this.resolveSellerForItems(order, items);

    // Validate eligibility for all items
    for (const item of items) {
      const eligibility = await this.checkEligibility(orderId, item.listingId, order);
      if (!eligibility.eligible) {
        throw new Error(`Item ${item.listingId} not eligible: ${eligibility.reason}`);
      }
    }

    // Build RMA items using order line data to satisfy schema requirements
    const rmaItems = items.map((item) => {
      const orderItem = order.items.find((oi) => oi.listingId.toString() === item.listingId);
      if (!orderItem) {
        throw new Error(`Item ${item.listingId} not found on order`);
      }

      return {
        orderItemId: orderItem.listingId.toString(),
        listingId: orderItem.listingId.toString(),
        productId: orderItem.productId.toString(),
        productName: orderItem.title,
        quantity: item.quantity,
        unitPrice: orderItem.pricePerUnit,
        reason: item.reason,
        returnReason: this.mapReturnReason(item.reason),
      };
    });

    const refundAmount = rmaItems.reduce(
      (sum, item) => sum + (item.unitPrice * item.quantity),
      0
    );

    const orderWithDates = order as OrderWithDates;
    const deliveryDate = orderWithDates.deliveredAt || orderWithDates.updatedAt || new Date();
    const returnWindowDays = 30;
    const returnDeadline = new Date(deliveryDate);
    returnDeadline.setDate(returnDeadline.getDate() + returnWindowDays);

    // Create RMA
    const rma = await RMA.create({
      rmaId: `RMA-${nanoid(10)}`,
      orderId: order._id.toString(),
      orderNumber: order.orderId,
      buyerId,
      sellerId: sellerId.toString(),
      items: rmaItems,
      status: 'initiated',
      returnWindowDays,
      returnDeadline,
      refund: {
        amount: refundAmount,
        method: 'original_payment',
        status: 'pending'
      },
      shipping: { shippingCost: 0, paidBy: 'seller' },
      buyerNotes: items
        .map((item) => item.comments)
        .filter(Boolean)
        .join('; ') || undefined,
      buyerPhotos: buyerPhotos || [],
      timeline: [{
        status: 'initiated',
        timestamp: new Date(),
        note: 'Return request submitted by buyer'
      }]
    });

    // Auto-approval logic
    const autoApprovalReasons = ['defective', 'damaged', 'wrong_item', 'not_as_described'];
    const allAutoApprove = items.every(item => autoApprovalReasons.includes(item.reason));

    if (allAutoApprove) {
      await this.autoApprove(rma._id.toString());
    }

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      type: 'email',
      to: sellerId.toString(),
      template: 'return_initiated',
      data: { rmaId: rma._id.toString(), orderId, items }
    });

    return rma._id.toString();
  }

  /**
   * Auto-approve return (for defective/damaged items)
   */
  private async autoApprove(rmaId: string): Promise<void> {
    const rma = await RMA.findById(rmaId);
    if (!rma) return;

    await rma.approve('SYSTEM', 'Auto-approved: Defective or damaged item');
    
    // Generate return label
    await this.generateReturnLabel(rmaId);
  }

  /**
   * Manually approve return (admin action)
   * 
   * RACE CONDITION FIX: Uses atomic findOneAndUpdate to prevent double-approval.
   */
  async approveReturn(params: ApproveReturnParams): Promise<void> {
    const { rmaId, adminId, approvalNotes } = params;

    const now = new Date();

    // ATOMIC STATUS TRANSITION: Only one concurrent request can succeed
    const rma = await RMA.findOneAndUpdate(
      { 
        _id: rmaId, 
        status: 'initiated'  // Atomic condition - prevents double-approval
      },
      { 
        $set: { 
          status: 'approving',  // Intermediate state to block concurrent requests
        },
        $push: {
          timeline: {
            status: 'approving',
            timestamp: now,
            note: `Approval initiated by ${adminId}`,
            performedBy: adminId,
          }
        }
      },
      { new: true }
    );

    if (!rma) {
      const existing = await RMA.findById(rmaId).lean();
      if (!existing) {
        throw new Error('RMA not found');
      }
      throw new Error(`Cannot approve RMA: already in status '${existing.status}' (expected 'initiated')`);
    }

    await rma.approve(adminId, approvalNotes);
    
    // Generate return label
    await this.generateReturnLabel(rmaId);

    // Notify buyer
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      type: 'email',
      to: rma.buyerId.toString(),
      template: 'return_approved',
      data: { rmaId, returnLabel: rma.shipping?.labelUrl }
    });
  }

  /**
   * Reject return request
   * 
   * RACE CONDITION FIX: Uses atomic findOneAndUpdate to prevent double-rejection.
   */
  async rejectReturn(rmaId: string, adminId: string, rejectionReason: string): Promise<void> {
    const now = new Date();

    // ATOMIC STATUS TRANSITION: Only one concurrent request can succeed
    const rma = await RMA.findOneAndUpdate(
      { 
        _id: rmaId, 
        status: 'initiated'  // Atomic condition - prevents double-rejection
      },
      { 
        $set: { 
          status: 'rejecting',  // Intermediate state to block concurrent requests
        },
        $push: {
          timeline: {
            status: 'rejecting',
            timestamp: now,
            note: `Rejection initiated by ${adminId}`,
            performedBy: adminId,
          }
        }
      },
      { new: true }
    );

    if (!rma) {
      const existing = await RMA.findById(rmaId).lean();
      if (!existing) {
        throw new Error('RMA not found');
      }
      throw new Error(`Cannot reject RMA: already in status '${existing.status}' (expected 'initiated')`);
    }

    await rma.reject(adminId, rejectionReason);

    // Notify buyer
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      type: 'email',
      to: rma.buyerId.toString(),
      template: 'return_rejected',
      data: { rmaId, reason: rejectionReason }
    });
  }

  /**
   * Generate return shipping label
   */
  async generateReturnLabel(rmaId: string): Promise<{
    trackingNumber: string;
    labelUrl: string;
    carrier: string;
  }> {
    const rma = await RMA.findById(rmaId);
    if (!rma) {
      throw new Error('RMA not found');
    }

    const order = await this.findOrder(rma.orderId);
    if (!order) {
      logger.error(
        "RMA return label generation failed: order not found",
        undefined,
        {
          rmaId: rma._id?.toString?.(),
          orderId: rma.orderId?.toString?.(),
          buyerId: rma.buyerId?.toString?.(),
          metric: "returns.order_missing",
        },
      );
      throw new Error(`Order not found for RMA ${rma.orderId}`);
    }
    
    // Get buyer's address from order
    const _destination = order.shippingAddress;
    
    // Get seller's address (or warehouse for FBF)
    const listing = await Listing.findById(rma.items[0].listingId);
    // warehouseLocation is a string field, not an address object
    const origin = {
      name: 'Fixzit Returns Center',
      street: '123 Warehouse St',
      city: listing?.warehouseLocation || 'Riyadh',
      state: 'Riyadh Province',
      postalCode: '11564',
      country: 'SA'
    };

    // Calculate total weight
    const totalWeight = rma.items.reduce((sum: number, item: unknown) => sum + ((item as { quantity: number }).quantity * 0.5), 0);

    // Generate label via carrier (use SPL for returns - most affordable)
    const shippingAddress = order.shippingAddress as { name?: string; street?: string; city?: string; state?: string; postalCode?: string; country?: string };
    const labelRequest = {
      origin: `${shippingAddress.city || 'Riyadh'}, ${shippingAddress.state || 'Riyadh Province'}`,
      destination: `${origin.city}, ${origin.state}`,
      weight: totalWeight,
      dimensions: { length: 30, width: 20, height: 15, unit: 'cm' },
      serviceType: 'standard' as const,
      description: `Return for Order ${order._id}`,
      declaredValue: rma.items.reduce((sum: number, item: unknown) => sum + ((item as { quantity: number }).quantity * 100), 0), // Estimate
      codAmount: 0
    };

    const rates = await fulfillmentService.getRates(labelRequest);
    const splRate = rates.find(r => r.carrier === 'SPL') || rates[0];
    if (!splRate) {
      throw new Error('No return shipping rates available');
    }
    const shippingCost = typeof (splRate as { cost?: unknown }).cost === 'number'
      ? (splRate as { cost: number }).cost
      : 0;

    // In production, this would call the actual carrier API
    const label = {
      trackingNumber: `RET-${Date.now()}-${rma._id.toString().slice(-6).toUpperCase()}`,
      labelUrl: `https://returns.fixzit.sa/labels/${rma._id}.pdf`,
      carrier: splRate.carrier
    };

    // Update RMA with label info
    rma.shipping = {
      ...(rma.shipping || { shippingCost, paidBy: 'seller' }),
      shippingCost,
      carrier: label.carrier,
      trackingNumber: label.trackingNumber,
      labelUrl: label.labelUrl,
    };
    await rma.save();

    return label;
  }

  /**
   * Schedule pickup for return
   */
  async schedulePickup(rmaId: string, pickupDate: Date, timeSlot: 'morning' | 'afternoon' | 'evening'): Promise<void> {
    const rma = await RMA.findById(rmaId);
    if (!rma) {
      throw new Error('RMA not found');
    }

    if (!rma.shipping?.labelUrl) {
      throw new Error('Return label not generated yet');
    }

    // In production, schedule via carrier API
    // For now, just update RMA
    rma.timeline.push({
      status: 'pickup_scheduled',
      timestamp: new Date(),
      note: `Pickup scheduled for ${pickupDate.toLocaleDateString()} ${timeSlot}`
    });
    await rma.save();

    // Notify buyer
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-sms', {
      type: 'sms',
      to: rma.buyerId.toString(),
      message: `Pickup scheduled for your return (RMA ${rmaId}) on ${pickupDate.toLocaleDateString()} ${timeSlot}`
    });
  }

  /**
   * Update return tracking (called by carrier webhook)
   */
  async updateTracking(rmaId: string, status: string, location?: string): Promise<void> {
    const rma = await RMA.findById(rmaId);
    if (!rma) {
      throw new Error('RMA not found');
    }

    // Map carrier status to RMA status
    const statusMap: Record<string, typeof rma.status> = {
      'picked_up': 'in_transit',
      'in_transit': 'in_transit',
      'out_for_delivery': 'in_transit',
      'delivered': 'received',
      'arrived': 'received'
    };

    const newStatus = statusMap[status] || rma.status;

    if (newStatus !== rma.status) {
      rma.status = newStatus;
      rma.timeline.push({
        status: newStatus,
        timestamp: new Date(),
        note: location ? `Package ${status} at ${location}` : `Package ${status}`
      });
      await rma.save();

      // If received, queue for inspection
      if (newStatus === 'received') {
        await addJob(QUEUE_NAMES.NOTIFICATIONS, 'internal-notification', {
          type: 'internal',
          to: 'inspection-team',
          message: `RMA ${rmaId} received and ready for inspection`
        });
      }
    }
  }

  /**
   * Inspect returned item
   * 
   * RACE CONDITION FIX: Uses atomic findOneAndUpdate to prevent concurrent inspections.
   * Only one inspection can succeed for an RMA in 'received' status.
   */
  async inspectReturn(params: InspectReturnParams): Promise<void> {
    const { rmaId, inspectorId, condition, restockable, inspectionNotes, inspectionPhotos } = params;

    const now = new Date();

    // ATOMIC STATUS TRANSITION: Only one concurrent request can succeed
    const rma = await RMA.findOneAndUpdate(
      { 
        _id: rmaId, 
        status: 'received'  // Atomic condition - prevents double-inspection
      },
      { 
        $set: { 
          status: 'inspecting',  // Intermediate state to block concurrent requests
        },
        $push: {
          timeline: {
            status: 'inspecting',
            timestamp: now,
            note: `Inspection started by ${inspectorId}`,
            performedBy: inspectorId,
          }
        }
      },
      { new: true }
    );

    if (!rma) {
      const existing = await RMA.findById(rmaId).lean();
      if (!existing) {
        throw new Error('RMA not found');
      }
      throw new Error(`Cannot inspect RMA: already in status '${existing.status}' (expected 'received')`);
    }

    const rmaDoc = rma as unknown as {
      completeInspection?: (...args: unknown[]) => Promise<unknown> | unknown;
      save?: () => Promise<unknown>;
      timeline?: unknown[];
      inspection?: unknown;
      refund?: { status?: string; amount?: number; method?: string };
      status: string;
    };

    if (typeof rmaDoc.completeInspection === 'function') {
      await rmaDoc.completeInspection(
        inspectorId,
        condition,
        true,
        restockable,
        inspectionNotes || '',
        inspectionPhotos
      );
    } else {
      // Fallback for mocked models without instance methods
      const timeline = Array.isArray(rmaDoc.timeline) ? [...rmaDoc.timeline] : [];
      timeline.push({
        status: 'inspection_complete',
        timestamp: now,
        note: `Condition: ${condition}, Approved: true`,
        performedBy: inspectorId,
      });
      rmaDoc.timeline = timeline;
      rmaDoc.inspection = {
        inspectedAt: now,
        inspectedBy: inspectorId,
        condition,
        notes: inspectionNotes || '',
        approved: true,
        restockable,
        photosUrls: inspectionPhotos,
      };
      rmaDoc.status = 'inspected';
      if (rmaDoc.refund) {
        rmaDoc.refund.status = 'processing';
      } else {
        rmaDoc.refund = {
          status: 'processing',
          amount: 0,
          method: 'original_payment',
        };
      }
    }
    // Save the updated RMA document
    await rma.save();

    // Always adjust inventory so unsellable units are tracked correctly.
    for (const item of rma.items) {
      await inventoryService.processReturn({
        listingId: item.listingId.toString(),
        rmaId,
        quantity: item.quantity,
        condition: restockable ? 'sellable' : 'unsellable',
      });
    }

    // Calculate refund amount
    const refundAmount = await this.calculateRefundAmount(rmaId, condition, restockable);

    // If nothing is refundable, close the RMA to avoid stuck "inspected" states
    if (refundAmount <= 0) {
      const transactionId = `REF-${Date.now()}-${rma._id.toString().slice(-6)}`;
      const timeline = Array.isArray(rma.timeline) ? rma.timeline : [];
      timeline.push({
        status: 'completed',
        timestamp: now,
        note: 'No refund due after inspection; closing RMA',
        performedBy: inspectorId,
      });

      rma.timeline = timeline;
      rma.status = 'completed';
      rma.completedAt = now;
      rma.refund = {
        amount: 0,
        method: 'original_payment',
        processedBy: inspectorId,
        processedAt: now,
        transactionId,
        status: 'completed',
      };
      await rma.save();
      return;
    }
    
    // Auto-process refund for approved returns
    if (refundAmount > 0) {
      await this.processRefund({
        rmaId,
        refundAmount,
        refundMethod: 'original_payment',
        processorId: inspectorId
      });
    }
  }

  /**
   * Calculate refund amount based on inspection
   */
  private async calculateRefundAmount(rmaId: string, condition: string, restockable: boolean): Promise<number> {
    const rma = await RMA.findById(rmaId);
    if (!rma) return 0;

    const order = await this.findOrder(rma.orderId);
    if (!order) return 0;
    
    // Base refund: original item price
    let refundAmount = 0;
    for (const item of rma.items) {
      const orderItem = order.items.find((oi) =>
        oi.listingId.toString() === item.listingId.toString()
      );
      if (orderItem) {
        refundAmount += orderItem.pricePerUnit * item.quantity;
      }
    }

    // Deduct restocking fee if not restockable
    if (!restockable) {
      refundAmount *= 0.8; // 20% restocking fee
    }

    // Deduct based on condition
    const conditionDeductions: Record<string, number> = {
      'like_new': 0,
      'good': 0.05,
      'acceptable': 0.15,
      'damaged': 0.3,
      'defective': 0
    };

    const deduction = conditionDeductions[condition] || 0;
    refundAmount *= (1 - deduction);

    return Math.round(refundAmount * 100) / 100; // Round to 2 decimals
  }

  /**
   * Process refund
   * 
   * RACE CONDITION FIX: Uses atomic findOneAndUpdate to prevent double-processing.
   * The status transition from 'inspected' to 'refund_processing' is atomic,
   * so concurrent calls will fail safely instead of processing twice.
   */
  async processRefund(params: ProcessRefundParams): Promise<void> {
    const { rmaId, refundAmount, refundMethod, processorId } = params;

    const now = new Date();
    const transactionId = `REF-${Date.now()}-${rmaId.slice(-6)}`;

    // ATOMIC STATUS TRANSITION: Only one concurrent request can succeed
    // If status is not 'inspected', the update returns null (already processed or wrong state)
    const rma = await RMA.findOneAndUpdate(
      { 
        _id: rmaId, 
        status: 'inspected'  // Atomic condition - prevents double-processing
      },
      { 
        $set: { 
          status: 'refund_processing',  // Intermediate state to block concurrent requests
          'refund.status': 'processing',
          'refund.amount': refundAmount,
          'refund.method': refundMethod,
        },
        $push: {
          timeline: {
            status: 'refund_processing',
            timestamp: now,
            note: 'Refund processing initiated',
            performedBy: processorId,
          }
        }
      },
      { new: true }
    );

    if (!rma) {
      // Either RMA doesn't exist or it's not in 'inspected' status (already processing/completed)
      const existing = await RMA.findById(rmaId).lean();
      if (!existing) {
        throw new Error('RMA not found');
      }
      // Provide clear error message about current state
      throw new Error(`Cannot refund RMA: already in status '${existing.status}' (expected 'inspected')`);
    }

    const refundData = {
      amount: refundAmount,
      method: refundMethod,
      processedBy: processorId,
      processedAt: now,
      status: 'completed' as const,
      transactionId,
    };

    // Complete the refund (this is the actual processing step)
    const rmaRefundDoc = rma as unknown as {
      completeRefund?: (data: typeof refundData) => Promise<unknown> | unknown;
      save?: () => Promise<unknown>;
      refund?: typeof refundData;
      status?: string;
      completedAt?: Date;
    };

    if (typeof rmaRefundDoc.completeRefund === 'function') {
      await rmaRefundDoc.completeRefund(refundData);
    } else {
      // Fallback for mocked models without instance methods
      rmaRefundDoc.refund = {
        ...refundData,
        method: refundMethod,
      };
      rmaRefundDoc.status = 'completed';
      rmaRefundDoc.completedAt = refundData.processedAt;
    }
    // Save the final completed state
    await rma.save();

    // Notify buyer
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      type: 'email',
      to: rma.buyerId.toString(),
      template: 'refund_processed',
      data: { 
        rmaId, 
        amount: refundAmount, 
        method: refundMethod,
        estimatedDays: refundMethod === 'original_payment' ? '3-5' : '1-2'
      }
    });

    // Notify seller (if restocking fee applied)
    if (rma.inspection?.restockable === false) {
      await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
        type: 'email',
        to: rma.sellerId.toString(),
        template: 'return_completed',
        data: { rmaId, restockingFee: refundAmount * 0.25 }
      });
    }
  }

  /**
   * Get return statistics for a seller
   */
  async getSellerReturnStats(sellerId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<{
    totalReturns: number;
    returnRate: number;
    topReasons: Array<{ reason: string; count: number }>;
    avgRefundAmount: number;
    restockableRate: number;
  }> {
    const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const returns = await RMA.find({
      sellerId: sellerId.toString(),
      createdAt: { $gte: startDate }
    });

    const totalReturns = returns.length;

    // Calculate return rate (returns / total orders)
    const totalOrders = await Order.countDocuments({
      'items.sellerId': new mongoose.Types.ObjectId(sellerId),
      status: 'delivered',
      deliveredAt: { $gte: startDate }
    });

    const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0;

    // Top return reasons
    const reasonCounts = new Map<string, number>();
    returns.forEach((rma: unknown) => {
      (rma as { items: Array<{ reason: string }> }).items.forEach((item: unknown) => {
        const reason = (item as { reason: string }).reason;
        const count = reasonCounts.get(reason) || 0;
        reasonCounts.set(reason, count + 1);
      });
    });

    const topReasons = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Average refund amount
    const completedReturns = returns.filter((r: unknown) => (r as { status: string; refund?: unknown }).status === 'completed' && (r as { refund?: unknown }).refund);
    const avgRefundAmount = completedReturns.length > 0
      ? completedReturns.reduce((sum: number, r: unknown) => sum + (((r as { refund?: { amount?: number } }).refund?.amount) || 0), 0) / completedReturns.length
      : 0;

    // Restockable rate
    const inspectedReturns = returns.filter((r: unknown) => (r as { inspection?: unknown }).inspection);
    const restockableCount = inspectedReturns.filter((r: unknown) => (r as { inspection?: { restockable: boolean } }).inspection?.restockable).length;
    const restockableRate = inspectedReturns.length > 0
      ? (restockableCount / inspectedReturns.length) * 100
      : 0;

    return {
      totalReturns,
      returnRate: Math.round(returnRate * 100) / 100,
      topReasons,
      avgRefundAmount: Math.round(avgRefundAmount * 100) / 100,
      restockableRate: Math.round(restockableRate * 100) / 100
    };
  }

  /**
   * Get buyer's return history
   */
  async getBuyerReturnHistory(buyerId: string): Promise<Array<{
    rmaId: string;
    orderId: string;
    status: string;
    createdAt: Date;
    items: number;
    refundAmount?: number;
  }>> {
    const returns = await RMA.find({ 
      buyerId: new mongoose.Types.ObjectId(buyerId) 
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return returns.map((rma: unknown) => {
      const r = rma as { _id: { toString(): string }; orderId: { toString(): string }; status: string; createdAt: Date; items: unknown[]; refund?: { amount?: number } };
      return {
        rmaId: r._id.toString(),
        orderId: r.orderId.toString(),
        status: r.status,
        createdAt: r.createdAt,
        items: r.items.length,
      refundAmount: r.refund?.amount
    };
  });
  }

  private async findOrder(orderId: string): Promise<IOrder | null> {
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      const matchByObjectId = await Order.findById(orderId);
      if (matchByObjectId) {
        return matchByObjectId;
      }
    }
    return Order.findOne({ orderId });
  }

  private mapReturnReason(
    reason: InitiateReturnParams['items'][number]['reason']
  ): 'defective' | 'wrong_item' | 'not_as_described' | 'no_longer_needed' | 'damaged_in_shipping' | 'other' {
    switch (reason) {
      case 'defective':
        return 'defective';
      case 'damaged':
        return 'damaged_in_shipping';
      case 'wrong_item':
        return 'wrong_item';
      case 'not_as_described':
        return 'not_as_described';
      case 'changed_mind':
      case 'better_price':
        return 'no_longer_needed';
      default:
        return 'other';
    }
  }

  /**
   * Background job: Auto-escalate pending returns
   * Escalate returns that haven't been reviewed within 48 hours
   */
  async autoEscalatePendingReturns(): Promise<number> {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const pendingReturns = await RMA.find({
      status: 'initiated',
      createdAt: { $lt: twoDaysAgo }
    });

    let escalated = 0;
    for (const rma of pendingReturns) {
      // Notify admin team
      await addJob(QUEUE_NAMES.NOTIFICATIONS, 'internal-notification', {
        type: 'internal',
        to: 'admin-team',
        priority: 'high',
        message: `RMA ${rma._id} pending for 48+ hours - requires attention`
      }, { priority: 2 });
      escalated++;
    }

    return escalated;
  }

  /**
   * Background job: Auto-complete received returns
   * Auto-approve refunds for returns received 7+ days ago (for simple cases)
   * 
   * RACE CONDITION FIX: Uses atomic updateMany to mark RMAs as 'auto_processing'
   * before iterating, preventing concurrent job runs from processing the same RMAs.
   */
  async autoCompleteReceivedReturns(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const jobId = `auto-complete-${Date.now()}`;  // Unique job identifier for tracking

    // ATOMIC BATCH CLAIM: Mark eligible RMAs as being processed by this job instance
    // This prevents concurrent job runs from picking up the same RMAs
    const claimResult = await RMA.updateMany(
      {
        status: 'received',
        updatedAt: { $lt: sevenDaysAgo },
        autoProcessingJobId: { $exists: false }  // Not already claimed by another job
      },
      {
        $set: { autoProcessingJobId: jobId }
      }
    );

    if (claimResult.modifiedCount === 0) {
      return 0;  // No eligible RMAs to process
    }

    // Now fetch only the RMAs claimed by this job instance
    const receivedReturns = await RMA.find({
      autoProcessingJobId: jobId
    });

    let completed = 0;
    for (const rma of receivedReturns) {
      try {
        const hasReceivedScan = Array.isArray((rma as { timeline?: Array<{ status?: string }> }).timeline)
          ? (rma as { timeline: Array<{ status?: string }> }).timeline.some(t => t.status === 'received')
          : false;
        
        if (!hasReceivedScan || !rma.shipping?.trackingNumber) {
          await addJob(QUEUE_NAMES.NOTIFICATIONS, 'internal-notification', {
            type: 'internal',
            to: 'inspection-team',
            priority: 'medium',
            message: `RMA ${rma._id} skipped auto-complete due to missing receipt confirmation`
          }, { priority: 3 });
          
          // Clear the job claim so it can be picked up by manual review
          await RMA.updateOne(
            { _id: rma._id },
            { $unset: { autoProcessingJobId: 1 } }
          );
          continue;
        }

        // Auto-inspect as "good" condition, restockable
        await this.inspectReturn({
          rmaId: rma._id.toString(),
          inspectorId: 'SYSTEM',
          condition: 'good',
          restockable: true,
          inspectionNotes: 'Auto-inspected after 7 days - assumed good condition'
        });
        
        // Clear the job claim on success
        await RMA.updateOne(
          { _id: rma._id },
          { $unset: { autoProcessingJobId: 1 } }
        );
        completed++;
      } catch (error) {
        // Clear the job claim on error so it can be retried
        await RMA.updateOne(
          { _id: rma._id },
          { $unset: { autoProcessingJobId: 1 } }
        );
        // Log but continue processing other RMAs
        logger.error(`[ReturnsService] Failed to auto-complete RMA ${rma._id}`, error as Error);
      }
    }

    return completed;
  }
}

export const returnsService = new ReturnsService();
