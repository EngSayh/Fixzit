/**
 * Account Health Service
 * Monitors seller performance metrics and enforces policies
 * - Order Defect Rate (ODR)
 * - Late Shipment Rate
 * - Cancellation Rate
 * - Return Rate
 * - Policy Violations
 * - Auto-enforcement
 */

import { SouqSeller } from '@/server/models/souq/Seller';
import { SouqOrder } from '@/server/models/souq/Order';
import { SouqRMA } from '@/server/models/souq/RMA';
import { SouqListing } from '@/server/models/souq/Listing';
import { SouqReview } from '@/server/models/souq/Review';
import { SouqTransaction } from '@/server/models/souq/Transaction';
import { addJob, QUEUE_NAMES } from '@/lib/queues/setup';
import mongoose from 'mongoose';

export interface IAccountHealthMetrics {
  // Performance Metrics
  odr: number; // Order Defect Rate (%)
  lateShipmentRate: number; // Late Shipment Rate (%)
  cancellationRate: number; // Pre-fulfillment Cancellation Rate (%)
  returnRate: number; // Return Rate (%)
  
  // Volume Metrics
  totalOrders: number;
  totalDefects: number;
  totalLateShipments: number;
  totalCancellations: number;
  totalReturns: number;
  
  // Health Status
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  atRisk: boolean;
  warnings: string[];
  violations: string[];
  
  // Period
  period: 'last_7_days' | 'last_30_days' | 'last_90_days';
  calculatedAt: Date;
}

export interface IPolicyViolation {
  type: 'restricted_product' | 'fake_review' | 'price_gouging' | 'counterfeit' | 'late_shipment' | 'high_odr' | 'other';
  severity: 'warning' | 'minor' | 'major' | 'critical';
  description: string;
  occurredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  action: 'warning' | 'listing_suppression' | 'account_suspension' | 'permanent_deactivation' | 'none';
}

class AccountHealthService {
  /**
   * Calculate comprehensive account health metrics
   */
  async calculateAccountHealth(sellerId: string, period: 'last_7_days' | 'last_30_days' | 'last_90_days' = 'last_30_days'): Promise<IAccountHealthMetrics> {
    const periodDays = period === 'last_7_days' ? 7 : period === 'last_30_days' ? 30 : 90;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Get orders in period
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const orders = await SouqOrder.find({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate },
      status: { $nin: ['pending', 'payment_failed'] } // Exclude incomplete orders
    });

    const totalOrders = orders.length;

    if (totalOrders === 0) {
      return {
        odr: 0,
        lateShipmentRate: 0,
        cancellationRate: 0,
        returnRate: 0,
        totalOrders: 0,
        totalDefects: 0,
        totalLateShipments: 0,
        totalCancellations: 0,
        totalReturns: 0,
        healthStatus: 'good',
        atRisk: false,
        warnings: [],
        violations: [],
        period,
        calculatedAt: new Date()
      };
    }

    // Calculate metrics
    const odr = await this.calculateODR(sellerId, startDate);
    const lateShipmentRate = await this.calculateLateShipmentRate(sellerId, startDate);
    const cancellationRate = await this.calculateCancellationRate(sellerId, startDate);
    const returnRate = await this.calculateReturnRate(sellerId, startDate);

    // Counts
    const totalDefects = Math.floor((odr / 100) * totalOrders);
    const totalLateShipments = Math.floor((lateShipmentRate / 100) * totalOrders);
    const totalCancellations = Math.floor((cancellationRate / 100) * totalOrders);
    const totalReturns = Math.floor((returnRate / 100) * totalOrders);

    // Determine health status
    const { healthStatus, atRisk, warnings, violations } = this.assessHealthStatus({
      odr,
      lateShipmentRate,
      cancellationRate,
      returnRate
    });

