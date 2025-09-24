import mongoose from 'mongoose';
import { Category } from '@/src/server/models/Category';
import { Product } from '@/src/server/models/Product';
import { SearchSynonym } from '@/src/server/models/SearchSynonym';
import Listing from '@/src/server/models/Listing';
import dotenv from 'dotenv';

// Load env from .env and .env.local to match Next.js dev setup
dotenv.config();
dotenv.config({ path: '.env.local' });

const ORG_ID = process.env.SEED_ORG_ID || 'fixzit-platform';

// Category data
const CATEGORIES = [
  {
    name: 'Electrical',
    nameAr: 'كهرباء',
    slug: 'electrical',
    icon: '⚡',
    subcategories: [
      { name: 'Cables & Wires', nameAr: 'الكابلات والأسلاك', slug: 'cables-wires' },
      { name: 'Circuit Breakers', nameAr: 'قواطع الدائرة', slug: 'circuit-breakers' },
      { name: 'Electrical Panels', nameAr: 'اللوحات الكهربائية', slug: 'electrical-panels' },
      { name: 'Switches & Outlets', nameAr: 'المفاتيح والمنافذ', slug: 'switches-outlets' },
      { name: 'Lighting Fixtures', nameAr: 'تركيبات الإضاءة', slug: 'lighting-fixtures' }
    ]
  },
  {
    name: 'Plumbing',
    nameAr: 'السباكة',
    slug: 'plumbing',
    icon: '🚿',
    subcategories: [
      { name: 'Pipes & Fittings', nameAr: 'الأنابيب والتجهيزات', slug: 'pipes-fittings' },
      { name: 'Valves', nameAr: 'الصمامات', slug: 'valves' },
      { name: 'Fixtures', nameAr: 'التركيبات', slug: 'fixtures' },
      { name: 'Pumps', nameAr: 'المضخات', slug: 'pumps' }
    ]
  },
  {
    name: 'HVAC',
    nameAr: 'التكييف والتهوية',
    slug: 'hvac',
    icon: '❄️',
    subcategories: [
      { name: 'AC Units', nameAr: 'وحدات التكييف', slug: 'ac-units' },
      { name: 'Filters', nameAr: 'الفلاتر', slug: 'filters' },
      { name: 'Ducting', nameAr: 'مجاري الهواء', slug: 'ducting' },
      { name: 'Thermostats', nameAr: 'منظمات الحرارة', slug: 'thermostats' }
    ]
  },
  {
    name: 'Concrete & Cement',
    nameAr: 'الخرسانة والأسمنت',
    slug: 'concrete-cement',
    icon: '🏗️',
    subcategories: [
      { name: 'Cement', nameAr: 'الأسمنت', slug: 'cement' },
      { name: 'Admixtures', nameAr: 'الإضافات', slug: 'admixtures' },
      { name: 'Rebar & Mesh', nameAr: 'حديد التسليح', slug: 'rebar-mesh' },
      { name: 'Concrete Blocks', nameAr: 'البلوك الخرساني', slug: 'concrete-blocks' }
    ]
  },
  {
    name: 'Paints & Coatings',
    nameAr: 'الدهانات والطلاءات',
    slug: 'paints-coatings',
    icon: '🎨',
    subcategories: [
      { name: 'Interior Paints', nameAr: 'دهانات داخلية', slug: 'interior-paints' },
      { name: 'Exterior Paints', nameAr: 'دهانات خارجية', slug: 'exterior-paints' },
      { name: 'Primers', nameAr: 'الأساسات', slug: 'primers' },
      { name: 'Special Coatings', nameAr: 'طلاءات خاصة', slug: 'special-coatings' }
    ]
  },
  {
    name: 'PPE & Safety',
    nameAr: 'معدات الحماية',
    slug: 'ppe-safety',
    icon: '🦺',
    subcategories: [
      { name: 'Safety Helmets', nameAr: 'خوذات السلامة', slug: 'safety-helmets' },
      { name: 'Safety Gloves', nameAr: 'قفازات السلامة', slug: 'safety-gloves' },
      { name: 'Safety Shoes', nameAr: 'أحذية السلامة', slug: 'safety-shoes' },
      { name: 'Safety Harness', nameAr: 'أحزمة السلامة', slug: 'safety-harness' }
    ]
  },
  {
    name: 'Tools & Hardware',
    nameAr: 'الأدوات والعدد',
    slug: 'tools-hardware',
    icon: '🔧',
    subcategories: [
      { name: 'Power Tools', nameAr: 'أدوات كهربائية', slug: 'power-tools' },
      { name: 'Hand Tools', nameAr: 'أدوات يدوية', slug: 'hand-tools' },
      { name: 'Fasteners', nameAr: 'المثبتات', slug: 'fasteners' },
      { name: 'Accessories', nameAr: 'الملحقات', slug: 'accessories' }
    ]
  }
];

