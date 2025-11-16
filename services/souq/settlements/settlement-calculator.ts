/**
 * Settlement Calculator Service
 * 
 * Calculates seller payouts, fees, commissions, and VAT for completed orders.
 * Handles order reconciliation, dispute adjustments, and reserve management.
 * 
 * Fee Structure:
 * - Platform Commission: 10% of order value
 * - Payment Gateway Fee: 2.5% of order value
 * - VAT on Commission: 15% of platform commission
 * - Reserve: 20% held for returns/disputes (7-14 days)
 */

import { ObjectId } from 'mongodb';
import { connectDb } from '@/lib/mongodb-unified';

/**
 * Fee configuration
 */
const FEE_CONFIG = {
  platformCommissionRate: 0.10, // 10%
  paymentGatewayFeeRate: 0.025, // 2.5%
  vatRate: 0.15, // 15%
  reserveRate: 0.20, // 20%
  holdPeriodDays: 7, // Days to hold funds post-delivery
  minimumPayoutThreshold: 500, // SAR
} as const;

/**
 * Order status types for settlement
 */
type SettlementOrderStatus = 
  | 'pending' 
  | 'eligible' 
  | 'processed' 
  | 'held' 
  | 'disputed';

/**
 * Transaction types
 */
type TransactionType = 
  | 'sale' 
  | 'refund' 
  | 'commission' 
  | 'gateway_fee' 
  | 'vat' 
  | 'reserve_hold' 
  | 'reserve_release' 
  | 'adjustment'
  | 'chargeback';

/**
 * Order for settlement calculation
 */
interface SettlementOrder {
  orderId: string;
  listingId: string;
  sellerId: string;
  orderValue: number; // Total amount buyer paid
  itemPrice: number; // Item price
  shippingFee: number; // Shipping fee
  deliveredAt: Date;
  status: SettlementOrderStatus;
  hasDispute?: boolean;
  refundAmount?: number;
  chargebackAmount?: number;
}

/**
 * Fee breakdown
 */
interface FeeBreakdown {
  orderValue: number;
  itemPrice: number;
  shippingFee: number;
  platformCommission: number;
  paymentGatewayFee: number;
  vatOnCommission: number;
  totalFees: number;
  sellerPayout: number;
  reserveAmount: number;
  netPayoutNow: number;
}

/**
 * Settlement period
 */
interface SettlementPeriod {
  startDate: Date;
  endDate: Date;
  totalOrders: number;
  totalSales: number;
  totalCommissions: number;
  totalFees: number;
  totalRefunds: number;
  totalReserves: number;
  netPayout: number;
  orders: SettlementOrder[];
}

/**
 * Settlement statement
 */
interface SettlementStatement {
  _id?: ObjectId;
  statementId: string;
  sellerId: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalOrders: number;
    grossSales: number;
    platformCommissions: number;
    gatewayFees: number;
    vat: number;
    refunds: number;
    chargebacks: number;
    reserves: number;
    netPayout: number;
  };
  transactions: Array<{
    transactionId: string;
    orderId: string;
    type: TransactionType;
    amount: number;
    timestamp: Date;
    description: string;
  }>;
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'failed';
  generatedAt: Date;
  paidAt?: Date;
  notes?: string;
}

/**
 * Adjustment input
 */
interface Adjustment {
  orderId: string;
  type: 'refund' | 'chargeback' | 'manual';
  amount: number;
  reason: string;
  adminId?: string;
}

/**
 * Settlement Calculator Service
 */
