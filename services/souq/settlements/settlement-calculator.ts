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

import { ObjectId } from "mongodb";
import { connectDb } from "@/lib/mongodb-unified";

/**
 * Fee configuration
 */
const FEE_CONFIG = {
  platformCommissionRate: 0.1, // 10%
  paymentGatewayFeeRate: 0.025, // 2.5%
  vatRate: 0.15, // 15%
  reserveRate: 0.2, // 20%
  holdPeriodDays: 7, // Days to hold funds post-delivery
  minimumPayoutThreshold: 500, // SAR
} as const;

/**
 * Order status types for settlement
 */
type SettlementOrderStatus =
  | "pending"
  | "eligible"
  | "processed"
  | "held"
  | "disputed";

/**
 * Transaction types
 */
type TransactionType =
  | "sale"
  | "refund"
  | "commission"
  | "gateway_fee"
  | "vat"
  | "reserve_hold"
  | "reserve_release"
  | "adjustment"
  | "chargeback";

/**
 * Order for settlement calculation
 */
interface SettlementOrder {
  orderId: string;
  listingId: string;
  sellerId: string;
  orgId: string; // 🔐 STRICT v4.1: Required for tenant isolation
  escrowAccountId?: string;
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
  orgId: string; // 🔐 STRICT v4.1: Required for tenant isolation
  escrowAccountId?: string;
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
  status: "draft" | "pending" | "approved" | "paid" | "failed";
  generatedAt: Date;
  paidAt?: Date;
  notes?: string;
}

type RawOrderItem = {
  sellerId?: unknown;
  listingId?: unknown;
  subtotal?: number;
  pricePerUnit?: number;
  quantity?: number;
};

type RawOrder = {
  _id?: { toString?: () => string } | string;
  items?: unknown;
  listingId?: unknown;
  pricing?: {
    shippingFee?: number;
    tax?: number;
    discount?: number;
    total?: number;
  };
  shippingFee?: number;
  deliveredAt?: unknown;
  completedAt?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
  returnRequest?: { refundAmount?: number };
  refundAmount?: number;
  hasDispute?: boolean;
  chargebackAmount?: number;
  escrow?: { accountId?: unknown };
  escrowAccountId?: unknown;
  orgId?: { toString?: () => string } | string;
  status?: SettlementOrder["status"] | string;
};

const computeSellerOrderSnapshot = (
  order: RawOrder,
  sellerId: string,
): SettlementOrder | null => {
  const items = Array.isArray(order.items)
    ? (order.items as RawOrderItem[])
    : [];
  const sellerItems = items.filter((item) => {
    const itemSellerId = item?.sellerId;
    if (!itemSellerId) return false;
    if (typeof itemSellerId === "string") return itemSellerId === sellerId;
    if (
      typeof itemSellerId === "object" &&
      itemSellerId !== null &&
      "toString" in itemSellerId &&
      typeof itemSellerId.toString === "function"
    ) {
      return itemSellerId.toString() === sellerId;
    }
    return String(itemSellerId) === sellerId;
  });

  if (sellerItems.length === 0) {
    return null;
  }

  const listingId = sellerItems[0]?.listingId
    ? sellerItems[0].listingId.toString()
    : (order.listingId?.toString?.() ?? "");

  const subtotal = sellerItems.reduce((sum: number, item: RawOrderItem) => {
    if (typeof item.subtotal === "number") return sum + item.subtotal;
    const price = typeof item.pricePerUnit === "number" ? item.pricePerUnit : 0;
    const qty = typeof item.quantity === "number" ? item.quantity : 1;
    return sum + price * qty;
  }, 0);

  const pricing = order.pricing ?? {};
  const shippingFee =
    typeof pricing.shippingFee === "number"
      ? pricing.shippingFee
      : (order.shippingFee ?? 0);
  const tax = typeof pricing.tax === "number" ? pricing.tax : 0;
  const discount = typeof pricing.discount === "number" ? pricing.discount : 0;
  const orderValue =
    typeof pricing.total === "number"
      ? pricing.total
      : Math.max(0, subtotal + shippingFee + tax - discount);

  const deliveredAtRaw =
    order.deliveredAt ??
    order.completedAt ??
    order.updatedAt ??
    order.createdAt ??
    null;
  const deliveredAt =
    deliveredAtRaw instanceof Date
      ? deliveredAtRaw
      : deliveredAtRaw
        ? new Date(deliveredAtRaw as unknown as string | number | Date)
        : new Date();

  const refundAmount =
    order.returnRequest?.refundAmount ?? order.refundAmount ?? 0;
  const hasDispute = Boolean(order.hasDispute || order.chargebackAmount);

  const escrowAccountId =
    order.escrow?.accountId?.toString?.() ??
    order.escrowAccountId?.toString?.();

  return {
    orderId: order._id?.toString?.() ?? "",
    listingId,
    sellerId,
    orgId: order.orgId?.toString?.() || "",
    escrowAccountId,
    orderValue,
    itemPrice: subtotal,
    shippingFee,
    deliveredAt:
      deliveredAt instanceof Date ? deliveredAt : new Date(deliveredAt),
    status:
      typeof order.status === "string" &&
      ["pending", "eligible", "processed", "held", "disputed"].includes(
        order.status,
      )
        ? (order.status as SettlementOrder["status"])
        : "pending",
    hasDispute,
    refundAmount,
    chargebackAmount: order.chargebackAmount ?? 0,
  };
};

