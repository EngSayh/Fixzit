const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Import models
const User = require('./models/User');
const Property = require('./models/Property');
const WorkOrder = require('./models/WorkOrder');

async function createTestData() {
  try {
    console.log('🚀 Creating test data...');

    // Create admin user
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    const admin = await User.findOneAndUpdate(
      { email: 'admin@fixzit.co' },
      {
        email: 'admin@fixzit.co',
        password: hashedPassword,
        name: 'Admin User',
        role: 'super_admin',
        status: 'active'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Admin user created:', admin.email);

    // Create test property
    const property = await Property.findOneAndUpdate(
      { name: 'Test Building A' },
      {
        name: 'Test Building A',
        address: '123 Main St, Riyadh',
        type: 'commercial',
        size: 5000,
        units: 20,
        tenantId: admin._id,
        status: 'active'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Test property created:', property.name);

    // Create test work order
    const workOrder = await WorkOrder.findOneAndUpdate(
      { workOrderNumber: 'WO-001' },
      {
        workOrderNumber: 'WO-001',
        title: 'AC Maintenance',
        description: 'Regular AC maintenance required',
        property: property._id,
        tenantId: admin._id,
        status: 'open',
        priority: 'medium'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Test work order created:', workOrder.workOrderNumber);

    const isDev = process.env.NODE_ENV === 'development' && !process.env.CI;
    console.log('\n✅ Test data created successfully!');
    console.log('\nTest credentials:');
    console.log('Email: admin@fixzit.co');
    if (isDev) {
      console.log(`Password: ${SEED_PASSWORD} (DEV ONLY)`);
    } else {
      console.log('Password: [REDACTED - check SEED_PASSWORD env var]');
    }

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createTestData();
