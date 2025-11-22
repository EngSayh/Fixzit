/**
 * Souq Test Data Seeding Script
 * Seeds test data for EPICs G (Analytics) and H (Reviews & Ratings)
 * 
 * Usage:
 *   pnpm tsx scripts/seed/souq-test-data.ts
 * 
 * This script creates:
 * - Test products (10)
 * - Test customers (20)
 * - Test orders (50) with various statuses
 * - Test reviews (100) with different ratings
 * - Historical sales data for analytics
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { connectDb } from '@/lib/mongodb-unified';
import { SouqProduct } from '@/server/models/souq/Product';
import { SouqOrder } from '@/server/models/souq/Order';
import { SouqReview } from '@/server/models/souq/Review';
import { nanoid } from 'nanoid';

type SeedProduct = {
  fsin?: string;
  productId?: string;
  name?: string;
  price?: number;
  [key: string]: unknown;
};

type SeedOrderItem = {
  fsin?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  price?: number;
  subtotal?: number;
};

type SeedOrder = {
  status?: string;
  items: SeedOrderItem[];
  customerId?: string;
  customerName?: string;
  orderId?: string;
  statusHistory?: Array<{ status: string; updatedAt: Date; updatedBy: string }>;
  channel?: string;
  total?: number;
  [key: string]: unknown;
};

// Test organization ID (replace with your actual test org ID)
const TEST_ORG_ID = 'org-test-001';
const TEST_SELLER_ID = '6740b53c5b1a08c748eec97f'; // Valid MongoDB ObjectId format

// Sample product data matching the Product schema
const PRODUCT_TEMPLATES = [
  {
    title: { en: 'Premium Office Chair', ar: 'كرسي مكتب فاخر' },
    description: { en: 'Ergonomic office chair with lumbar support', ar: 'كرسي مكتب مريح مع دعم قطني' },
    categoryId: 'CAT-FURNITURE-001',
    basePrice: 299.99,
    images: ['https://placehold.co/600x400/png?text=Office+Chair'],
  },
  {
    title: { en: 'Wireless Keyboard', ar: 'لوحة مفاتيح لاسلكية' },
    description: { en: 'Mechanical wireless keyboard with RGB lighting', ar: 'لوحة مفاتيح ميكانيكية لاسلكية مع إضاءة RGB' },
    categoryId: 'CAT-ELECTRONICS-001',
    basePrice: 79.99,
    images: ['https://placehold.co/600x400/png?text=Keyboard'],
  },
  {
    title: { en: 'Standing Desk', ar: 'مكتب واقف' },
    description: { en: 'Height-adjustable standing desk', ar: 'مكتب قابل لتعديل الارتفاع' },
    categoryId: 'CAT-FURNITURE-001',
    basePrice: 499.99,
    images: ['https://placehold.co/600x400/png?text=Standing+Desk'],
  },
  {
    title: { en: '4K Monitor', ar: 'شاشة 4K' },
    description: { en: '27-inch 4K IPS monitor', ar: 'شاشة 27 بوصة 4K IPS' },
    categoryId: 'CAT-ELECTRONICS-001',
    basePrice: 349.99,
    images: ['https://placehold.co/600x400/png?text=4K+Monitor'],
  },
  {
    title: { en: 'Desk Lamp', ar: 'مصباح مكتب' },
    description: { en: 'LED desk lamp with adjustable brightness', ar: 'مصباح LED مع سطوع قابل للتعديل' },
    categoryId: 'CAT-LIGHTING-001',
    basePrice: 39.99,
    images: ['https://placehold.co/600x400/png?text=Desk+Lamp'],
  },
  {
    title: { en: 'Laptop Stand', ar: 'حامل لابتوب' },
    description: { en: 'Aluminum laptop stand with cooling', ar: 'حامل لابتوب ألمنيوم مع تبريد' },
    categoryId: 'CAT-ACCESSORIES-001',
    basePrice: 49.99,
    images: ['https://placehold.co/600x400/png?text=Laptop+Stand'],
  },
  {
    title: { en: 'Webcam HD', ar: 'كاميرا ويب عالية الدقة' },
    description: { en: '1080p HD webcam with auto-focus', ar: 'كاميرا ويب 1080p مع تركيز تلقائي' },
    categoryId: 'CAT-ELECTRONICS-001',
    basePrice: 89.99,
    images: ['https://placehold.co/600x400/png?text=Webcam'],
  },
  {
    title: { en: 'Mouse Pad', ar: 'ماوس باد' },
    description: { en: 'Large gaming mouse pad', ar: 'ماوس باد كبير للألعاب' },
    categoryId: 'CAT-ACCESSORIES-001',
    basePrice: 19.99,
    images: ['https://placehold.co/600x400/png?text=Mouse+Pad'],
  },
  {
    title: { en: 'Headphone Stand', ar: 'حامل سماعات' },
    description: { en: 'RGB headphone stand with USB hub', ar: 'حامل سماعات RGB مع USB hub' },
    categoryId: 'CAT-ACCESSORIES-001',
    basePrice: 24.99,
    images: ['https://placehold.co/600x400/png?text=Headphone+Stand'],
  },
  {
    title: { en: 'Cable Management Box', ar: 'صندوق تنظيم الكابلات' },
    description: { en: 'Cable organizer box', ar: 'صندوق منظم للكابلات' },
    categoryId: 'CAT-ACCESSORIES-001',
    basePrice: 29.99,
    images: ['https://placehold.co/600x400/png?text=Cable+Box'],
  },
];

// Sample customer names
const CUSTOMER_NAMES = [
  'Ahmed Al-Rashid',
  'Fatima Hassan',
  'Mohammed Ali',
  'Sarah Abdullah',
  'Omar Khalid',
  'Noura Ibrahim',
  'Khalid Mansoor',
  'Layla Ahmed',
  'Youssef Fahad',
  'Maryam Sultan',
  'Abdullah Nasser',
  'Aisha Mohammed',
  'Hassan Ali',
  'Zainab Khalid',
  'Faisal Ahmed',
  'Huda Ibrahim',
  'Tariq Rashid',
  'Nadia Hassan',
  'Saeed Abdullah',
  'Reem Fahad',
];

// Review title templates
const REVIEW_TITLES = [
  'Excellent quality product!',
  'Great value for money',
  'Highly recommend this product',
  'Exceeded my expectations',
  'Good but could be better',
  'Not what I expected',
  'Perfect for my needs',
  'Amazing product',
  'Decent product overall',
  'Outstanding quality',
  'Worth every penny',
  'Very satisfied with purchase',
  'Could use some improvements',
  'Fantastic product!',
  'Good product, fast delivery',
];

// Review content templates (positive)
const POSITIVE_REVIEWS = [
  'This product has been amazing. The quality is top-notch and it works exactly as described. I have been using it for a few weeks now and I am very satisfied with my purchase. Highly recommended!',
  'I am extremely happy with this purchase. The product arrived quickly and was exactly what I needed. The quality exceeded my expectations and I would definitely buy from this seller again.',
  'Outstanding product! The build quality is excellent and it has made a significant difference in my daily work. The seller was also very responsive to my questions before purchasing.',
  'Great value for the price. The product is well-made and functions perfectly. I compared several similar products before choosing this one and I am glad I did. Excellent choice!',
  'This exceeded all my expectations. The quality is superb and it looks even better in person. The packaging was also very secure and professional. Will be ordering more from this seller.',
];

// Review content templates (neutral)
const NEUTRAL_REVIEWS = [
  'The product is okay. It works as described but nothing exceptional. The price point is reasonable but I expected slightly better quality for the cost. Still a decent purchase overall.',
  'Decent product for the price. It does what it is supposed to do but there is room for improvement. The delivery was fast and the seller was professional in their communication.',
  'Average quality product. It meets basic expectations but could use some improvements in design and materials. For the price, it is acceptable but not outstanding.',
];

// Review content templates (negative)
const NEGATIVE_REVIEWS = [
  'Unfortunately, this product did not meet my expectations. The quality is lower than what was advertised and it does not function as smoothly as I hoped. I am disappointed with this purchase.',
  'Not satisfied with this purchase. The product arrived with some minor defects and the overall quality is not what I expected based on the description and price point.',
];

// Pros and cons
const PROS_OPTIONS = [
  'Excellent build quality',
  'Fast delivery',
  'Great customer service',
  'Easy to use',
  'Good value for money',
  'Durable materials',
  'Stylish design',
  'Comfortable',
  'Well-packaged',
  'Exactly as described',
];

const CONS_OPTIONS = [
  'Slightly expensive',
  'Could be more durable',
  'Instructions unclear',
  'Takes time to set up',
  'Packaging could be better',
  'Limited color options',
  'No warranty included',
];

/**
 * Generate random date within last N days
 */
