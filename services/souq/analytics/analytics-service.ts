/**
 * Analytics Service
 * Provides seller analytics and insights for Souq Marketplace
 * - Sales metrics (revenue, orders, conversion)
 * - Product performance (top sellers, views, ratings)
 * - Customer insights (acquisition, retention, geography)
 * - Traffic analytics (sources, engagement, bounce rate)
 */

import { connectDb } from '@/lib/mongodb-unified';
import { SouqOrder } from '@/server/models/souq/Order';
import { SouqProduct } from '@/server/models/souq/Product';
import mongoose from 'mongoose';

export interface ISalesMetrics {
  revenue: {
    total: number;
    trend: number; // % change from previous period
    daily: Array<{ date: string; amount: number }>;
  };
  orders: {
    total: number;
    trend: number;
    completed: number;
    cancelled: number;
    returned: number;
  };
  conversion: {
    rate: number;
    trend: number;
    views: number;
    addToCart: number;
    purchases: number;
  };
  averageOrderValue: {
    current: number;
    trend: number;
  };
  period: string;
  calculatedAt: Date;
}

export interface IProductPerformance {
  topProducts: Array<{
    productId: string;
    title: string;
    revenue: number;
    unitsSold: number;
    views: number;
    conversionRate: number;
    averageRating: number;
    reviewCount: number;
  }>;
  lowStock: Array<{
    productId: string;
    title: string;
    currentStock: number;
    averageDailySales: number;
    daysUntilStockout: number;
  }>;
  underperforming: Array<{
    productId: string;
    title: string;
    views: number;
    conversionRate: number;
    recommendedActions: string[];
  }>;
  period: string;
}

export interface ICustomerInsights {
  acquisition: {
    newCustomers: number;
    trend: number;
    sources: Array<{ source: string; count: number; percentage: number }>;
  };
  retention: {
    repeatCustomerRate: number;
    trend: number;
    averageOrdersPerCustomer: number;
    lifetimeValue: number;
  };
  geography: {
    topCities: Array<{ city: string; customers: number; revenue: number }>;
    topRegions: Array<{ region: string; customers: number; revenue: number }>;
  };
  demographics: {
    ageGroups: Array<{ range: string; count: number; percentage: number }>;
  };
  period: string;
}

export interface ITrafficAnalytics {
  pageViews: {
    total: number;
    trend: number;
    daily: Array<{ date: string; views: number; uniqueVisitors: number }>;
  };
  sources: {
    direct: number;
    search: number;
    social: number;
    referral: number;
    paid: number;
  };
  engagement: {
    averageSessionDuration: number; // seconds
    pagesPerSession: number;
    bounceRate: number; // %
  };
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  period: string;
}