    return {
      odr,
      lateShipmentRate,
      cancellationRate,
      returnRate,
      totalOrders,
      totalDefects,
      totalLateShipments,
      totalCancellations,
      totalReturns,
      healthStatus,
      atRisk,
      warnings,
      violations,
      period,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate Order Defect Rate (ODR)
   * ODR = (Negative Feedback + A-to-Z Claims + Chargebacks) / Total Orders
   * Target: < 1%
   */
  private async calculateODR(sellerId: string, startDate: Date): Promise<number> {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const totalOrders = await SouqOrder.countDocuments({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate },
      status: { $nin: ['pending', 'payment_failed'] }
    });

    if (totalOrders === 0) return 0;

    // Count negative feedback (1-2 stars)
    const sellerProductIds = (await SouqListing.distinct('productId', {
      sellerId: sellerObjectId
    })) as mongoose.Types.ObjectId[];

    const negativeFeedback = sellerProductIds.length === 0
      ? 0
      : await SouqReview.countDocuments({
        productId: { $in: sellerProductIds },
        createdAt: { $gte: startDate },
        rating: { $lte: 2 }
      });

    // Count A-to-Z claims approved against seller
    const { SouqClaim } = await import('@/server/models/souq/Claim');
    const approvedClaims = await SouqClaim.countDocuments({
      sellerId,
      createdAt: { $gte: startDate },
      status: 'resolved',
      'decision.outcome': { $in: ['approved', 'partial_refund'] }
    });

    // Count chargebacks (if tracked in orders)
    const chargebacks = await SouqTransaction.countDocuments({
      sellerId: sellerObjectId,
      type: 'chargeback',
      createdAt: { $gte: startDate }
    });

    const totalDefects = negativeFeedback + approvedClaims + chargebacks;
    const odr = (totalDefects / totalOrders) * 100;

    return Math.round(odr * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate Late Shipment Rate
   * LSR = Late Shipments / Total Shipped Orders
   * Target: < 4%
   */
  private async calculateLateShipmentRate(sellerId: string, startDate: Date): Promise<number> {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const shippedOrders = await SouqOrder.find({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate },
      status: { $in: ['shipped', 'delivered'] }
    });

    if (shippedOrders.length === 0) return 0;

    let lateShipments = 0;
    for (const order of shippedOrders) {
      const handlingWindow =
        order.shippingSpeed === 'express'
          ? 1
          : order.shippingSpeed === 'same_day'
            ? 0
            : 2;
      const shipByDate = new Date(order.createdAt);
      shipByDate.setDate(shipByDate.getDate() + handlingWindow);

      const latestShipment = order.items
        .map(item => item.shippedAt)
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      if (latestShipment && latestShipment > shipByDate) {
        lateShipments++;
      }
    }

    const lsr = (lateShipments / shippedOrders.length) * 100;
    return Math.round(lsr * 100) / 100;
  }

  /**
   * Calculate Pre-fulfillment Cancellation Rate
   * CR = Cancelled Orders / Total Orders
   * Target: < 2.5%
   */
  private async calculateCancellationRate(sellerId: string, startDate: Date): Promise<number> {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const totalOrders = await SouqOrder.countDocuments({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate },
      status: { $nin: ['pending', 'payment_failed'] }
    });

    if (totalOrders === 0) return 0;

    const cancelledOrders = await SouqOrder.countDocuments({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate },
      status: 'cancelled'
    });

