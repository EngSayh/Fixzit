import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { config } from '@/src/config/environment';

// Real product data for Fixzit marketplace
const products = [
  // HVAC Category
  {
    name: 'Carrier 5 Ton Split AC Unit',
    nameAr: 'مكيف كاريير 5 طن سبليت',
    description: 'Commercial grade split AC unit with inverter technology, ideal for offices and retail spaces',
    descriptionAr: 'وحدة تكييف سبليت تجارية بتقنية الانفرتر، مثالية للمكاتب والمساحات التجارية',
    category: 'HVAC',
    subcategory: 'Air Conditioners',
    brand: 'Carrier',
    price: 8500,
    currency: 'SAR',
    stock: 25,
    sku: 'CAR-AC-5T-001',
    vendorId: 'vendor-001',
    images: [
      '/images/products/carrier-ac-5ton.jpg',
      '/images/products/carrier-ac-5ton-2.jpg'
    ],
    specifications: {
      capacity: '5 Ton',
      type: 'Split',
      energyRating: 'A++',
      coolingCapacity: '60,000 BTU/hr',
      voltage: '380V/3Ph/50Hz',
      warranty: '2 Years'
    },
    features: [
      'Inverter Technology',
      'Energy Efficient',
      'Remote Control',
      'Timer Function',
      'Auto Restart'
    ],
    status: 'ACTIVE',
    rating: 4.5,
    reviewCount: 127
  },
  {
    name: 'Gree Window AC 2 Ton',
    nameAr: 'مكيف شباك جري 2 طن',
    description: 'Window type air conditioner suitable for residential and small office use',
    descriptionAr: 'مكيف شباك مناسب للاستخدام السكني والمكاتب الصغيرة',
    category: 'HVAC',
    subcategory: 'Air Conditioners',
    brand: 'Gree',
    price: 2200,
    currency: 'SAR',
    stock: 45,
    sku: 'GRE-WAC-2T-001',
    vendorId: 'vendor-001',
    images: ['/images/products/gree-window-ac.jpg'],
    specifications: {
      capacity: '2 Ton',
      type: 'Window',
      energyRating: 'A+',
      coolingCapacity: '24,000 BTU/hr',
      voltage: '220V/1Ph/50Hz',
      warranty: '1 Year'
    },
    status: 'ACTIVE',
    rating: 4.2,
    reviewCount: 89
  },
  
  // Lighting Category
  {
    name: 'Philips LED Panel 60x60 40W',
    nameAr: 'لوحة فيليبس LED 60×60 40 واط',
    description: 'High efficiency LED panel light for false ceiling, 6500K daylight',
    descriptionAr: 'لوحة إضاءة LED عالية الكفاءة للأسقف المستعارة، ضوء نهار 6500K',
    category: 'Lighting',
    subcategory: 'LED Panels',
    brand: 'Philips',
    price: 135,
    currency: 'SAR',
    stock: 320,
    sku: 'PHI-LED-6060-40W',
    vendorId: 'vendor-002',
    images: ['/images/products/philips-led-panel.jpg'],
    specifications: {
      wattage: '40W',
      colorTemp: '6500K',
      lumens: '4000lm',
      size: '60x60cm',
      lifespan: '50,000 hours',
      warranty: '3 Years'
    },
    features: [
      'Energy Saving',
      'Flicker Free',
      'Instant Start',
      'Wide Beam Angle'
    ],
    status: 'ACTIVE',
    rating: 4.7,
    reviewCount: 234
  },
  
  // Safety Equipment
  {
    name: 'ABC Fire Extinguisher 6kg',
    nameAr: 'طفاية حريق ABC سعة 6 كجم',
    description: 'Multi-purpose dry powder fire extinguisher suitable for Class A, B, and C fires',
    descriptionAr: 'طفاية حريق بودرة جافة متعددة الأغراض مناسبة لحرائق الفئة A وB وC',
    category: 'Safety',
    subcategory: 'Fire Safety',
    brand: 'SafeGuard',
    price: 195,
    currency: 'SAR',
    stock: 150,
    sku: 'SG-FE-ABC-6KG',
    vendorId: 'vendor-003',
    images: ['/images/products/fire-extinguisher.jpg'],
    specifications: {
      type: 'ABC Dry Powder',
      capacity: '6kg',
      pressure: '14 Bar',
      certification: 'SASO Approved',
      validity: '1 Year from manufacture'
    },
    status: 'ACTIVE',
    rating: 4.8,
    reviewCount: 156
  },
  
  // Plumbing
  {
    name: 'Grundfos Water Pump 2HP',
    nameAr: 'مضخة مياه جراندفوس 2 حصان',
    description: 'Centrifugal water pump for residential and commercial applications',
    descriptionAr: 'مضخة مياه طرد مركزي للتطبيقات السكنية والتجارية',
    category: 'Plumbing',
    subcategory: 'Pumps',
    brand: 'Grundfos',
    price: 3800,
    currency: 'SAR',
    stock: 35,
    sku: 'GRU-PUMP-2HP',
    vendorId: 'vendor-004',
    images: ['/images/products/grundfos-pump.jpg'],
    specifications: {
      power: '2HP / 1.5kW',
      flowRate: '160 L/min',
      head: '35m',
      inlet: '2 inch',
      outlet: '2 inch',
      warranty: '2 Years'
    },
    status: 'ACTIVE',
    rating: 4.6,
    reviewCount: 78
  },
  
  // Electrical
  {
    name: 'Schneider MCB 3P 32A',
    nameAr: 'قاطع كهربائي شنايدر 3 فاز 32 أمبير',
    description: 'Miniature Circuit Breaker, 3 pole, 32 ampere rating',
    descriptionAr: 'قاطع دائرة مصغر، 3 أقطاب، تصنيف 32 أمبير',
    category: 'Electrical',
    subcategory: 'Circuit Breakers',
    brand: 'Schneider Electric',
    price: 285,
    currency: 'SAR',
    stock: 200,
    sku: 'SCH-MCB-3P-32A',
    vendorId: 'vendor-002',
    images: ['/images/products/schneider-mcb.jpg'],
    specifications: {
      poles: '3P',
      current: '32A',
      voltage: '400V AC',
      breakingCapacity: '10kA',
      standard: 'IEC 60898-1'
    },
    status: 'ACTIVE',
    rating: 4.9,
    reviewCount: 312
  },
  
  // Cleaning Supplies
  {
    name: 'Industrial Floor Cleaner 20L',
    nameAr: 'منظف أرضيات صناعي 20 لتر',
    description: 'Heavy duty floor cleaning solution for marble, granite and ceramic',
    descriptionAr: 'محلول تنظيف أرضيات شديد التحمل للرخام والجرانيت والسيراميك',
    category: 'Cleaning',
    subcategory: 'Chemicals',
    brand: 'CleanPro',
    price: 125,
    currency: 'SAR',
    stock: 85,
    sku: 'CP-FC-20L',
    vendorId: 'vendor-005',
    images: ['/images/products/floor-cleaner.jpg'],
    specifications: {
      volume: '20 Liters',
      ph: '7-8 (Neutral)',
      dilution: '1:50',
      scent: 'Fresh Lemon'
    },
    status: 'ACTIVE',
    rating: 4.3,
    reviewCount: 67
  },
  
  // Tools & Hardware
  {
    name: 'Bosch Professional Drill Set',
    nameAr: 'مجموعة مثقاب بوش احترافي',
    description: 'Cordless drill with 2 batteries, charger and 50pc accessory set',
    descriptionAr: 'مثقاب لاسلكي مع بطاريتين وشاحن ومجموعة إكسسوارات 50 قطعة',
    category: 'Tools',
    subcategory: 'Power Tools',
    brand: 'Bosch',
    price: 1450,
    currency: 'SAR',
    stock: 40,
    sku: 'BOS-DRILL-PRO',
    vendorId: 'vendor-001',
    images: ['/images/products/bosch-drill.jpg'],
    specifications: {
      voltage: '18V',
      torque: '50Nm',
      speed: '0-1800 RPM',
      chuckSize: '13mm',
      batteries: '2x 2.0Ah Li-Ion'
    },
    status: 'ACTIVE',
    rating: 4.8,
    reviewCount: 189
  }
];