export class SettlementCalculatorService {
  /**
   * Calculate fees for a single order
   */
  static calculateOrderFees(order: SettlementOrder): FeeBreakdown {
    const { orderValue, itemPrice, shippingFee } = order;

    // Platform commission (10% of item price, not including shipping)
    const platformCommission = itemPrice * FEE_CONFIG.platformCommissionRate;

    // Payment gateway fee (2.5% of total order value)
    const paymentGatewayFee = orderValue * FEE_CONFIG.paymentGatewayFeeRate;

    // VAT on platform commission (15%)
    const vatOnCommission = platformCommission * FEE_CONFIG.vatRate;

    // Total fees
    const totalFees = platformCommission + paymentGatewayFee + vatOnCommission;

    // Seller payout (order value - total fees)
    const sellerPayout = orderValue - totalFees;

    // Reserve amount (20% of seller payout, held for 7 days)
    const reserveAmount = sellerPayout * FEE_CONFIG.reserveRate;

    // Net payout now (80% released immediately after hold period)
    const netPayoutNow = sellerPayout - reserveAmount;

    return {
      orderValue,
      itemPrice,
      shippingFee,
      platformCommission: parseFloat(platformCommission.toFixed(2)),
      paymentGatewayFee: parseFloat(paymentGatewayFee.toFixed(2)),
      vatOnCommission: parseFloat(vatOnCommission.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
      sellerPayout: parseFloat(sellerPayout.toFixed(2)),
      reserveAmount: parseFloat(reserveAmount.toFixed(2)),
      netPayoutNow: parseFloat(netPayoutNow.toFixed(2)),
    };
  }

  /**
   * Check if order is eligible for settlement
   */
  static isOrderEligible(order: SettlementOrder): boolean {
    const now = new Date();
    const deliveredAt = new Date(order.deliveredAt);
    const holdPeriodEnd = new Date(deliveredAt);
    holdPeriodEnd.setDate(holdPeriodEnd.getDate() + FEE_CONFIG.holdPeriodDays);

    // Order must be:
    // 1. Delivered
    // 2. Past hold period (7 days)
    // 3. No active dispute
    // 4. Not already processed
    return (
      order.status === 'eligible' &&
      now >= holdPeriodEnd &&
      !order.hasDispute
    );
  }

  /**
   * Calculate settlement for a period
   */
  static async calculatePeriodSettlement(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SettlementPeriod> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const ordersCollection = db.collection('souq_orders');

    // Fetch eligible orders for the period
    const orders = await ordersCollection
      .find({
        sellerId: new ObjectId(sellerId),
        deliveredAt: { $gte: startDate, $lte: endDate },
        status: 'delivered',
      })
      .toArray();

    // Convert to settlement orders
    const settlementOrders: SettlementOrder[] = orders.map(order => {
      const baseOrder: SettlementOrder = {
        orderId: order._id.toString(),
        listingId: order.listingId,
        sellerId: order.sellerId.toString(),
        orderValue: order.totalAmount,
        itemPrice: order.itemPrice,
        shippingFee: order.shippingFee || 0,
        deliveredAt: order.deliveredAt,
        status: 'pending',
        hasDispute: order.hasDispute || false,
        refundAmount: order.refundAmount || 0,
        chargebackAmount: order.chargebackAmount || 0,
      };

      const eligible = this.isOrderEligible({ ...baseOrder, status: 'eligible' });
      return {
        ...baseOrder,
        status: eligible ? 'eligible' : 'pending',
      };
    });

    // Calculate totals
    let totalSales = 0;
    let totalCommissions = 0;
    let totalFees = 0;
    let totalRefunds = 0;
    let totalReserves = 0;
    let netPayout = 0;

    for (const order of settlementOrders) {
      if (order.status === 'eligible') {
        const fees = this.calculateOrderFees(order);
        totalSales += order.orderValue;
        totalCommissions += fees.platformCommission;
        totalFees += fees.totalFees;
        totalRefunds += order.refundAmount || 0;
        totalReserves += fees.reserveAmount;
        netPayout += fees.netPayoutNow;
      }
    }

    return {
      startDate,
      endDate,
      totalOrders: settlementOrders.filter((o) => o.status === 'eligible').length,
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalCommissions: parseFloat(totalCommissions.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
      totalRefunds: parseFloat(totalRefunds.toFixed(2)),
      totalReserves: parseFloat(totalReserves.toFixed(2)),
      netPayout: parseFloat(netPayout.toFixed(2)),
      orders: settlementOrders,
    };
  }

  /**
   * Generate settlement statement
   */
  static async generateStatement(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SettlementStatement> {
    const period = await this.calculatePeriodSettlement(sellerId, startDate, endDate);
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const statementsCollection = db.collection<SettlementStatement>('souq_settlements');

    // Generate statement ID
    const statementId = `STMT-${Date.now()}-${sellerId.slice(-6).toUpperCase()}`;

    // Build transactions list
    const transactions: SettlementStatement['transactions'] = [];

    for (const order of period.orders) {
      if (order.status === 'eligible') {
        const fees = this.calculateOrderFees(order);

        // Sale transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-SALE`,
          orderId: order.orderId,
          type: 'sale',
          amount: order.orderValue,
          timestamp: order.deliveredAt,
          description: `Order sale: ${order.orderId}`,
        });

        // Commission transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-COMM`,
          orderId: order.orderId,
          type: 'commission',
          amount: -fees.platformCommission,
          timestamp: order.deliveredAt,
          description: `Platform commission (10%)`,
        });

        // Gateway fee transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-GATE`,
          orderId: order.orderId,
          type: 'gateway_fee',
          amount: -fees.paymentGatewayFee,
          timestamp: order.deliveredAt,
          description: `Payment gateway fee (2.5%)`,
        });

