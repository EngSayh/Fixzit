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
import mongoose from 'mongoose';

// Helper type for accessing order properties safely
interface OrderWithDates extends IOrder {
  deliveredAt?: Date;
  updatedAt: Date;
}

// Helper type for order with referenced IDs
interface OrderWithRefs extends IOrder {
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
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
  refundMethod: 'original_payment' | 'store_credit' | 'bank_transfer';
  processorId: string;
}

class ReturnsService {
  /**
   * Check if an order item is eligible for return
   */
  async checkEligibility(orderId: string, listingId: string): Promise<{
    eligible: boolean;
    reason?: string;
    daysRemaining?: number;
  }> {
    const order = await Order.findById(orderId);
    if (!order) {
      return { eligible: false, reason: 'Order not found' };
    }

    if (order.status !== 'delivered') {
      return { eligible: false, reason: 'Order not yet delivered' };
    }

    // Check return window (30 days from delivery)
    const orderWithDates = order as OrderWithDates;
    const deliveryDate = orderWithDates.deliveredAt || orderWithDates.updatedAt;
    const daysSinceDelivery = Math.floor((Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
    const returnWindow = 30;

    if (daysSinceDelivery > returnWindow) {
      return { eligible: false, reason: 'Return window expired (30 days)' };
    }

    // Check if already returned
    const existingRMA = await RMA.findOne({ 
      orderId, 
      'items.listingId': listingId,
      status: { $in: ['initiated', 'approved', 'in_transit', 'received', 'inspected'] }
    });

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
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Type assertion: Order document with ObjectId refs (not populated)
    const orderWithRefs: OrderWithRefs = order as unknown as OrderWithRefs;
    if (orderWithRefs.buyerId.toString() !== buyerId) {
      throw new Error('Unauthorized: Not your order');
    }

    // Validate eligibility for all items
    for (const item of items) {
      const eligibility = await this.checkEligibility(orderId, item.listingId);
      if (!eligibility.eligible) {
        throw new Error(`Item ${item.listingId} not eligible: ${eligibility.reason}`);
      }
    }

    // Create RMA
    const rma = await RMA.create({
      orderId: new mongoose.Types.ObjectId(orderId),
      buyerId: new mongoose.Types.ObjectId(buyerId),
      sellerId: orderWithRefs.sellerId,
      items: items.map(item => ({
        listingId: new mongoose.Types.ObjectId(item.listingId),
        quantity: item.quantity,
        reason: item.reason,
        comments: item.comments
      })),
      status: 'initiated',
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
      to: orderWithRefs.sellerId.toString(),
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
   */
  async approveReturn(params: ApproveReturnParams): Promise<void> {
    const { rmaId, adminId, approvalNotes } = params;

    const rma = await RMA.findById(rmaId);
    if (!rma) {
      throw new Error('RMA not found');
    }

    if (rma.status !== 'initiated') {
      throw new Error(`Cannot approve RMA in status: ${rma.status}`);
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
   */
  async rejectReturn(rmaId: string, adminId: string, rejectionReason: string): Promise<void> {
    const rma = await RMA.findById(rmaId);
    if (!rma) {
      throw new Error('RMA not found');
    }

    if (rma.status !== 'initiated') {
      throw new Error(`Cannot reject RMA in status: ${rma.status}`);
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
    const rma = await RMA.findById(rmaId).populate('orderId');
    if (!rma) {
      throw new Error('RMA not found');
    }

    // Type guard: rma.orderId is populated as IOrder document
    if (typeof rma.orderId === 'string') {
      throw new Error('Order not populated');
    }
    const order = rma.orderId as IOrder;
    
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

    // In production, this would call the actual carrier API
    const label = {
      trackingNumber: `RET-${Date.now()}-${rma._id.toString().slice(-6).toUpperCase()}`,
      labelUrl: `https://returns.fixzit.sa/labels/${rma._id}.pdf`,
      carrier: splRate.carrier
    };

    // Update RMA with label info
    rma.shipping = {
      ...(rma.shipping || { shippingCost: 0, paidBy: 'seller' }),
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
   */
  async inspectReturn(params: InspectReturnParams): Promise<void> {
    const { rmaId, inspectorId, condition, restockable, inspectionNotes, inspectionPhotos } = params;

    const rma = await RMA.findById(rmaId);
    if (!rma) {
      throw new Error('RMA not found');
    }

    if (rma.status !== 'received') {
      throw new Error(`Cannot inspect RMA in status: ${rma.status}`);
    }

    // Complete inspection
    await rma.completeInspection(
      inspectorId,
      condition,
      true,
      restockable,
      inspectionNotes || '',
      inspectionPhotos
    );

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
    const rma = await RMA.findById(rmaId).populate('orderId');
    if (!rma) return 0;

    // Type guard: rma.orderId is populated as IOrder document
    if (typeof rma.orderId === 'string') {
      return 0;
    }
    const order = rma.orderId as IOrder;
    
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
   */
  async processRefund(params: ProcessRefundParams): Promise<void> {
    const { rmaId, refundAmount, refundMethod, processorId } = params;

    const rma = await RMA.findById(rmaId);
    if (!rma) {
      throw new Error('RMA not found');
    }

    if (rma.status !== 'inspected') {
      throw new Error(`Cannot refund RMA in status: ${rma.status}`);
    }

    // Process refund via payment gateway
    // In production, integrate with Stripe/PayTabs/etc.
    const refundData = {
      amount: refundAmount,
      method: refundMethod,
      processedBy: processorId,
      processedAt: new Date(),
      status: 'completed' as const,
      transactionId: `REF-${Date.now()}`
    };

    await rma.completeRefund(refundData);

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
      sellerId: new mongoose.Types.ObjectId(sellerId),
      createdAt: { $gte: startDate }
    });

    const totalReturns = returns.length;

    // Calculate return rate (returns / total orders)
    const totalOrders = await Order.countDocuments({
      sellerId: new mongoose.Types.ObjectId(sellerId),
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
   */
  async autoCompleteReceivedReturns(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const receivedReturns = await RMA.find({
      status: 'received',
      updatedAt: { $lt: sevenDaysAgo }
    });

    let completed = 0;
    for (const rma of receivedReturns) {
      // Auto-inspect as "good" condition, restockable
      await this.inspectReturn({
        rmaId: rma._id.toString(),
        inspectorId: 'SYSTEM',
        condition: 'good',
        restockable: true,
        inspectionNotes: 'Auto-inspected after 7 days - assumed good condition'
      });
      completed++;
    }

    return completed;
  }
}

export const returnsService = new ReturnsService();