    const cr = (cancelledOrders / totalOrders) * 100;
    return Math.round(cr * 100) / 100;
  }

  /**
   * Calculate Return Rate
   * RR = Returns / Delivered Orders
   * Target: < 10%
   */
  private async calculateReturnRate(sellerId: string, startDate: Date): Promise<number> {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const deliveredOrders = await SouqOrder.countDocuments({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate },
      status: 'delivered'
    });

    if (deliveredOrders === 0) return 0;

    const returns = await SouqRMA.countDocuments({
      sellerId,
      createdAt: { $gte: startDate }
    });

    const rr = (returns / deliveredOrders) * 100;
    return Math.round(rr * 100) / 100;
  }

  /**
   * Assess health status based on metrics
   */
  private assessHealthStatus(metrics: {
    odr: number;
    lateShipmentRate: number;
    cancellationRate: number;
    returnRate: number;
  }): {
    healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    atRisk: boolean;
    warnings: string[];
    violations: string[];
  } {
    const warnings: string[] = [];
    const violations: string[] = [];
    let healthScore = 100;

    // ODR thresholds
    if (metrics.odr > 2) {
      violations.push('ODR exceeds 2% - Account suspension risk');
      healthScore -= 40;
    } else if (metrics.odr > 1) {
      warnings.push('ODR exceeds 1% - Target is <1%');
      healthScore -= 15;
    }

    // Late Shipment thresholds
    if (metrics.lateShipmentRate > 10) {
      violations.push('Late Shipment Rate exceeds 10% - Serious issue');
      healthScore -= 30;
    } else if (metrics.lateShipmentRate > 4) {
      warnings.push('Late Shipment Rate exceeds 4% - Target is <4%');
      healthScore -= 10;
    }

    // Cancellation thresholds
    if (metrics.cancellationRate > 5) {
      violations.push('Cancellation Rate exceeds 5% - Account review');
      healthScore -= 25;
    } else if (metrics.cancellationRate > 2.5) {
      warnings.push('Cancellation Rate exceeds 2.5% - Target is <2.5%');
      healthScore -= 10;
    }

    // Return thresholds
    if (metrics.returnRate > 15) {
      warnings.push('Return Rate exceeds 15% - High return rate');
      healthScore -= 15;
    } else if (metrics.returnRate > 10) {
      warnings.push('Return Rate above 10% - Monitor closely');
      healthScore -= 5;
    }

    // Determine status
    let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (healthScore >= 90) healthStatus = 'excellent';
    else if (healthScore >= 75) healthStatus = 'good';
    else if (healthScore >= 60) healthStatus = 'fair';
    else if (healthScore >= 40) healthStatus = 'poor';
    else healthStatus = 'critical';

    const atRisk = violations.length > 0 || healthStatus === 'critical';

    return { healthStatus, atRisk, warnings, violations };
  }

  /**
   * Record policy violation
   */
  async recordViolation(sellerId: string, violation: Omit<IPolicyViolation, 'occurredAt' | 'resolved'>): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    const newViolation: IPolicyViolation = {
      ...violation,
      occurredAt: new Date(),
      resolved: false
    };

    if (!seller.policyViolations) {
      seller.policyViolations = [];
    }

    seller.policyViolations.push(newViolation);
    await seller.save();

    // Auto-enforce if critical
    if (violation.severity === 'critical') {
      await this.enforceViolation(sellerId, violation);
    }

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      to: seller.contactEmail,
      template: 'policy_violation',
      data: {
        businessName: seller.tradeName || seller.legalName,
        violationType: violation.type,
        severity: violation.severity,
        description: violation.description,
        action: violation.action
      }
    });
  }

  /**
   * Enforce violation action
   */
  private async enforceViolation(sellerId: string, violation: Omit<IPolicyViolation, 'occurredAt' | 'resolved'>): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) return;

    switch (violation.action) {
      case 'listing_suppression': {
        // Suppress all active listings
        const { SouqListing } = await import('@/server/models/souq/Listing');
        await SouqListing.updateMany(
          { sellerId: new mongoose.Types.ObjectId(sellerId), status: 'active' },
          { $set: { status: 'suppressed', suppressionReason: violation.description } }
        );
        break;
      }

      case 'account_suspension':
        // Suspend seller account
        seller.isSuspended = true;
        seller.isActive = false;
        seller.suspensionReason = violation.description;
        await seller.save();
        break;

      case 'permanent_deactivation':
        // Permanently deactivate
        seller.isSuspended = true;
        seller.isActive = false;
        await seller.save();
        break;

      default:
        // Warning only
        break;
    }

    // Notify admin team
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'internal-notification', {
      to: 'seller-compliance-team',
      priority: 'high',
      message: `Policy enforcement: ${violation.action} for ${(seller.tradeName || seller.legalName)} (${sellerId})`
    }, { priority: 1 });
  }

  /**
   * Get account health summary for dashboard
   */
  async getHealthSummary(sellerId: string, period: 'last_7_days' | 'last_30_days' | 'last_90_days' = 'last_30_days'): Promise<{
    current: IAccountHealthMetrics;
    trend: 'improving' | 'stable' | 'declining';
    recentViolations: IPolicyViolation[];
    recommendations: string[];
  }> {
    // Current metrics for specified period
    const current = await this.calculateAccountHealth(sellerId, period);

    // Simplified trend calculation
    const trend = await this.calculateTrend(sellerId, current.odr);

    // Recent violations
    const seller = await SouqSeller.findById(sellerId);
    const recentViolations = seller?.policyViolations
      ?.filter(v => !v.resolved)
      ?.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      ?.slice(0, 5) || [];

    // Generate recommendations
    const recommendations = this.generateRecommendations(current);

    return {
      current,
      trend,
      recentViolations,
      recommendations
    };
  }

  /**
   * Calculate trend (improving/stable/declining)
   */
  private async calculateTrend(sellerId: string, currentODR: number): Promise<'improving' | 'stable' | 'declining'> {
    // Compare with 60-day period
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const previousODR = await this.calculateODR(sellerId, sixtyDaysAgo);

    if (currentODR < previousODR - 0.2) return 'improving';
    if (currentODR > previousODR + 0.2) return 'declining';
    return 'stable';
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(metrics: IAccountHealthMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.odr > 1) {
      recommendations.push('Improve product quality and descriptions to reduce defects');
      recommendations.push('Respond quickly to customer inquiries to prevent A-to-Z claims');
    }

    if (metrics.lateShipmentRate > 4) {
      recommendations.push('Ship orders within 24 hours of confirmation');
      recommendations.push('Consider using FBF (Fulfillment by Fixzit) for faster shipping');
    }

    if (metrics.cancellationRate > 2.5) {
      recommendations.push('Maintain accurate inventory levels to prevent out-of-stock cancellations');
      recommendations.push('Set realistic handling times');
    }

    if (metrics.returnRate > 10) {
      recommendations.push('Ensure product photos and descriptions are accurate');
      recommendations.push('Use high-quality packaging to prevent damage during shipping');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great job! Keep maintaining your excellent performance');
    }

    return recommendations;
  }

  /**
   * Background job: Monitor and enforce account health
   * Runs daily to check all active sellers
   */
  async monitorAllSellers(): Promise<{
    checked: number;
    atRisk: number;
    actionsTaken: number;
  }> {
    const activeSellers = await SouqSeller.find({ isActive: true });

    let checked = 0;
    let atRisk = 0;
    let actionsTaken = 0;

    for (const seller of activeSellers) {
      const health = await this.calculateAccountHealth(seller._id.toString(), 'last_30_days');
      
      checked++;

      if (health.atRisk) {
        atRisk++;

        // Auto-suspend if ODR > 2%
        if (health.odr > 2) {
          await this.recordViolation(seller._id.toString(), {
            type: 'high_odr',
            severity: 'critical',
            description: `ODR ${health.odr}% exceeds maximum threshold of 2%`,
            action: 'account_suspension'
          });
          actionsTaken++;
        }
        // Warn if approaching threshold
        else if (health.odr > 1.5) {
          await this.recordViolation(seller._id.toString(), {
            type: 'high_odr',
            severity: 'major',
            description: `ODR ${health.odr}% approaching suspension threshold`,
            action: 'warning'
          });
          actionsTaken++;
        }
      }
    }

    return { checked, atRisk, actionsTaken };
  }
}

export const accountHealthService = new AccountHealthService();