/**
 * Adjustment input
 */
interface Adjustment {
  orderId: string;
  type: "refund" | "chargeback" | "manual";
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
      order.status === "eligible" && now >= holdPeriodEnd && !order.hasDispute
    );
  }

  /**
   * Calculate settlement for a period
   */
  static async calculatePeriodSettlement(
    sellerId: string,
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SettlementPeriod> {
    if (!orgId) {
      throw new Error("orgId is required for calculatePeriodSettlement (STRICT v4.1 tenant isolation)");
    }
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const ordersCollection = db.collection("souq_orders");

    const orderSellerId = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;

    // Fetch eligible orders for the period
    const orders = await ordersCollection
      .find({
        "items.sellerId": orderSellerId,
        deliveredAt: { $gte: startDate, $lte: endDate },
        status: "delivered",
        orgId,
      })
      .toArray();

    // Convert to settlement orders
    const settlementOrders: SettlementOrder[] = orders
      .map((order) => computeSellerOrderSnapshot(order, sellerId))
      .filter((order): order is SettlementOrder => Boolean(order))
      .map((order) => {
        const eligible = this.isOrderEligible({ ...order, status: "eligible" });
        return {
          ...order,
          status: eligible
            ? "eligible"
            : ("pending" as SettlementOrder["status"]),
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
      if (order.status === "eligible") {
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
      totalOrders: settlementOrders.filter((o) => o.status === "eligible")
        .length,
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
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SettlementStatement> {
    if (!orgId) {
      throw new Error("orgId is required to generate statement (STRICT v4.1 tenant isolation)");
    }
    const period = await this.calculatePeriodSettlement(
      sellerId,
      orgId,
      startDate,
      endDate,
    );
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const statementsCollection =
      db.collection<SettlementStatement>("souq_settlements");

    // Generate statement ID
    const statementId = `STMT-${Date.now()}-${sellerId.slice(-6).toUpperCase()}`;

    // Build transactions list
    const transactions: SettlementStatement["transactions"] = [];

    for (const order of period.orders) {
      if (order.status === "eligible") {
        const fees = this.calculateOrderFees(order);

        // Sale transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-SALE`,
          orderId: order.orderId,
          type: "sale",
          amount: order.orderValue,
          timestamp: order.deliveredAt,
          description: `Order sale: ${order.orderId}`,
        });

        // Commission transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-COMM`,
          orderId: order.orderId,
          type: "commission",
          amount: -fees.platformCommission,
          timestamp: order.deliveredAt,
          description: `Platform commission (10%)`,
        });

        // Gateway fee transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-GATE`,
          orderId: order.orderId,
          type: "gateway_fee",
          amount: -fees.paymentGatewayFee,
          timestamp: order.deliveredAt,
          description: `Payment gateway fee (2.5%)`,
        });

        // VAT transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-VAT`,
          orderId: order.orderId,
          type: "vat",
          amount: -fees.vatOnCommission,
          timestamp: order.deliveredAt,
          description: `VAT on commission (15%)`,
        });

        // Reserve hold transaction
        transactions.push({
          transactionId: `TXN-${order.orderId}-RESV`,
          orderId: order.orderId,
          type: "reserve_hold",
          amount: -fees.reserveAmount,
          timestamp: order.deliveredAt,
          description: `Reserve held (20%, released after 14 days)`,
        });

        // Refund transaction (if any)
        if (order.refundAmount && order.refundAmount > 0) {
          transactions.push({
            transactionId: `TXN-${order.orderId}-RFND`,
            orderId: order.orderId,
            type: "refund",
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
            type: "chargeback",
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
      orgId,
      escrowAccountId: period.orders.find(
        (o: SettlementOrder) => o.escrowAccountId,
      )?.escrowAccountId,
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalOrders: period.totalOrders,
        grossSales: period.totalSales,
        platformCommissions: period.totalCommissions,
        gatewayFees: parseFloat(
          (period.totalSales * FEE_CONFIG.paymentGatewayFeeRate).toFixed(2),
        ),
        vat: parseFloat(
          (period.totalCommissions * FEE_CONFIG.vatRate).toFixed(2),
        ),
        refunds: period.totalRefunds,
        chargebacks: 0, // Calculate from orders
        reserves: period.totalReserves,
        netPayout: period.netPayout - period.totalRefunds,
      },
      transactions,
      status: "draft",
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
    adjustment: Adjustment,
  ): Promise<void> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const statementsCollection =
      db.collection<SettlementStatement>("souq_settlements");

    // Find statement
    const statement = await statementsCollection.findOne({ statementId });
    if (!statement) {
      throw new Error("Statement not found");
    }
    const statementOrgId = statement.orgId?.toString?.();
    if (!statementOrgId) {
      throw new Error("orgId missing on statement; cannot apply adjustment securely");
    }

    // Create adjustment transaction
    const adjustmentTxn = {
      transactionId: `TXN-${adjustment.orderId}-ADJ-${Date.now()}`,
      orderId: adjustment.orderId,
      type: "adjustment" as TransactionType,
      amount: -Math.abs(adjustment.amount), // Always negative for deductions
      timestamp: new Date(),
      description: `${adjustment.type}: ${adjustment.reason}`,
    };

    // Update statement
    await statementsCollection.updateOne(
      { statementId, orgId: statementOrgId },
      {
        $push: { transactions: adjustmentTxn },
        $inc: {
          "summary.netPayout": -Math.abs(adjustment.amount),
        },
        $set: {
          notes: adjustment.reason,
        },
      },
    );
  }

  /**
   * Release reserve for old orders
   */
  static async releaseReserves(sellerId: string, orgId: string): Promise<number> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const ordersCollection = db.collection("souq_orders");
    if (!orgId) {
      throw new Error("orgId is required for releaseReserves (STRICT v4.1 tenant isolation)");
    }
    const orderSellerId = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;

    // Find orders past reserve period (14 days)
    const reservePeriodEnd = new Date();
    reservePeriodEnd.setDate(reservePeriodEnd.getDate() - 14);

    const orders = await ordersCollection
      .find({
        "items.sellerId": orderSellerId,
        deliveredAt: { $lte: reservePeriodEnd },
        "settlement.reserveReleased": { $ne: true },
        orgId,
      })
      .toArray();

    let totalReleased = 0;

    for (const rawOrder of orders) {
      const order = computeSellerOrderSnapshot(rawOrder, sellerId);
      if (!order) continue;
      const fees = this.calculateOrderFees({
        orderId: order.orderId,
        listingId: order.listingId,
        sellerId: order.sellerId,
        orgId: order.orgId,
        orderValue: order.orderValue,
        itemPrice: order.itemPrice,
        shippingFee: order.shippingFee || 0,
        deliveredAt: order.deliveredAt,
        status: "eligible",
      });

      totalReleased += fees.reserveAmount;

      // Mark reserve as released
      await ordersCollection.updateOne(
        { _id: rawOrder._id },
        {
          $set: {
            "settlement.reserveReleased": true,
            "settlement.reserveReleasedAt": new Date(),
          },
        },
      );
    }

    return parseFloat(totalReleased.toFixed(2));
  }

  /**
   * Get settlement summary for seller dashboard
   */
  static async getSellerSummary(
    sellerId: string,
    orgId: string,
  ): Promise<{
    availableBalance: number;
    reservedBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    lastPayoutDate?: Date;
    nextPayoutDate?: Date;
  }> {
    if (!orgId) {
      throw new Error("orgId is required for getSellerSummary (STRICT v4.1 tenant isolation)");
    }
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const ordersCollection = db.collection("souq_orders");
    const statementsCollection =
      db.collection<SettlementStatement>("souq_settlements");
    const orderSellerId = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;

    // Calculate available balance (orders past hold period)
    const availableOrders = await ordersCollection
      .find({
        "items.sellerId": orderSellerId,
        status: "delivered",
        deliveredAt: {
          $lte: new Date(
            Date.now() - FEE_CONFIG.holdPeriodDays * 24 * 60 * 60 * 1000,
          ),
        },
        "settlement.processed": { $ne: true },
        orgId,
      })
      .toArray();

    let availableBalance = 0;
    for (const rawOrder of availableOrders) {
      const order = computeSellerOrderSnapshot(rawOrder, sellerId);
      if (!order) continue;
      const fees = this.calculateOrderFees({
        orderId: order.orderId,
        listingId: order.listingId,
        sellerId: order.sellerId,
        orgId: order.orgId,
        orderValue: order.orderValue,
        itemPrice: order.itemPrice,
        shippingFee: order.shippingFee || 0,
        deliveredAt: order.deliveredAt,
        status: "eligible",
      });
      availableBalance += fees.netPayoutNow;
    }

    // Calculate reserved balance (orders within hold period)
    const reservedOrders = await ordersCollection
      .find({
        "items.sellerId": orderSellerId,
        status: "delivered",
        deliveredAt: {
          $gt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
        orgId,
      })
      .toArray();

    let reservedBalance = 0;
    for (const rawOrder of reservedOrders) {
      const order = computeSellerOrderSnapshot(rawOrder, sellerId);
      if (!order) continue;
      const fees = this.calculateOrderFees({
        orderId: order.orderId,
        listingId: order.listingId,
        sellerId: order.sellerId,
        orgId: order.orgId,
        orderValue: order.orderValue,
        itemPrice: order.itemPrice,
        shippingFee: order.shippingFee || 0,
        deliveredAt: order.deliveredAt,
        status: "held",
      });
      reservedBalance += fees.reserveAmount;
    }

    // Calculate pending balance (orders not yet delivered)
    const pendingOrders = await ordersCollection
      .find({
        "items.sellerId": orderSellerId,
        status: { $in: ["pending", "processing", "shipped"] },
        orgId,
      })
      .toArray();

    let pendingBalance = 0;
    for (const rawOrder of pendingOrders) {
      const order = computeSellerOrderSnapshot(rawOrder, sellerId);
      if (!order) continue;
      const fees = this.calculateOrderFees({
        orderId: order.orderId,
        listingId: order.listingId,
        sellerId: order.sellerId,
        orgId: order.orgId,
        orderValue: order.orderValue,
        itemPrice: order.itemPrice,
        shippingFee: order.shippingFee || 0,
        deliveredAt: new Date(),
        status: "pending",
      });
      pendingBalance += fees.netPayoutNow;
    }

    // Get total earnings (all paid statements)
    const paidStatements = await statementsCollection
      .find({
        sellerId,
        status: "paid",
        orgId,
      })
      .toArray();

    const totalEarnings = paidStatements.reduce(
      (sum, stmt) => sum + (stmt.summary?.netPayout ?? 0),
      0,
    );

    // Get last payout date
    const lastStatement = await statementsCollection.findOne(
      { sellerId, status: "paid", orgId },
      { sort: { paidAt: -1 } },
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