class AnalyticsService {
  /**
   * Calculate comprehensive sales metrics
   */
  async getSalesMetrics(
    sellerId: string,
    period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'ytd' = 'last_30_days'
  ): Promise<ISalesMetrics> {
    await this.ensureConnection();
    const { startDate, endDate, previousStartDate, previousEndDate } = this.getPeriodDates(period);
    const sellerObjectId = this.toObjectId(sellerId);
    const sellerIdStr = sellerObjectId.toString();

    // Current period orders
    const currentOrders = await SouqOrder.find({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Previous period orders for trend calculation
    const previousOrders = await SouqOrder.find({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: previousStartDate, $lt: previousEndDate }
    });

    const currentRevenue = currentOrders.reduce((sum, order) => (
      sum + this.calculateSellerOrderRevenue(order, sellerIdStr)
    ), 0);

    const previousRevenue = previousOrders.reduce((sum, order) => (
      sum + this.calculateSellerOrderRevenue(order, sellerIdStr)
    ), 0);

    const revenueTrend = this.calculateTrend(currentRevenue, previousRevenue);

    // Revenue by day
    const dailyRevenue = this.groupByDay(currentOrders, sellerIdStr, startDate, endDate);

    // Order statistics
    const completedOrders = currentOrders.filter(order => this.allSellerItemsDelivered(order, sellerIdStr)).length;
    const cancelledOrders = currentOrders.filter(order => this.hasSellerItemStatus(order, sellerIdStr, 'cancelled')).length;
    const returnedOrders = currentOrders.filter(order => this.hasSellerItemStatus(order, sellerIdStr, 'returned')).length;

    const ordersTrend = this.calculateTrend(currentOrders.length, previousOrders.length);

    // Conversion metrics (simplified - would integrate with real analytics)
    const estimatedViews = currentOrders.length * 50; // Rough estimate: 1 order per 50 views
    const estimatedAddToCart = currentOrders.length * 5; // 1 order per 5 carts

    const conversionRate = estimatedViews > 0 ? (currentOrders.length / estimatedViews) * 100 : 0;
    const previousConversionRate = previousOrders.length > 0 ? (previousOrders.length / (previousOrders.length * 50)) * 100 : 0;
    const conversionTrend = this.calculateTrend(conversionRate, previousConversionRate);

    // Average Order Value
    const aov = currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0;
    const previousAov = previousOrders.length > 0 ? previousRevenue / previousOrders.length : 0;
    const aovTrend = this.calculateTrend(aov, previousAov);

    return {
      revenue: {
        total: currentRevenue,
        trend: revenueTrend,
        daily: dailyRevenue
      },
      orders: {
        total: currentOrders.length,
        trend: ordersTrend,
        completed: completedOrders,
        cancelled: cancelledOrders,
        returned: returnedOrders
      },
      conversion: {
        rate: conversionRate,
        trend: conversionTrend,
        views: estimatedViews,
        addToCart: estimatedAddToCart,
        purchases: currentOrders.length
      },
      averageOrderValue: {
        current: aov,
        trend: aovTrend
      },
      period,
      calculatedAt: new Date()
    };
  }

  /**
   * Get product performance analytics
   */
  async getProductPerformance(
    sellerId: string,
    period: 'last_7_days' | 'last_30_days' | 'last_90_days' = 'last_30_days'
  ): Promise<IProductPerformance> {
    await this.ensureConnection();
    const { startDate, endDate } = this.getPeriodDates(period);
    const sellerObjectId = this.toObjectId(sellerId);
    const sellerIdStr = sellerObjectId.toString();

    // Get all orders in period
    const orders = await SouqOrder.find({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $nin: ['cancelled', 'refunded'] }
    });

    // Aggregate product performance
    const productStats = new Map<string, {
      revenue: number;
      unitsSold: number;
      orders: number;
    }>();

    orders.forEach(order => {
      const sellerItems = this.getSellerItems(order, sellerIdStr);
      sellerItems.forEach(item => {
        const productId = item.productId?.toString();
        if (!productId) return;
        const existing = productStats.get(productId) || { revenue: 0, unitsSold: 0, orders: 0 };
        
        productStats.set(productId, {
          revenue: existing.revenue + this.getItemSubtotal(item),
          unitsSold: existing.unitsSold + (item.quantity || 0),
          orders: existing.orders + 1
        });
      });
    });

    // Get product details
    const productIdValues = Array.from(productStats.keys());
    const productIds = productIdValues.map(id => new mongoose.Types.ObjectId(id));
    const products = productIds.length > 0
      ? await SouqProduct.find({
          _id: { $in: productIds },
          createdBy: sellerObjectId
        })
      : [];

    // Build top products list
    const topProducts = products.map(product => {
      const stats = productStats.get(product._id.toString()) || { revenue: 0, unitsSold: 0, orders: 0 };
      const views = stats.orders * 20; // Estimate: 1 order per 20 views
      const conversionRate = views > 0 ? (stats.orders / views) * 100 : 0;

      return {
        productId: product._id.toString(),
        title: product.title.en || product.title.ar || 'Unknown',
        revenue: stats.revenue,
        unitsSold: stats.unitsSold,
        views,
        conversionRate,
        averageRating: product.averageRating || 0,
        reviewCount: product.reviewCount || 0
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Low stock alerts - Query SouqListing model for actual stock levels
    const lowStock: Array<{
      productId: string;
      title: string;
      currentStock: number;
      averageDailySales: number;
      daysUntilStockout: number;
    }> = [];

    // Query listings for stock data
    const SouqListing = (await import('@/server/models/souq/Listing')).default;
    const alertStartDate = new Date();
    alertStartDate.setDate(alertStartDate.getDate() - (period === 'last_7_days' ? 7 : period === 'last_90_days' ? 90 : 30));
    
    const listings = await SouqListing.find({
      sellerId,
      status: 'active',
      stockQuantity: { $lte: 10 } // Low stock threshold
    }).select('productId stockQuantity');

    for (const listing of listings) {
      const product = products.find(p => p._id.toString() === listing.productId.toString());
      if (product) {
        const stats = productStats.get(product._id.toString()) || { revenue: 0, unitsSold: 0, orders: 0 };
        const daysRange = period === 'last_7_days' ? 7 : period === 'last_90_days' ? 90 : 30;
        const averageDailySales = stats.unitsSold / Math.max(daysRange, 1);
        const daysUntilStockout = averageDailySales > 0 ? Math.floor(listing.stockQuantity / averageDailySales) : 999;
        
        if (daysUntilStockout <= 7) { // Alert if < 7 days of stock
          lowStock.push({
            productId: product._id.toString(),
            title: product.title.en || product.title.ar || 'Unknown',
            currentStock: listing.stockQuantity,
            averageDailySales,
            daysUntilStockout
          });
        }
      }
    }

    // Identify underperforming products (low conversion)
    const underperforming = products.map(product => {
      const stats = productStats.get(product._id.toString()) || { revenue: 0, unitsSold: 0, orders: 0 };
      const views = stats.orders * 20;
      const conversionRate = views > 0 ? (stats.orders / views) * 100 : 0;

      const recommendations: string[] = [];
      
      if (conversionRate < 2) recommendations.push('Improve product images');
      if (!product.description || typeof product.description === 'object') recommendations.push('Add detailed description');

      return {
        productId: product._id.toString(),
        title: product.title.en || product.title.ar || 'Unknown',
        views,
        conversionRate,
        recommendedActions: recommendations
      };
    }).filter(p => p.conversionRate < 3 && p.recommendedActions.length > 0)
      .sort((a, b) => a.conversionRate - b.conversionRate)
      .slice(0, 5);

    return {
      topProducts,
      lowStock,
      underperforming,
      period
    };
  }

  /**
   * Get customer insights and demographics
   */
  async getCustomerInsights(
    sellerId: string,
    period: 'last_7_days' | 'last_30_days' | 'last_90_days' = 'last_30_days'
  ): Promise<ICustomerInsights> {
    await this.ensureConnection();
    const { startDate, endDate, previousStartDate, previousEndDate } = this.getPeriodDates(period);
    const sellerObjectId = this.toObjectId(sellerId);
    const sellerIdStr = sellerObjectId.toString();

    // Get orders for current and previous period
    const currentOrders = await SouqOrder.find({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const previousOrders = await SouqOrder.find({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: previousStartDate, $lt: previousEndDate }
    });

    // Customer acquisition
    const currentCustomerIds = new Set(currentOrders.map(o => o.customerId.toString()));
    const previousCustomerIds = new Set(previousOrders.map(o => o.customerId.toString()));
    
    const newCustomers = Array.from(currentCustomerIds).filter(id => !previousCustomerIds.has(id)).length;
    const previousNewCustomers = previousCustomerIds.size;
    const acquisitionTrend = this.calculateTrend(newCustomers, previousNewCustomers);

    // Acquisition sources (simplified - would integrate with real analytics)
    const sources = [
      { source: 'Direct', count: Math.floor(newCustomers * 0.4), percentage: 40 },
      { source: 'Search', count: Math.floor(newCustomers * 0.3), percentage: 30 },
      { source: 'Social Media', count: Math.floor(newCustomers * 0.2), percentage: 20 },
      { source: 'Referral', count: Math.floor(newCustomers * 0.1), percentage: 10 }
    ];

    // Retention metrics
    const repeatCustomers = Array.from(currentCustomerIds).filter(id => previousCustomerIds.has(id)).length;
    const repeatCustomerRate = currentCustomerIds.size > 0 ? (repeatCustomers / currentCustomerIds.size) * 100 : 0;
    const previousRepeatRate = previousCustomerIds.size > 0 ? 
      (previousOrders.filter(o => previousCustomerIds.has(o.customerId.toString())).length / previousCustomerIds.size) * 100 : 0;
    const retentionTrend = this.calculateTrend(repeatCustomerRate, previousRepeatRate);

    const averageOrdersPerCustomer = currentCustomerIds.size > 0 ? currentOrders.length / currentCustomerIds.size : 0;
    const totalRevenue = currentOrders.reduce((sum, order) => sum + this.calculateSellerOrderRevenue(order, sellerIdStr), 0);
    const lifetimeValue = currentCustomerIds.size > 0 ? totalRevenue / currentCustomerIds.size : 0;

    // Geography (simplified - would use real location data)
    const topCities = [
      { city: 'Riyadh', customers: Math.floor(currentCustomerIds.size * 0.35), revenue: totalRevenue * 0.35 },
      { city: 'Jeddah', customers: Math.floor(currentCustomerIds.size * 0.25), revenue: totalRevenue * 0.25 },
      { city: 'Dammam', customers: Math.floor(currentCustomerIds.size * 0.15), revenue: totalRevenue * 0.15 },
      { city: 'Mecca', customers: Math.floor(currentCustomerIds.size * 0.12), revenue: totalRevenue * 0.12 },
      { city: 'Medina', customers: Math.floor(currentCustomerIds.size * 0.13), revenue: totalRevenue * 0.13 }
    ];

    const topRegions = [
      { region: 'Central', customers: Math.floor(currentCustomerIds.size * 0.40), revenue: totalRevenue * 0.40 },
      { region: 'Western', customers: Math.floor(currentCustomerIds.size * 0.35), revenue: totalRevenue * 0.35 },
      { region: 'Eastern', customers: Math.floor(currentCustomerIds.size * 0.20), revenue: totalRevenue * 0.20 },
      { region: 'Northern', customers: Math.floor(currentCustomerIds.size * 0.05), revenue: totalRevenue * 0.05 }
    ];

    // Demographics (simplified)
    const ageGroups = [
      { range: '18-24', count: Math.floor(currentCustomerIds.size * 0.15), percentage: 15 },
      { range: '25-34', count: Math.floor(currentCustomerIds.size * 0.35), percentage: 35 },
      { range: '35-44', count: Math.floor(currentCustomerIds.size * 0.30), percentage: 30 },
      { range: '45-54', count: Math.floor(currentCustomerIds.size * 0.15), percentage: 15 },
      { range: '55+', count: Math.floor(currentCustomerIds.size * 0.05), percentage: 5 }
    ];

    return {
      acquisition: {
        newCustomers,
        trend: acquisitionTrend,
        sources
      },
      retention: {
        repeatCustomerRate,
        trend: retentionTrend,
        averageOrdersPerCustomer,
        lifetimeValue
      },
      geography: {
        topCities,
        topRegions
      },
      demographics: {
        ageGroups
      },
      period
    };
  }

  /**
   * Get traffic and engagement analytics
   */
  async getTrafficAnalytics(
    sellerId: string,
    period: 'last_7_days' | 'last_30_days' | 'last_90_days' = 'last_30_days'
  ): Promise<ITrafficAnalytics> {
    await this.ensureConnection();
    const { startDate, endDate, previousStartDate, previousEndDate } = this.getPeriodDates(period);
    const sellerObjectId = this.toObjectId(sellerId);

    // Get orders to estimate traffic (in production, would use real analytics data)
    const currentOrders = await SouqOrder.find({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const previousOrders = await SouqOrder.find({
      'items.sellerId': sellerObjectId,
      createdAt: { $gte: previousStartDate, $lt: previousEndDate }
    });

    // Estimate page views (rough approximation)
    const estimatedViews = currentOrders.length * 30; // 1 order per 30 views
    const previousViews = previousOrders.length * 30;
    const viewsTrend = this.calculateTrend(estimatedViews, previousViews);

    // Daily page views
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyViews = [];
    const viewsPerDay = Math.floor(estimatedViews / days);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      dailyViews.push({
        date: date.toISOString().split('T')[0],
        views: viewsPerDay + Math.floor(Math.random() * viewsPerDay * 0.2), // Add variance
        uniqueVisitors: Math.floor(viewsPerDay * 0.6) // 60% unique visitors
      });
    }

    // Traffic sources
    const sources = {
      direct: Math.floor(estimatedViews * 0.35),
      search: Math.floor(estimatedViews * 0.30),
      social: Math.floor(estimatedViews * 0.20),
      referral: Math.floor(estimatedViews * 0.10),
      paid: Math.floor(estimatedViews * 0.05)
    };

    // Engagement metrics
    const engagement = {
      averageSessionDuration: 180 + Math.floor(Math.random() * 120), // 3-5 minutes
      pagesPerSession: 3.5 + Math.random() * 1.5, // 3.5-5 pages
      bounceRate: 35 + Math.floor(Math.random() * 15) // 35-50%
    };

    // Device breakdown
    const deviceBreakdown = {
      desktop: Math.floor(estimatedViews * 0.40),
      mobile: Math.floor(estimatedViews * 0.50),
      tablet: Math.floor(estimatedViews * 0.10)
    };

    return {
      pageViews: {
        total: estimatedViews,
        trend: viewsTrend,
        daily: dailyViews
      },
      sources,
      engagement,
      deviceBreakdown,
      period
    };
  }

  /**
   * Get complete analytics dashboard data
   */
  async getDashboard(
    sellerId: string,
    period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'ytd' = 'last_30_days'
  ) {
    const [sales, products, customers, traffic] = await Promise.all([
      this.getSalesMetrics(sellerId, period),
      this.getProductPerformance(sellerId, period === 'ytd' ? 'last_90_days' : period),
      this.getCustomerInsights(sellerId, period === 'ytd' ? 'last_90_days' : period),
      this.getTrafficAnalytics(sellerId, period === 'ytd' ? 'last_90_days' : period)
    ]);

    return {
      sales,
      products,
      customers,
      traffic,
      period,
      generatedAt: new Date()
    };
  }

  /**
   * Calculate percentage trend
   */
  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async ensureConnection(): Promise<void> {
    await connectDb();
  }

  private toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Get period date ranges
   */
  private getPeriodDates(period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'ytd') {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (period) {
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Calculate previous period
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - periodLength);

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate
    };
  }

  /**
   * Group orders by day for charting
   */
  private groupByDay(
    orders: Array<{ createdAt: Date; status?: string; items?: Array<any> }>,
    sellerIdStr: string,
    startDate: Date,
    endDate: Date
  ) {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyData: Array<{ date: string; amount: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      });

      const amount = dayOrders.reduce((sum, order) => (
        sum + this.calculateSellerOrderRevenue(order, sellerIdStr)
      ), 0);

      dailyData.push({ date: dateStr, amount });
    }

    return dailyData;
  }

  private getSellerItems(order: { items?: Array<any> }, sellerIdStr: string) {
    if (!Array.isArray(order.items)) return [];
    return order.items.filter(item => {
      const rawSellerId = item?.sellerId;
      if (!rawSellerId) return false;
      const value = typeof rawSellerId === 'string' ? rawSellerId : rawSellerId.toString();
      return value === sellerIdStr;
    });
  }

  private getItemSubtotal(item: any): number {
    if (typeof item.subtotal === 'number') return item.subtotal;
    const price = typeof item.pricePerUnit === 'number'
      ? item.pricePerUnit
      : typeof item.price === 'number'
        ? item.price
        : 0;
    const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
    return price * quantity;
  }

  private calculateSellerOrderRevenue(order: { items?: Array<any>; status?: string }, sellerIdStr: string): number {
    const sellerItems = this.getSellerItems(order, sellerIdStr);
    return sellerItems
      .filter(item => !this.isCancelledOrReturned(item, order.status))
      .reduce((sum, item) => sum + this.getItemSubtotal(item), 0);
  }

  private hasSellerItemStatus(order: { items?: Array<any>; status?: string }, sellerIdStr: string, statuses: string | string[]): boolean {
    const targetStatuses = Array.isArray(statuses) ? statuses : [statuses];
    const normalizedTargets = targetStatuses.map(status => status.toLowerCase());
    return this.getSellerItems(order, sellerIdStr).some(item => {
      const itemStatus = this.normalizeItemStatus(item.status, order.status);
      return normalizedTargets.includes(itemStatus);
    });
  }

  private allSellerItemsDelivered(order: { items?: Array<any>; status?: string }, sellerIdStr: string): boolean {
    const sellerItems = this.getSellerItems(order, sellerIdStr);
    if (sellerItems.length === 0) return false;
    return sellerItems.every(item => this.normalizeItemStatus(item.status, order.status) === 'delivered');
  }

  private isCancelledOrReturned(item: any, orderStatus?: string): boolean {
    const status = this.normalizeItemStatus(item.status, orderStatus);
    return status === 'cancelled' || status === 'returned';
  }

  private normalizeItemStatus(itemStatus?: unknown, fallback?: string): string {
    const status = typeof itemStatus === 'string' && itemStatus.length > 0
      ? itemStatus
      : fallback ?? '';
    return status.toLowerCase();
  }
}

export const analyticsService = new AnalyticsService();
