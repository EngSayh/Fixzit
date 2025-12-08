import { SouqOrder } from "@/server/models/souq/Order";
import { SouqListing } from "@/server/models/souq/Listing";
import { SouqInventory } from "@/server/models/souq/Inventory";
import { aramexCarrier } from "@/lib/carriers/aramex";
import { smsaCarrier } from "@/lib/carriers/smsa";
import { splCarrier } from "@/lib/carriers/spl";
import { addJob } from "@/lib/queues/setup";
import { logger } from "@/lib/logger";
import { EMAIL_DOMAINS } from "@/lib/config/domains";
import type { IOrder } from "@/server/models/souq/Order";
import { buildSouqOrgFilter } from "@/services/souq/org-scope";

type OrderItem = IOrder["items"][number];
type FbfShipmentItem = OrderItem & { warehouseId?: string };

/**
 * Fulfillment Service
 * Manages FBF (Fulfillment by Fixzit) and FBM (Fulfilled by Merchant) operations
 * Includes label generation, carrier selection, SLA computation, and Fast Badge assignment
 */

export interface ICarrierInterface {
  name: string;
  createShipment(params: ICreateShipmentParams): Promise<IShipmentResponse>;
  getTracking(trackingNumber: string): Promise<ITrackingResponse>;
  cancelShipment(shipmentId: string): Promise<boolean>;
  getRates(params: IRateParams): Promise<IRate[]>;
}

export interface ICreateShipmentParams {
  orderId: string;
  orderNumber: string;
  shipFrom: IAddress;
  shipTo: IAddress;
  packages: IPackage[];
  serviceType: "standard" | "express" | "same_day";
  declaredValue: number;
  codAmount?: number;
  reference?: string;
}

export interface IAddress {
  name: string;
  phone: string;
  email?: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface IPackage {
  weight: number; // kg
  length: number; // cm
  width: number;
  height: number;
  description: string;
}

export interface IShipmentResponse {
  shipmentId: string;
  trackingNumber: string;
  labelUrl: string;
  estimatedDelivery: Date;
  cost: number;
}

export interface ITrackingResponse {
  trackingNumber: string;
  status:
    | "pending"
    | "picked_up"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failed"
    | "returned";
  events: ITrackingEvent[];
  estimatedDelivery?: Date;
  actualDelivery?: Date;
}

export interface ITrackingEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
}

export interface IRateParams {
  origin: string; // City
  destination: string; // City
  weight: number;
  serviceType: "standard" | "express" | "same_day";
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: string;
  };
}

export interface IRate {
  carrier: string;
  serviceType: string;
  cost: number;
  estimatedDays: number;
}

export interface IFulfillmentRequest {
  orderId: string;
  orgId: string;
  orderItems: Array<{
    orderItemId: string;
    listingId: string;
    productId: string;
    quantity: number;
  }>;
  shippingAddress: IAddress;
  buyerPhone: string;
  buyerEmail: string;
}

export interface ISLAMetrics {
  orderDate: Date;
  handlingDeadline: Date; // When seller must ship by
  deliveryPromise: Date; // When buyer expects delivery
  currentStatus: string;
  isOnTime: boolean;
  daysRemaining: number;
  urgency: "normal" | "warning" | "critical";
}

class FulfillmentService {
  private carriers: Map<string, ICarrierInterface>;

  constructor() {
    this.carriers = new Map();
    this.carriers.set("aramex", aramexCarrier);
    this.carriers.set("smsa", smsaCarrier);
    this.carriers.set("spl", splCarrier);
  }

