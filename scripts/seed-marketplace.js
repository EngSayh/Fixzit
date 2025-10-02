const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  console.error('💡 Set it in your .env.local file');
  process.exit(1);
}

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Password123';
if (!process.env.SEED_PASSWORD) {
  console.warn('⚠️  SEED_PASSWORD not set, using default (not for production!)');
}

// MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;

// Define schemas
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: String,
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN', 'VENDOR', 'CUSTOMER', 'TECHNICIAN'],
    default: 'CUSTOMER'
  },
  tenantId: String,
  locale: { type: String, default: 'en' },
  currency: { type: String, default: 'SAR' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const categorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  parentId: String,
  icon: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const vendorSchema = new mongoose.Schema({
  tenantId: String,
  userId: String,
  name: String,
  crNumber: String,
  vatNumber: String,
  contactName: String,
  contactEmail: String,
  contactPhone: String,
  rating: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  tenantId: String,
  vendorId: String,
  categoryId: String,
  sku: { type: String, unique: true },
  title: String,
  description: String,
  images: [String],
  price: Number,
  currency: { type: String, default: 'SAR' },
  unit: String,
  stock: Number,
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Vendor = mongoose.model('Vendor', vendorSchema);
const Product = mongoose.model('Product', productSchema);

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Vendor.deleteMany({});
    await Product.deleteMany({});

    // Create users
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    
    const adminUser = await User.create({
      email: 'admin@fixzit.co',
      password: hashedPassword,
      name: 'Admin User',
      role: 'SUPER_ADMIN',
      tenantId: 'default'
    });

    const vendorUser = await User.create({
      email: 'vendor@fixzit.co',
      password: hashedPassword,
      name: 'Vendor User',
      role: 'VENDOR',
      tenantId: 'default'
    });

    const customerUser = await User.create({
      email: 'customer@fixzit.co',
      password: hashedPassword,
      name: 'Customer User',
      role: 'CUSTOMER',
      tenantId: 'default'
    });

    // Create categories
    console.log('Creating categories...');
    const categories = await Category.create([
      { name: 'HVAC', slug: 'hvac', icon: 'hvac' },
      { name: 'Plumbing', slug: 'plumbing', icon: 'plumbing' },
      { name: 'Electrical', slug: 'electrical', icon: 'electrical' },
      { name: 'Building Materials', slug: 'building-materials', icon: 'building' },
      { name: 'Tools & Equipment', slug: 'tools-equipment', icon: 'tools' },
      { name: 'Safety Equipment', slug: 'safety-equipment', icon: 'safety' }
    ]);

    // Create vendor
    console.log('Creating vendors...');
    const vendor = await Vendor.create({
      tenantId: 'default',
      userId: vendorUser._id,
      name: 'Fixzit Supplies Co.',
      crNumber: '1234567890',
      vatNumber: '300123456789012',
      contactName: 'John Doe',
      contactEmail: 'contact@fixzitsupplies.com',
      contactPhone: '+966501234567',
      rating: 4.5,
      verified: true
    });

    // Create products
    console.log('Creating products...');
    const products = [
      // HVAC Products
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[0]._id,
        sku: 'AC-FILTER-001',
        title: 'AC Filter 24x24 inch',
        description: 'High-quality HEPA air filter for AC units. Captures 99.97% of particles.',
        images: ['/img/ac-filter.jpg'],
        price: 89.99,
        unit: 'piece',
        stock: 150,
        rating: 4.7,
        reviewCount: 23
      },
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[0]._id,
        sku: 'AC-COMP-001',
        title: 'AC Compressor 2.5 Ton',
        description: 'Energy-efficient rotary compressor for split AC units.',
        images: ['/img/ac-compressor.jpg'],
        price: 1850.00,
        unit: 'piece',
        stock: 25,
        rating: 4.5,
        reviewCount: 8
      },
      // Plumbing Products
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[1]._id,
        sku: 'PIPE-PVC-001',
        title: 'PVC Pipe 2 inch (6m)',
        description: 'Schedule 40 PVC pipe suitable for water supply and drainage.',
        images: ['/img/pvc-pipe.jpg'],
        price: 45.50,
        unit: 'piece',
        stock: 500,
        rating: 4.8,
        reviewCount: 67
      },
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[1]._id,
        sku: 'VALVE-GATE-001',
        title: 'Brass Gate Valve 1 inch',
        description: 'Heavy-duty brass gate valve with threaded connections.',
        images: ['/img/gate-valve.jpg'],
        price: 125.00,
        unit: 'piece',
        stock: 80,
        rating: 4.6,
        reviewCount: 15
      },
      // Electrical Products
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[2]._id,
        sku: 'CABLE-ELEC-001',
        title: 'Electrical Cable 2.5mm (100m)',
        description: 'Copper electrical cable with PVC insulation. Suitable for indoor wiring.',
        images: ['/img/electrical-cable.jpg'],
        price: 385.00,
        unit: 'roll',
        stock: 45,
        rating: 4.9,
        reviewCount: 34
      },
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[2]._id,
        sku: 'BREAKER-MCB-001',
        title: 'MCB Circuit Breaker 32A',
        description: 'Miniature circuit breaker for overload and short circuit protection.',
        images: ['/img/mcb-breaker.jpg'],
        price: 65.00,
        unit: 'piece',
        stock: 120,
        rating: 4.7,
        reviewCount: 19
      },
      // Building Materials
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[3]._id,
        sku: 'CEMENT-PORT-001',
        title: 'Portland Cement 50kg',
        description: 'Type I Portland cement for general construction use.',
        images: ['/img/cement-bag.jpg'],
        price: 22.50,
        unit: 'bag',
        stock: 1000,
        rating: 4.8,
        reviewCount: 89
      },
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[3]._id,
        sku: 'TILE-CERAMIC-001',
        title: 'Ceramic Floor Tile 60x60cm',
        description: 'Premium quality ceramic tiles with anti-slip surface.',
        images: ['/img/ceramic-tile.jpg'],
        price: 85.00,
        unit: 'box',
        stock: 200,
        rating: 4.6,
        reviewCount: 42
      },
      // Tools & Equipment
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[4]._id,
        sku: 'DRILL-CORDLESS-001',
        title: 'Cordless Drill 18V',
        description: 'Professional cordless drill with 2 batteries and charger.',
        images: ['/img/cordless-drill.jpg'],
        price: 450.00,
        unit: 'set',
        stock: 35,
        rating: 4.7,
        reviewCount: 28
      },
      // Safety Equipment
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[5]._id,
        sku: 'HELMET-SAFETY-001',
        title: 'Safety Helmet',
        description: 'High-impact ABS safety helmet with adjustable suspension.',
        images: ['/img/safety-helmet.jpg'],
        price: 45.00,
        unit: 'piece',
        stock: 250,
        rating: 4.8,
        reviewCount: 56
      }
    ];

    await Product.create(products);

    console.log('✅ Database seeded successfully!');
    
    const isDev = process.env.NODE_ENV === 'development' && !process.env.CI;
    console.log('\nTest credentials:');
    console.log('- Admin: admin@fixzit.co');
    console.log('- Vendor: vendor@fixzit.co');
    console.log('- Customer: customer@fixzit.co');
    if (isDev) {
      console.log(`Password: ${SEED_PASSWORD} (DEV ONLY)`);
    } else {
      console.log('Password: [REDACTED - check SEED_PASSWORD env var]');
    }

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();