function randomDateWithinDays(days: number): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const randomTime = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
  return new Date(randomTime);
}

/**
 * Generate random array subset
 */
function randomSubset<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Seed test products
 */
async function seedProducts(): Promise<SeedProduct[]> {
  console.log('🌱 Seeding products...');
  
  const products: SeedProduct[] = [];
  
  for (let i = 0; i < PRODUCT_TEMPLATES.length; i++) {
    const template = PRODUCT_TEMPLATES[i];
    const fsin = `FSIN-${nanoid(10).toUpperCase()}`;
    
    products.push({
      fsin,
      title: template.title,
      description: template.description,
      categoryId: template.categoryId,
      images: template.images,
      isActive: true,
      hasVariations: false,
      attributes: {},
      complianceFlags: [],
      createdBy: TEST_SELLER_ID,
      createdAt: randomDateWithinDays(180),
      updatedAt: new Date(),
    });
  }
  
  // Clear existing test products
  await SouqProduct.deleteMany({ createdBy: TEST_SELLER_ID });
  
  // Insert new products
  const insertedProducts = (await SouqProduct.insertMany(products)) as SeedProduct[];
  console.log(`✅ Created ${insertedProducts.length} products`);
  
  return insertedProducts;
}

/**
 * Seed test orders
 */
async function seedOrders(products: SeedProduct[]): Promise<SeedOrder[]> {
  console.log('🌱 Seeding orders...');
  
  const orders: SeedOrder[] = [];
  const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed'];
  
  for (let i = 0; i < 50; i++) {
    const customerId = `CUST-${nanoid(10).toUpperCase()}`;
    const customerName = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
    const orderId = `ORD-${nanoid(10).toUpperCase()}`;
    
    // Random 1-3 items per order
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const orderProducts = randomSubset(products, itemCount);
    
    const items = orderProducts.map((product) => {
      const quantity = Math.floor(Math.random() * 3) + 1;
      return {
        fsin: product.fsin,
        productId: product.productId,
        productName: product.name,
        quantity,
        price: product.price,
        subtotal: product.price * quantity,
      };
    });
    
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.15; // 15% tax
    const total = subtotal + tax;
    
    // Older orders are more likely to be delivered
    const orderAge = Math.random() * 90;
    let status;
    if (orderAge > 60) status = orderStatuses[5]; // completed
    else if (orderAge > 40) status = orderStatuses[4]; // delivered
    else if (orderAge > 20) status = orderStatuses[3]; // shipped
    else if (orderAge > 10) status = orderStatuses[2]; // processing
    else if (orderAge > 5) status = orderStatuses[1]; // confirmed
    else status = orderStatuses[0]; // pending
    
    orders.push({
      orderId,
      org_id: TEST_ORG_ID,
      sellerId: TEST_SELLER_ID,
      customerId,
      customerName,
      items,
      subtotal,
      tax,
      total,
      status,
      paymentStatus: status === 'pending' ? 'pending' : 'paid',
      shippingAddress: {
        street: '123 Test Street',
        city: 'Riyadh',
        country: 'Saudi Arabia',
        postalCode: '12345',
      },
      createdAt: randomDateWithinDays(orderAge),
      updatedAt: new Date(),
    });
  }
  
  // Clear existing test orders
  await SouqOrder.deleteMany({ org_id: TEST_ORG_ID });
  
  // Insert new orders
  const insertedOrders = (await SouqOrder.insertMany(orders)) as SeedOrder[];
  console.log(`✅ Created ${insertedOrders.length} orders`);
  
  return insertedOrders;
}