// Sample products with ASTM/BS EN specifications
const SAMPLE_PRODUCTS = [
  {
    name: 'Portland Cement Type I/II - 50kg',
    nameAr: 'أسمنت بورتلاند نوع I/II - 50 كجم',
    description: 'High-quality Portland cement suitable for general construction applications. Meets ASTM C150 standards.',
    descriptionAr: 'أسمنت بورتلاند عالي الجودة مناسب لتطبيقات البناء العامة. يتوافق مع معايير ASTM C150.',
    category: 'concrete-cement',
    subcategory: 'cement',
    sku: 'CEM-PORT-50',
    vendorId: 'vendor-001',
    price: { amount: 16.5, currency: 'SAR', vat: 15 },
    stock: { quantity: 500, unit: 'bag', minOrder: 10, leadTime: 2 },
    specifications: {
      'Standard': 'ASTM C150',
      'Type': 'I/II',
      'Fineness': '350 m²/kg',
      'Setting Time': '45-375 min',
      'Compressive Strength': '≥ 19 MPa (3 days)',
      'Weight': '50 kg'
    },
    tags: ['cement', 'portland', 'construction', 'astm', 'أسمنت']
  },
  {
    name: 'PVC Insulated Cable 2.5mm² - 100m',
    nameAr: 'كابل PVC معزول 2.5 مم² - 100 متر',
    description: 'High-quality PVC insulated electrical cable for residential and commercial wiring. BS EN 50525-2-31 compliant.',
    descriptionAr: 'كابل كهربائي معزول PVC عالي الجودة للأسلاك السكنية والتجارية. متوافق مع BS EN 50525-2-31.',
    category: 'electrical',
    subcategory: 'cables-wires',
    sku: 'CAB-PVC-2.5-100',
    vendorId: 'vendor-002',
    price: { amount: 125, currency: 'SAR', vat: 15 },
    stock: { quantity: 200, unit: 'roll', minOrder: 1, leadTime: 3 },
    specifications: {
      'Standard': 'BS EN 50525-2-31',
      'Conductor Size': '2.5 mm²',
      'Voltage Rating': '450/750V',
      'Conductor Material': 'Copper',
      'Insulation': 'PVC',
      'Temperature Rating': '70°C',
      'Length': '100 meters'
    },
    tags: ['cable', 'electrical', 'pvc', 'wire', 'كابل', 'كهرباء']
  },
  {
    name: 'Safety Helmet with Chin Strap',
    nameAr: 'خوذة سلامة مع حزام الذقن',
    description: 'Industrial safety helmet with adjustable chin strap. EN 397:2012+A1:2012 certified.',
    descriptionAr: 'خوذة سلامة صناعية مع حزام ذقن قابل للتعديل. معتمدة EN 397:2012+A1:2012.',
    category: 'ppe-safety',
    subcategory: 'safety-helmets',
    sku: 'PPE-HELM-001',
    vendorId: 'vendor-003',
    price: { amount: 45, currency: 'SAR', vat: 15 },
    stock: { quantity: 150, unit: 'piece', minOrder: 5, leadTime: 1 },
    specifications: {
      'Standard': 'EN 397:2012+A1:2012',
      'Material': 'ABS Plastic',
      'Color': 'White/Yellow/Orange',
      'Size': 'Adjustable (52-64 cm)',
      'Weight': '350g',
      'Features': 'Ventilated, UV resistant'
    },
    tags: ['safety', 'helmet', 'ppe', 'protection', 'خوذة', 'سلامة']
  }
];

// Search synonyms
const SEARCH_SYNONYMS: Array<{ locale: 'en' | 'ar'; term: string; synonyms: string[] }> = [
  // English synonyms
  { locale: 'en', term: 'ac filter', synonyms: ['hvac filter', 'air filter', 'air conditioning filter'] },
  { locale: 'en', term: 'pvc pipe', synonyms: ['plastic pipe', 'u-pvc', 'upvc pipe'] },
  { locale: 'en', term: 'cement', synonyms: ['portland cement', 'concrete mix'] },
  { locale: 'en', term: 'wire', synonyms: ['cable', 'electrical wire', 'conductor'] },
  { locale: 'en', term: 'paint', synonyms: ['coating', 'wall paint', 'color'] },
  
  // Arabic synonyms
  { locale: 'ar', term: 'دهان', synonyms: ['طلاء', 'بوية', 'صبغ'] },
  { locale: 'ar', term: 'أسمنت', synonyms: ['اسمنت', 'سمنت', 'خرسانة'] },
  { locale: 'ar', term: 'كابل', synonyms: ['سلك', 'كيبل', 'موصل'] },
  { locale: 'ar', term: 'أنابيب', synonyms: ['انابيب', 'مواسير', 'بايب'] },
  { locale: 'ar', term: 'فلتر', synonyms: ['فلاتر', 'مرشح', 'منقي'] }
];