  /**
   * Initiate fulfillment for an order
   */
  async fulfillOrder(request: IFulfillmentRequest): Promise<void> {
    try {
      if (!request.orgId) {
        throw new Error("orgId is required to fulfill order (tenant scoping)");
      }

      const orgFilter = buildSouqOrgFilter(request.orgId) as Record<string, unknown>;
      const scopedQuery = {
        orderId: request.orderId,
        ...orgFilter,
      };
      const order = await SouqOrder.findOne(scopedQuery);

      const orderOrg = order?.orgId?.toString?.();
      if (!order || !orderOrg || orderOrg !== request.orgId.toString()) {
        throw new Error("Order not found for org");
      }

      // Group items by fulfillment type
      const fbfItems: FbfShipmentItem[] = [];
      const fbmItems: OrderItem[] = [];

      // 🚀 PERFORMANCE: Batch fetch all inventory records instead of N+1 queries
      const listingIds = request.orderItems.map((item) => item.listingId);
      const inventories = await SouqInventory.find({
        listingId: { $in: listingIds },
        ...orgFilter,
      }).lean();

      // Create a map for O(1) lookup
      const inventoryMap = new Map(
        inventories.map((inv) => [inv.listingId?.toString(), inv])
      );

      for (const item of request.orderItems) {
        const inventory = inventoryMap.get(item.listingId);

        if (!inventory) {
          throw new Error(
            `Inventory not found for listing/org: ${item.listingId}`,
          );
        }

        const orderItem = order.items.find((orderItemDoc) => {
          const listingId = orderItemDoc.listingId.toString();
          return listingId === item.listingId;
        });

        if (!orderItem) {
          throw new Error(
            `Order item ${item.orderItemId} not found on order ${order.orderId}`,
          );
        }

        if (inventory.fulfillmentType === "FBF") {
          fbfItems.push({
            ...orderItem,
            warehouseId: inventory.warehouseId?.toString(),
          });
        } else {
          fbmItems.push(orderItem);
        }
      }

      // Process FBF items
      if (fbfItems.length > 0) {
        await this.processFBFShipment(order, fbfItems, request.shippingAddress);
      }

      // Process FBM items (notify sellers)
      if (fbmItems.length > 0) {
        await this.processFBMShipment(order, fbmItems, request.shippingAddress);
      }

      logger.info("Order fulfillment initiated", {
        orderId: request.orderId,
        fbfItems: fbfItems.length,
        fbmItems: fbmItems.length,
      });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to fulfill order", error, {
        orderId: request.orderId,
      });
      throw error;
    }
  }

  /**
   * Process FBF (Fulfillment by Fixzit) shipment
   */
  private async processFBFShipment(
    order: IOrder,
    items: FbfShipmentItem[],
    shippingAddress: IAddress,
  ): Promise<void> {
    try {
      // Get warehouse address (mock for now)
      const warehouseAddress: IAddress = {
        name: "Fixzit Fulfillment Center",
        phone: "+966123456789",
        email: process.env.FULFILLMENT_EMAIL || `fulfillment@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,
        street: "King Fahd Road",
        city: "Riyadh",
        postalCode: "11564",
        country: "SA",
      };

      // Calculate package dimensions
      const packages: IPackage[] = [
        {
          weight: items.reduce((sum, item) => sum + item.quantity * 0.5, 0), // Mock weight
          length: 30,
          width: 20,
          height: 15,
          description: `Order ${order.orderId} - ${items.length} items`,
        },
      ];

      // Select carrier based on delivery speed preference
      const carrier = this.selectCarrier(order.shippingSpeed || "standard");

      // Create shipment
      const shipmentParams: ICreateShipmentParams = {
        orderId: order.orderId,
        orderNumber: order.orderId,
        shipFrom: warehouseAddress,
        shipTo: shippingAddress,
        packages,
        serviceType: order.shippingSpeed || "standard",
        declaredValue: order.pricing.total,
        codAmount:
          order.payment.method === "cod" ? order.pricing.total : undefined,
        reference: order.orderId,
      };

      const shipment = await carrier.createShipment(shipmentParams);

      // Update order with tracking info
      order.shippingCarrier = carrier.name;
      order.trackingNumber = shipment.trackingNumber;
      order.shippingLabelUrl = shipment.labelUrl;
      order.estimatedDeliveryDate = shipment.estimatedDelivery;
      order.fulfillmentStatus = "in_transit";
      await order.save();

      // Queue notification
      await addJob("souq:notifications", "order_shipped", {
        orderId: order.orderId,
        buyerId: order.customerId,
        trackingNumber: shipment.trackingNumber,
        carrier: carrier.name,
        orgId: order.orgId?.toString?.(),
      });

      logger.info("FBF shipment created", {
        orderId: order.orderId,
        trackingNumber: shipment.trackingNumber,
      });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to process FBF shipment", error, {
        orderId: order.orderId,
      });
      throw error;
    }
  }

  /**
   * Process FBM (Fulfilled by Merchant) shipment
   */
  private async processFBMShipment(
    order: IOrder,
    items: OrderItem[],
    shippingAddress: IAddress,
  ): Promise<void> {
    try {
      // Group items by seller
      const itemsBySeller = items.reduce<Record<string, OrderItem[]>>(
        (acc, item) => {
          const sellerKey = item.sellerId.toString();
          if (!acc[sellerKey]) {
            acc[sellerKey] = [];
          }
          acc[sellerKey].push(item);
          return acc;
        },
        {},
      );

      // Notify each seller to fulfill their items
      for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
        await addJob("souq:notifications", "fbm_fulfillment_required", {
          orderId: order.orderId,
          sellerId,
          orgId: order.orgId?.toString?.(), // 🔒 SECURITY: Include orgId for tenant routing
          items: sellerItems,
          shippingAddress,
          deadline: this.calculateHandlingDeadline(order.createdAt, "standard"),
        });
      }

      order.fulfillmentStatus = "pending_seller";
      await order.save();

      logger.info("FBM fulfillment notifications sent", {
        orderId: order.orderId,
        sellerCount: Object.keys(itemsBySeller).length,
      });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to process FBM shipment", error, {
        orderId: order.orderId,
      });
      throw error;
    }
  }

  /**
   * Generate shipping label for FBM seller
   */
  async generateFBMLabel(params: {
    orderId: string;
    sellerId: string;
    sellerAddress: IAddress;
    carrierName: string;
    orgId: string;
  }): Promise<IShipmentResponse> {
    const { orderId, sellerId, sellerAddress, carrierName, orgId } = params;
    try {
      if (!orgId) {
        throw new Error("orgId is required to generate FBM label");
      }

      const orgFilter = buildSouqOrgFilter(orgId) as Record<string, unknown>;
      const order = await SouqOrder.findOne({ orderId, ...orgFilter });

      if (!order) {
        throw new Error(`Order not found for org: ${orderId}`);
      }

      // 🔒 SECURITY: Validate that the seller has items in this order
      const sellerItems = order.items.filter(
        (item) => item.sellerId?.toString() === sellerId
      );
      if (sellerItems.length === 0) {
        throw new Error(
          `Seller ${sellerId} does not have items in order ${orderId}`
        );
      }

      const carrier = this.carriers.get(carrierName.toLowerCase());

      if (!carrier) {
        throw new Error(`Carrier not supported: ${carrierName}`);
      }

      // Get buyer shipping address
      const shippingAddress: IAddress = {
        name: order.shippingAddress.name,
        phone: order.shippingAddress.phone,
        email: order.customerEmail,
        street: [
          order.shippingAddress.addressLine1,
          order.shippingAddress.addressLine2,
        ]
          .filter(Boolean)
          .join(" ")
          .trim(),
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
      };

      // Mock package dimensions
      const packages: IPackage[] = [
        {
          weight: 1.0,
          length: 30,
          width: 20,
          height: 15,
          description: `Order ${order.orderId}`,
        },
      ];

      const shipmentParams: ICreateShipmentParams = {
        orderId: order.orderId,
        orderNumber: order.orderId,
        shipFrom: sellerAddress,
        shipTo: shippingAddress,
        packages,
        serviceType: order.shippingSpeed || "standard",
        declaredValue: order.pricing.total,
        codAmount:
          order.payment.method === "cod" ? order.pricing.total : undefined,
        reference: `${order.orderId}-${sellerId}`,
      };

      const shipment = await carrier.createShipment(shipmentParams);

      // Update order
      order.shippingCarrier = carrier.name;
      order.trackingNumber = shipment.trackingNumber;
      order.shippingLabelUrl = shipment.labelUrl;
      order.estimatedDeliveryDate = shipment.estimatedDelivery;
      order.fulfillmentStatus = "shipped";
      await order.save();

      logger.info("FBM label generated", {
        orderId,
        sellerId,
        trackingNumber: shipment.trackingNumber,
      });

      return shipment;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to generate FBM label", error, {
        orderId,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Update tracking status (called by webhook)
   */
  async updateTracking(
    trackingNumber: string,
    carrierName: string,
    orgId: string,
  ): Promise<void> {
    try {
      if (!orgId) {
        throw new Error("orgId is required to update tracking");
      }

      const carrier = this.carriers.get(carrierName.toLowerCase());

      if (!carrier) {
        logger.warn("Unknown carrier for tracking update", {
          carrierName,
          trackingNumber,
        });
        return;
      }

      const tracking = await carrier.getTracking(trackingNumber);

      const order = await SouqOrder.findOne({
        trackingNumber,
        ...(buildSouqOrgFilter(orgId) as Record<string, unknown>),
      });

      if (!order) {
        logger.warn("Order not found for tracking number", { trackingNumber });
        return;
      }

      // Update order status based on tracking
      const oldStatus = order.fulfillmentStatus;

      switch (tracking.status) {
        case "picked_up":
          order.fulfillmentStatus = "shipped";
          break;
        case "in_transit":
          order.fulfillmentStatus = "in_transit";
          break;
        case "out_for_delivery":
          order.fulfillmentStatus = "out_for_delivery";
          break;
        case "delivered":
          order.fulfillmentStatus = "delivered";
          order.deliveredAt = tracking.actualDelivery || new Date();
          break;
        case "failed":
        case "returned":
          order.fulfillmentStatus = "delivery_failed";
          break;
      }

      await order.save();

      // Notify buyer if status changed
      if (oldStatus !== order.fulfillmentStatus) {
        await addJob("souq:notifications", "order_status_update", {
          orderId: order.orderId,
          buyerId: order.customerId,
          oldStatus,
          newStatus: order.fulfillmentStatus,
          trackingNumber,
          orgId: order.orgId?.toString?.(),
        });
      }

      logger.info("Tracking updated", {
        orderId: order.orderId,
        trackingNumber,
        status: tracking.status,
      });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to update tracking", error, { trackingNumber });
      throw error;
    }
  }

  /**
   * Calculate SLA metrics for an order
   * @param orderId - The order ID
   * @param orgId - Required: Organization ID for tenant isolation
   */
  async calculateSLA(orderId: string, orgId: string): Promise<ISLAMetrics> {
    // 🔒 SECURITY: orgId is mandatory for tenant isolation
    if (!orgId) {
      throw new Error("orgId is required for SLA calculation");
    }

    const orgFilter = buildSouqOrgFilter(orgId) as Record<string, unknown>;
    const order = await SouqOrder.findOne({
      orderId,
      ...orgFilter,
    });

    const orderOrg = order?.orgId?.toString?.();
    if (!order || !orderOrg || orderOrg !== orgId.toString()) {
      throw new Error("Order not found for org");
    }

    const orderDate = order.createdAt;
    const shippingSpeed = order.shippingSpeed || "standard";

    // Calculate deadlines based on shipping speed
    const handlingTime =
      shippingSpeed === "express" ? 1 : shippingSpeed === "same_day" ? 0 : 2;
    const transitTime =
      shippingSpeed === "express" ? 1 : shippingSpeed === "same_day" ? 0 : 3;

    const handlingDeadline = new Date(orderDate);
    handlingDeadline.setDate(handlingDeadline.getDate() + handlingTime);

    const deliveryPromise = new Date(handlingDeadline);
    deliveryPromise.setDate(deliveryPromise.getDate() + transitTime);

    const now = new Date();
    const daysRemaining = Math.ceil(
      (deliveryPromise.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let urgency: "normal" | "warning" | "critical" = "normal";
    let isOnTime = true;

    if (
      order.fulfillmentStatus === "pending" ||
      order.fulfillmentStatus === "pending_seller"
    ) {
      if (now > handlingDeadline) {
        urgency = "critical";
        isOnTime = false;
      } else if (daysRemaining <= 1) {
        urgency = "warning";
      }
    } else if (order.fulfillmentStatus !== "delivered") {
      if (now > deliveryPromise) {
        urgency = "critical";
        isOnTime = false;
      } else if (daysRemaining <= 1) {
        urgency = "warning";
      }
    }

    return {
      orderDate,
      handlingDeadline,
      deliveryPromise,
      currentStatus: order.fulfillmentStatus ?? "pending",
      isOnTime,
      daysRemaining,
      urgency,
    };
  }

  /**
   * Assign Fast Badge to listings that meet criteria
   * 🔒 SECURITY: orgId is REQUIRED to prevent cross-tenant mutations
   */
  async assignFastBadge(listingId: string, orgId: string): Promise<boolean> {
    try {
      // 🔒 SECURITY FIX: Always require orgId - no unscoped fallback
      if (!orgId) {
        logger.warn("assignFastBadge called without orgId - rejecting", { listingId });
        return false;
      }

      const query: Record<string, unknown> = {
        listingId,
        ...(buildSouqOrgFilter(orgId) as Record<string, unknown>),
      };

      const listing = await SouqListing.findOne(query);

      if (!listing) {
        return false;
      }

      const inventory = await SouqInventory.findOne({
        listingId,
        ...(buildSouqOrgFilter(orgId) as Record<string, unknown>),
      });

      if (!inventory) {
        return false;
      }

      // Fast Badge criteria:
      // 1. FBF fulfillment OR seller has 95%+ on-time delivery rate
      // 2. In stock with at least 5 units
      // 3. Located in major city for same-day delivery

      let qualifies = false;

      if (inventory.fulfillmentType === "FBF") {
        qualifies = inventory.availableQuantity >= 5;
      } else {
        // Check seller's delivery performance (mock for now)
        const sellerOnTimeRate = 0.96; // Would query from seller metrics
        qualifies =
          sellerOnTimeRate >= 0.95 && inventory.availableQuantity >= 5;
      }

      listing.badges = listing.badges || [];

      if (listing.badges.includes("fast") !== qualifies) {
        if (qualifies) {
          listing.badges.push("fast");
        } else {
          listing.badges = listing.badges.filter((b) => b !== "fast");
        }
        await listing.save();
      }

      return qualifies;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to assign fast badge", error, { listingId });
      return false;
    }
  }

  /**
   * Get shipping rates from all carriers
   */
  async getRates(params: IRateParams): Promise<IRate[]> {
    const rates: IRate[] = [];

    for (const [name, carrier] of this.carriers.entries()) {
      try {
        const carrierRates = await carrier.getRates(params);
        rates.push(...carrierRates);
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.warn("Failed to get rates from carrier", {
          carrier: name,
          error,
        });
      }
    }

    // Sort by cost
    return rates.sort((a, b) => a.cost - b.cost);
  }

  /**
   * Select best carrier based on service type and cost
   */
  private selectCarrier(
    serviceType: "standard" | "express" | "same_day",
  ): ICarrierInterface {
    // Default carrier selection logic
    if (serviceType === "same_day") {
      return this.carriers.get("aramex")!; // Aramex for same-day
    } else if (serviceType === "express") {
      return this.carriers.get("smsa")!; // SMSA for express
    }
    return this.carriers.get("spl")!; // SPL for standard
  }

  /**
   * Calculate handling deadline based on order date and shipping speed
   */
  private calculateHandlingDeadline(
    orderDate: Date,
    shippingSpeed: string,
  ): Date {
    const deadline = new Date(orderDate);
    const handlingDays =
      shippingSpeed === "express" ? 1 : shippingSpeed === "same_day" ? 0 : 2;
    deadline.setDate(deadline.getDate() + handlingDays);
    return deadline;
  }
}

export const fulfillmentService = new FulfillmentService();