/**
 * Seed test reviews
 */
async function seedReviews(products: SeedProduct[], orders: SeedOrder[]) {
  console.log('🌱 Seeding reviews...');
  
  const reviews = [];
  
  // Get delivered/completed orders for verified reviews
  const deliveredOrders = orders.filter(o => 
    o.status === 'delivered' || o.status === 'completed'
  );
  
  // Create reviews for about 60% of delivered orders
  const reviewCount = Math.floor(deliveredOrders.length * 0.6);
  const ordersToReview = randomSubset(deliveredOrders, reviewCount);
  
  for (const order of ordersToReview) {
    // Review one random item from the order
    const item = order.items[Math.floor(Math.random() * order.items.length)];
    
    // Random rating (weighted toward positive)
    const rand = Math.random();
    let rating;
    if (rand < 0.5) rating = 5; // 50% 5-star
    else if (rand < 0.75) rating = 4; // 25% 4-star
    else if (rand < 0.85) rating = 3; // 10% 3-star
    else if (rand < 0.95) rating = 2; // 10% 2-star
    else rating = 1; // 5% 1-star
    
    // Select review content based on rating
    let content, pros, cons;
    if (rating >= 4) {
      content = POSITIVE_REVIEWS[Math.floor(Math.random() * POSITIVE_REVIEWS.length)];
      pros = randomSubset(PROS_OPTIONS, Math.floor(Math.random() * 3) + 2);
      cons = Math.random() < 0.3 ? randomSubset(CONS_OPTIONS, 1) : [];
    } else if (rating === 3) {
      content = NEUTRAL_REVIEWS[Math.floor(Math.random() * NEUTRAL_REVIEWS.length)];
      pros = randomSubset(PROS_OPTIONS, Math.floor(Math.random() * 2) + 1);
      cons = randomSubset(CONS_OPTIONS, Math.floor(Math.random() * 2) + 1);
    } else {
      content = NEGATIVE_REVIEWS[Math.floor(Math.random() * NEGATIVE_REVIEWS.length)];
      pros = Math.random() < 0.3 ? randomSubset(PROS_OPTIONS, 1) : [];
      cons = randomSubset(CONS_OPTIONS, Math.floor(Math.random() * 3) + 2);
    }
    
    const reviewId = `REV-${nanoid(10).toUpperCase()}`;
    
    reviews.push({
      reviewId,
      org_id: TEST_ORG_ID,
      productId: item.productId,
      fsin: item.fsin,
      customerId: order.customerId,
      customerName: order.customerName,
      orderId: order.orderId,
      rating,
      title: REVIEW_TITLES[Math.floor(Math.random() * REVIEW_TITLES.length)],
      content,
      pros,
      cons,
      isVerifiedPurchase: true,
      status: 'published',
      helpful: Math.floor(Math.random() * 20),
      notHelpful: Math.floor(Math.random() * 5),
      reportedCount: 0,
      createdAt: new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after order
      updatedAt: new Date(),
    });
  }
  
  // Also add some non-verified reviews
  const nonVerifiedCount = Math.floor(reviewCount * 0.2);
  for (let i = 0; i < nonVerifiedCount; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const rating = Math.floor(Math.random() * 5) + 1;
    
    let content;
    if (rating >= 4) content = POSITIVE_REVIEWS[Math.floor(Math.random() * POSITIVE_REVIEWS.length)];
    else if (rating === 3) content = NEUTRAL_REVIEWS[Math.floor(Math.random() * NEUTRAL_REVIEWS.length)];
    else content = NEGATIVE_REVIEWS[Math.floor(Math.random() * NEGATIVE_REVIEWS.length)];
    
    reviews.push({
      reviewId: `REV-${nanoid(10).toUpperCase()}`,
      org_id: TEST_ORG_ID,
      productId: product.productId,
      fsin: product.fsin,
      customerId: `CUST-${nanoid(10).toUpperCase()}`,
      customerName: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
      rating,
      title: REVIEW_TITLES[Math.floor(Math.random() * REVIEW_TITLES.length)],
      content,
      isVerifiedPurchase: false,
      status: 'published',
      helpful: Math.floor(Math.random() * 10),
      notHelpful: Math.floor(Math.random() * 3),
      reportedCount: 0,
      createdAt: randomDateWithinDays(60),
      updatedAt: new Date(),
    });
  }
  
  // Clear existing test reviews
  await SouqReview.deleteMany({ org_id: TEST_ORG_ID });
  
  // Insert new reviews
  const insertedReviews = await SouqReview.insertMany(reviews);
  console.log(`✅ Created ${insertedReviews.length} reviews (${reviewCount} verified, ${nonVerifiedCount} non-verified)`);
  
  return insertedReviews;
}