        // VAT transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-VAT`,
          orderId: order.orderId,
          type: 'vat',
          amount: -fees.vatOnCommission,
          timestamp: order.deliveredAt,
          description: `VAT on commission (15%)`,
        });

        // Reserve hold transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-RESV`,
          orderId: order.orderId,
          type: 'reserve_hold',
          amount: -fees.reserveAmount,
          timestamp: order.deliveredAt,
          description: `Reserve held (20%, released after 14 days)`,
        });

        // Refund transaction (if any)
        if (order.refundAmount && order.refundAmount > 0) {
          transactions.push({
            transactionId: `TXN-${order.orderId}-RFND`,
            orderId: order.orderId,
            type: 'refund',
            amount: -order.refundAmount,
            timestamp: new Date(),
            description: `Refund issued`,
          });
        }

        // Chargeback transaction (if any)
        if (order.chargebackAmount && order.chargebackAmount > 0) {
          transactions.push({
            transactionId: `TXN-${order.orderId}-CHRG`,
            orderId: order.orderId,
            type: 'chargeback',
            amount: -order.chargebackAmount,
            timestamp: new Date(),
            description: `Chargeback deduction`,
          });
        }
      }
    }

    // Create statement
    const statement: SettlementStatement = {
      statementId,
      sellerId,
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalOrders: period.totalOrders,
        grossSales: period.totalSales,
        platformCommissions: period.totalCommissions,
        gatewayFees: parseFloat((period.totalSales * FEE_CONFIG.paymentGatewayFeeRate).toFixed(2)),
        vat: parseFloat((period.totalCommissions * FEE_CONFIG.vatRate).toFixed(2)),
        refunds: period.totalRefunds,
        chargebacks: 0, // Calculate from orders
        reserves: period.totalReserves,
        netPayout: period.netPayout - period.totalRefunds,
      },
      transactions,
      status: 'draft',
      generatedAt: new Date(),
    };

    // Save statement to database
    await statementsCollection.insertOne(statement);

    return statement;
  }

  /**
   * Apply adjustment to settlement
   */
  static async applyAdjustment(
    statementId: string,
    adjustment: Adjustment
  ): Promise<void> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const statementsCollection = db.collection<SettlementStatement>('souq_settlements');

    // Find statement
    const statement = await statementsCollection.findOne({ statementId });
    if (!statement) {
      throw new Error('Statement not found');
    }

    // Create adjustment transaction
    const adjustmentTxn = {
      transactionId: `TXN-${adjustment.orderId}-ADJ-${Date.now()}`,
      orderId: adjustment.orderId,
      type: 'adjustment' as TransactionType,
      amount: -Math.abs(adjustment.amount), // Always negative for deductions
      timestamp: new Date(),
      description: `${adjustment.type}: ${adjustment.reason}`,
    };

    // Update statement
    await statementsCollection.updateOne(
      { statementId },
      {
        $push: { transactions: adjustmentTxn },
        $inc: {
          'summary.netPayout': -Math.abs(adjustment.amount),
        },
        $set: {
          notes: adjustment.reason,
        },
      }
    );
  }

  /**
   * Release reserve for old orders
   */
  static async releaseReserves(sellerId: string): Promise<number> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const ordersCollection = db.collection('souq_orders');

    // Find orders past reserve period (14 days)
    const reservePeriodEnd = new Date();
    reservePeriodEnd.setDate(reservePeriodEnd.getDate() - 14);

    const orders = await ordersCollection
      .find({
        sellerId: new ObjectId(sellerId),
        deliveredAt: { $lte: reservePeriodEnd },
        'settlement.reserveReleased': { $ne: true },
      })
      .toArray();

    let totalReleased = 0;

    for (const order of orders) {
      const fees = this.calculateOrderFees({
        orderId: order._id.toString(),
        listingId: order.listingId,
        sellerId: order.sellerId.toString(),
        orderValue: order.totalAmount,
        itemPrice: order.itemPrice,
        shippingFee: order.shippingFee || 0,
        deliveredAt: order.deliveredAt,
        status: 'eligible',
      });

      totalReleased += fees.reserveAmount;

      // Mark reserve as released
      await ordersCollection.updateOne(
        { _id: order._id },
        {
          $set: {
            'settlement.reserveReleased': true,
            'settlement.reserveReleasedAt': new Date(),
          },
        }
      );
    }

    return parseFloat(totalReleased.toFixed(2));
  }

  /**
   * Get settlement summary for seller dashboard
   */
  static async getSellerSummary(sellerId: string): Promise<{
    availableBalance: number;
    reservedBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    lastPayoutDate?: Date;
    nextPayoutDate?: Date;
  }> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const ordersCollection = db.collection('souq_orders');
    const statementsCollection = db.collection<SettlementStatement>('souq_settlements');

    // Calculate available balance (orders past hold period)
    const availableOrders = await ordersCollection
      .find({
        sellerId: new ObjectId(sellerId),
        status: 'delivered',
        deliveredAt: {
          $lte: new Date(Date.now() - FEE_CONFIG.holdPeriodDays * 24 * 60 * 60 * 1000),
        },
        'settlement.processed': { $ne: true },
      })
      .toArray();

    let availableBalance = 0;
    for (const order of availableOrders) {
      const fees = this.calculateOrderFees({
        orderId: order._id.toString(),
        listingId: order.listingId,
        sellerId: order.sellerId.toString(),
        orderValue: order.totalAmount,
        itemPrice: order.itemPrice,
        shippingFee: order.shippingFee || 0,
        deliveredAt: order.deliveredAt,
        status: 'eligible',
      });
      availableBalance += fees.netPayoutNow;
    }

    // Calculate reserved balance (orders within hold period)
    const reservedOrders = await ordersCollection
      .find({
        sellerId: new ObjectId(sellerId),
        status: 'delivered',
        deliveredAt: {
          $gt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      })
      .toArray();

    let reservedBalance = 0;
    for (const order of reservedOrders) {
      const fees = this.calculateOrderFees({
        orderId: order._id.toString(),
        listingId: order.listingId,
        sellerId: order.sellerId.toString(),
        orderValue: order.totalAmount,
        itemPrice: order.itemPrice,
        shippingFee: order.shippingFee || 0,
        deliveredAt: order.deliveredAt,
        status: 'held',
      });
      reservedBalance += fees.reserveAmount;
    }

    // Calculate pending balance (orders not yet delivered)
    const pendingOrders = await ordersCollection
      .find({
        sellerId: new ObjectId(sellerId),
        status: { $in: ['pending', 'processing', 'shipped'] },
      })
      .toArray();

    let pendingBalance = 0;
    for (const order of pendingOrders) {
      const fees = this.calculateOrderFees({
        orderId: order._id.toString(),
        listingId: order.listingId,
        sellerId: order.sellerId.toString(),
        orderValue: order.totalAmount,
        itemPrice: order.itemPrice,
        shippingFee: order.shippingFee || 0,
        deliveredAt: new Date(),
        status: 'pending',
      });
      pendingBalance += fees.netPayoutNow;
    }

    // Get total earnings (all paid statements)
    const paidStatements = await statementsCollection
      .find({
        sellerId,
        status: 'paid',
      })
      .toArray();

    const totalEarnings = paidStatements.reduce(
      (sum, stmt) => sum + (stmt.summary?.netPayout ?? 0),
      0
    );

    // Get last payout date
    const lastStatement = await statementsCollection.findOne(
      { sellerId, status: 'paid' },
      { sort: { paidAt: -1 } }
    );

    return {
      availableBalance: parseFloat(availableBalance.toFixed(2)),
      reservedBalance: parseFloat(reservedBalance.toFixed(2)),
      pendingBalance: parseFloat(pendingBalance.toFixed(2)),
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      lastPayoutDate: lastStatement?.paidAt,
      nextPayoutDate: this.getNextPayoutDate(),
    };
  }

  /**
   * Get next payout date (every Friday)
   */
  private static getNextPayoutDate(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // 5 = Friday
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    nextFriday.setHours(12, 0, 0, 0); // Noon
    return nextFriday;
  }
}

export { FEE_CONFIG };
export type { 
  SettlementOrder, 
  FeeBreakdown, 
  SettlementPeriod, 
  SettlementStatement,
  Adjustment,
  TransactionType,
};