async function seedCategories() {
  console.log('🌱 Seeding categories...');
  
  for (const categoryData of CATEGORIES) {
    const { subcategories, ...mainCategoryData } = categoryData;
    
    // Create or update main category
    const mainCategory = await Category.findOneAndUpdate(
      { orgId: ORG_ID, slug: mainCategoryData.slug },
      {
        $setOnInsert: {
          orgId: ORG_ID,
          ...mainCategoryData,
          path: [mainCategoryData.slug]
        }
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Category: ${mainCategory.name}`);
    
    // Create subcategories
    if (subcategories) {
      for (const subData of subcategories) {
        await Category.findOneAndUpdate(
          { orgId: ORG_ID, slug: subData.slug },
          {
            $setOnInsert: {
              orgId: ORG_ID,
              ...subData,
              parentId: mainCategory._id,
              path: [mainCategoryData.slug, subData.slug]
            }
          },
          { upsert: true }
        );
        console.log(`  ✅ Subcategory: ${subData.name}`);
      }
    }
  }
}

async function seedProducts() {
  console.log('\n🌱 Seeding products...');
  
  for (const productData of SAMPLE_PRODUCTS) {
    const product = await Product.findOneAndUpdate(
      { sku: productData.sku },
      {
        $setOnInsert: {
          ...productData,
          type: 'material',
          images: {
            primary: `/images/products/${productData.sku.toLowerCase()}.jpg`,
            gallery: []
          },
          isActive: true,
          publishedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Product: ${product.name} (${product.sku})`);

    // Upsert material listing mapped from product
    await Listing.findOneAndUpdate(
      { 'material.model': product.sku, type: 'material', orgId: ORG_ID },
      {
        $setOnInsert: {
          type: 'material',
          status: 'active',
          tenantId: ORG_ID,
          orgId: ORG_ID,
          title: product.name,
          description: product.description,
          price: product.price.amount,
          currency: product.price.currency,
          material: {
            category: product.category,
            brand: 'Demo Brand',
            model: product.sku,
            specifications: product.specifications,
            quantity: product.stock.quantity,
            unit: product.stock.unit,
            minOrder: product.stock.minOrder,
            deliveryOptions: [],
            certifications: []
          },
          media: {
            images: [{ url: product.images.primary, thumbnailUrl: product.images.primary, watermarked: false }]
          },
          seller: {
            userId: 'seed-user',
            type: 'vendor',
            name: 'Seed Vendor',
            verified: true,
            contact: { whatsapp: true }
          },
          guestAccess: { allowBrowse: true, showPrice: true, showLocation: 'district', requireAuthFor: { contact: true, exactLocation: true, documents: true, makeOffer: true } },
          verification: { status: 'verified' },
          visibility: { public: true },
          publishedAt: new Date()
        }
      },
      { upsert: true }
    );
  }
}

async function seedProperties() {
  console.log('\n🌱 Seeding demo properties...');
  const props = [
    {
      title: 'Modern Apartment in Riyadh',
      price: 85000,
      currency: 'SAR',
      property: {
        category: 'residential',
        subcategory: 'apartment',
        purpose: 'rent',
        area: 120,
        bedrooms: 2,
        bathrooms: 2,
        location: { city: 'Riyadh', district: 'Al Olaya', coordinates: { lat: 24.7136, lng: 46.6753, accuracy: 'district' } }
      }
    },
    {
      title: 'Luxury Villa in Jeddah',
      price: 150000,
      currency: 'SAR',
      property: {
        category: 'residential',
        subcategory: 'villa',
        purpose: 'rent',
        area: 300,
        bedrooms: 4,
        bathrooms: 3,
        location: { city: 'Jeddah', district: 'Al Hamra', coordinates: { lat: 21.4225, lng: 39.8262, accuracy: 'district' } }
      }
    }
  ];

  for (const p of props) {
    await Listing.findOneAndUpdate(
      { title: p.title, type: 'property', orgId: ORG_ID },
      {
        $setOnInsert: {
          type: 'property',
          status: 'active',
          tenantId: ORG_ID,
          orgId: ORG_ID,
          title: p.title,
          description: p.title,
          price: p.price,
          currency: p.currency,
          property: p.property,
          media: { images: [{ url: '/placeholder-property.jpg', thumbnailUrl: '/placeholder-property.jpg', watermarked: true }] },
          seller: { userId: 'seed-user', type: 'owner', name: 'Seed Owner', verified: true, contact: { whatsapp: true } },
          guestAccess: { allowBrowse: true, showPrice: true, showLocation: 'district', requireAuthFor: { contact: true, exactLocation: true, documents: true, makeOffer: true } },
          verification: { status: 'verified' },
          visibility: { public: true },
          publishedAt: new Date()
        }
      },
      { upsert: true }
    );
  }
}

async function seedSearchSynonyms() {
  console.log('\n🌱 Seeding search synonyms...');
  
  const result = await SearchSynonym.importBulk(SEARCH_SYNONYMS);
  console.log(`✅ Imported ${result.modifiedCount + result.upsertedCount} search synonyms`);
}

async function main() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set. Please set it in .env.local or environment variables.');
    // Connect to MongoDB (no localhost fallback; real DB required)
    await mongoose.connect(uri);
    console.log('📦 Connected to MongoDB');
    
    // Run seeders
    await seedCategories();
    await seedProducts();
    await seedProperties();
    await seedSearchSynonyms();
    
    console.log('\n✨ Marketplace seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  main();
}