/**
 * Main seed function
 */
async function main() {
  try {
    console.log('🚀 Starting Souq test data seeding...\n');
    
    // Connect to database
    await connectDb();
    console.log('✅ Connected to database\n');
    
    // Seed data
    const products = await seedProducts();
    console.log('');
    
    const orders = await seedOrders(products);
    console.log('');
    
    const reviews = await seedReviews(products, orders);
    console.log('');
    
    // Summary
    console.log('📊 Seeding Summary:');
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Orders: ${orders.length}`);
    console.log(`   - Reviews: ${reviews.length}`);
    console.log('');
    
    // Calculate some stats
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    
    console.log('📈 Test Data Stats:');
    console.log(`   - Total Revenue: ${totalRevenue.toFixed(2)} SAR`);
    console.log(`   - Average Rating: ${avgRating.toFixed(2)} ⭐`);
    console.log(`   - Verified Reviews: ${reviews.filter(r => r.isVerifiedPurchase).length}`);
    console.log(`   - Completed Orders: ${orders.filter(o => o.status === 'completed').length}`);
    console.log('');
    
    console.log('✅ Seeding completed successfully!');
    console.log('');
    console.log('🧪 Test Data Identifiers:');
    console.log(`   - Organization ID: ${TEST_ORG_ID}`);
    console.log(`   - Seller ID: ${TEST_SELLER_ID}`);
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Login as a seller with TEST_SELLER_ID');
    console.log('   2. Navigate to /marketplace/seller-central/analytics');
    console.log('   3. View products at /marketplace/souq/products');
    console.log('   4. Test review submission on product pages');
    console.log('');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedProducts, seedOrders, seedReviews };