/**
 * Seeds the products collection in MongoDB with a predefined dataset.
 *
 * Connects to the database from config.mongodb, enriches each product with
 * createdAt, updatedAt, views, and soldCount, inserts them into the
 * `products` collection, and returns a JSON response indicating success and
 * the number of inserted documents. If an error occurs, returns a 500 JSON
 * response with error details.
 *
 * The incoming request (`req`) is not used by this handler.
 *
 * @returns A NextResponse JSON object:
 * - On success: { success: true, message: 'Products seeded successfully', count: number }
 * - On failure: { error: 'Failed to seed products', details: string } with status 500
 */
export async function POST(req: NextRequest) {
  try {
    // Connect to MongoDB
    const client = new MongoClient(config.mongodb.uri);
    await client.connect();
    const db = client.db(config.mongodb.db);
    
    // Clear existing products (optional)
    // await db.collection('products').deleteMany({});
    
    // Insert products with timestamps
    const productsWithTimestamps = products.map(product => ({
      ...product,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: Math.floor(Math.random() * 1000) + 100,
      soldCount: Math.floor(Math.random() * 50)
    }));
    
    const result = await db.collection('products').insertMany(productsWithTimestamps);
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      message: 'Products seeded successfully',
      count: result.insertedCount
    });
  } catch (error: any) {
    console.error('Product seeding error:', error);
    
    return NextResponse.json(
      { error: 'Failed to seed products', details: error.message },
      { status: 500 }
    );
  }
}
