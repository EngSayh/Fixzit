const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB URI from environment or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';

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

async function seedMarketplace({ mongodbUri = MONGODB_URI } = {}) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Vendor.deleteMany({});
    await Product.deleteMany({});

    // Create users
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

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
        sku: 'AC-MAINT-PLAN-001',
        title: 'Annual AC Maintenance Plan',
        description: 'Comprehensive maintenance plan for residential AC systems.',
        images: ['/img/ac-maintenance.jpg'],
        price: 599,
        unit: 'plan',
        stock: 50,
        rating: 4.8,
        reviewCount: 18
      },
      // Plumbing Products
      {
        tenantId: 'default',
        vendorId: vendor._id,
        categoryId: categories[1]._id,
        sku: 'PIPE-PVC-001',
        title: 'PVC Pipe 1 inch',
        description: 'Schedule 40 PVC pipe for residential plumbing.',
        images: ['/img/pvc-pipe.jpg'],
        price: 19.99,
        unit: 'meter',
        stock: 300,
        rating: 4.5,
        reviewCount: 12
      }
    ];

    await Product.create(products);

    console.log('✅ Database seeded successfully!');
    console.log('\nTest credentials:');
    console.log('- Admin: admin@fixzit.co / password123');
    console.log('- Vendor: vendor@fixzit.co / password123');
    console.log('- Customer: customer@fixzit.co / password123');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

module.exports = {
  seedMarketplace
};

if (require.main === module) {
  seedMarketplace();
}
