/**
 * Health Summary API Period Filter Regression Test
 * 
 * This test verifies that the period query parameter correctly filters
 * health metrics by date range.
 * 
 * Bug Context:
 * - Previously, the API ignored the period parameter completely
 * - UI period selector (7/30/90 days) was non-functional
 * - All requests returned the same data regardless of period
 * 
 * Test Coverage:
 * - Verifies 7-day period returns only recent data
 * - Verifies 30-day period includes medium-term data
 * - Verifies 90-day period includes long-term data
 * - Verifies default period is 30 days when not specified
 * - Verifies different periods produce different metric counts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { SouqOrder } from '@/server/models/souq/Order';
import { SouqSeller } from '@/server/models/souq/Seller';
import mongoose from 'mongoose';

describe('GET /api/souq/seller-central/health/summary - Period Filter', () => {
  let testSellerId: string;
  let orderIds: string[] = [];

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/fixzit_test');
    }

    // Create test seller
    const seller = await SouqSeller.create({
      sellerId: `TEST_SELLER_${Date.now()}`,
      userId: new mongoose.Types.ObjectId(),
      businessInfo: {
        businessName: 'Test Business',
        businessType: 'individual',
        crNumber: '1234567890'
      },
      status: 'active'
    });
    testSellerId = seller._id.toString();

    // Create orders at different dates to test period filtering
    const now = Date.now();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now - 15 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

    // Order 1: 3 days ago (should appear in all periods)
    const order1 = await SouqOrder.create({
      orderId: `TEST_ORD_${Date.now()}_1`,
      buyerId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(testSellerId),
      items: [{
        productId: new mongoose.Types.ObjectId(),
        variantId: new mongoose.Types.ObjectId(),
        quantity: 1,
        price: 100,
        sellerId: new mongoose.Types.ObjectId(testSellerId)
      }],
      totals: {
        subtotal: 100,
        shipping: 10,
        tax: 15,
        total: 125
      },
      status: 'delivered',
      createdAt: threeDaysAgo,
      shippedAt: threeDaysAgo,
      deliveredAt: threeDaysAgo
    });
    orderIds.push(order1._id.toString());

    // Order 2: 15 days ago (should appear in 30-day and 90-day periods)
    const order2 = await SouqOrder.create({
      orderId: `TEST_ORD_${Date.now()}_2`,
      buyerId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(testSellerId),
      items: [{
        productId: new mongoose.Types.ObjectId(),
        variantId: new mongoose.Types.ObjectId(),
        quantity: 2,
        price: 50,
        sellerId: new mongoose.Types.ObjectId(testSellerId)
      }],
      totals: {
        subtotal: 100,
        shipping: 10,
        tax: 15,
        total: 125
      },
      status: 'delivered',
      createdAt: fifteenDaysAgo,
      shippedAt: fifteenDaysAgo,
      deliveredAt: fifteenDaysAgo
    });
    orderIds.push(order2._id.toString());

    // Order 3: 60 days ago (should appear only in 90-day period)
    const order3 = await SouqOrder.create({
      orderId: `TEST_ORD_${Date.now()}_3`,
      buyerId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(testSellerId),
      items: [{
        productId: new mongoose.Types.ObjectId(),
        variantId: new mongoose.Types.ObjectId(),
        quantity: 1,
        price: 200,
        sellerId: new mongoose.Types.ObjectId(testSellerId)
      }],
      totals: {
        subtotal: 200,
        shipping: 20,
        tax: 30,
        total: 250
      },
      status: 'delivered',
      createdAt: sixtyDaysAgo,
      shippedAt: sixtyDaysAgo,
      deliveredAt: sixtyDaysAgo
    });
    orderIds.push(order3._id.toString());
  });

  afterAll(async () => {
    // Clean up test data
    await SouqOrder.deleteMany({ _id: { $in: orderIds.map(id => new mongoose.Types.ObjectId(id)) } });
    await SouqSeller.findByIdAndDelete(testSellerId);
    await mongoose.connection.close();
  });

  it('should filter metrics by last_7_days period', async () => {
    const response = await fetch(
      `http://localhost:3000/api/souq/seller-central/health/summary?period=last_7_days`,
      {
        headers: {
          // Mock auth session - in real test would use proper auth
          'x-test-user-id': testSellerId
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    // Should only include the 3-day-old order
    expect(data.current).toBeDefined();
    expect(data.current.totalOrders).toBe(1);
    expect(data.current.period).toBe('last_7_days');
  });

  it('should filter metrics by last_30_days period', async () => {
    const response = await fetch(
      `http://localhost:3000/api/souq/seller-central/health/summary?period=last_30_days`,
      {
        headers: {
          'x-test-user-id': testSellerId
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    // Should include both 3-day and 15-day-old orders
    expect(data.current).toBeDefined();
    expect(data.current.totalOrders).toBe(2);
    expect(data.current.period).toBe('last_30_days');
  });

  it('should filter metrics by last_90_days period', async () => {
    const response = await fetch(
      `http://localhost:3000/api/souq/seller-central/health/summary?period=last_90_days`,
      {
        headers: {
          'x-test-user-id': testSellerId
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    // Should include all 3 orders (3-day, 15-day, and 60-day-old)
    expect(data.current).toBeDefined();
    expect(data.current.totalOrders).toBe(3);
    expect(data.current.period).toBe('last_90_days');
  });

  it('should default to last_30_days when period not specified', async () => {
    const response = await fetch(
      `http://localhost:3000/api/souq/seller-central/health/summary`,
      {
        headers: {
          'x-test-user-id': testSellerId
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    // Should default to 30-day period (2 orders)
    expect(data.current).toBeDefined();
    expect(data.current.totalOrders).toBe(2);
    expect(data.current.period).toBe('last_30_days');
  });

  it('should produce different metrics for different periods', async () => {
    // Fetch all 3 periods in parallel
    const [response7, response30, response90] = await Promise.all([
      fetch(`http://localhost:3000/api/souq/seller-central/health/summary?period=last_7_days`, {
        headers: { 'x-test-user-id': testSellerId }
      }),
      fetch(`http://localhost:3000/api/souq/seller-central/health/summary?period=last_30_days`, {
        headers: { 'x-test-user-id': testSellerId }
      }),
      fetch(`http://localhost:3000/api/souq/seller-central/health/summary?period=last_90_days`, {
        headers: { 'x-test-user-id': testSellerId }
      })
    ]);

    const [data7, data30, data90] = await Promise.all([
      response7.json(),
      response30.json(),
      response90.json()
    ]);

    // Verify progressive inclusion of orders
    expect(data7.current.totalOrders).toBe(1);
    expect(data30.current.totalOrders).toBe(2);
    expect(data90.current.totalOrders).toBe(3);

    // Verify each has correct period label
    expect(data7.current.period).toBe('last_7_days');
    expect(data30.current.period).toBe('last_30_days');
    expect(data90.current.period).toBe('last_90_days');

    // Verify all responses have required structure
    [data7, data30, data90].forEach(data => {
      expect(data.current).toBeDefined();
      expect(data.trend).toBeDefined();
      expect(data.recentViolations).toBeDefined();
      expect(data.recommendations).toBeDefined();
    });
  });

  it('should return proper response structure without success wrapper', async () => {
    const response = await fetch(
      `http://localhost:3000/api/souq/seller-central/health/summary?period=last_30_days`,
      {
        headers: {
          'x-test-user-id': testSellerId
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    // Verify response structure matches what client expects
    // API wraps with {success: true, ...summary} but client destructures
    expect(data.success).toBe(true);
    expect(data.current).toBeDefined();
    expect(data.trend).toBeDefined();
    expect(data.recentViolations).toBeInstanceOf(Array);
    expect(data.recommendations).toBeInstanceOf(Array);
  });
});
