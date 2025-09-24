#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit-enterprise';

async function setupDatabase() {
  console.log('🚀 Setting up Fixzit Enterprise Database...\n');
  
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Create collections with validation schemas
    console.log('\n📦 Creating collections...');
    
    // Users collection
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'password', 'role', 'status'],
          properties: {
            email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
            password: { bsonType: 'string' },
            role: { enum: ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN', 'EMPLOYEE', 'TECHNICIAN', 'VENDOR', 'CUSTOMER', 'OWNER', 'SUPPORT', 'PROCUREMENT', 'AUDITOR'] },
            status: { enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] }
          }
        }
      }
    }).catch(() => console.log('Users collection already exists'));
    
    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ employeeNumber: 1 }, { sparse: true, unique: true });
    
    // Create other collections
    const collections = [
      'properties', 'workorders', 'assets', 'tenants', 'vendors', 
      'projects', 'rfqs', 'invoices', 'products', 'carts', 'orders',
      'notifications', 'tickets', 'articles', 'cms_pages'
    ];
    
    for (const collection of collections) {
      await db.createCollection(collection).catch(() => console.log(`${collection} collection already exists`));
    }
    
    console.log('✅ Collections created\n');
    
    // Seed initial users
    console.log('👥 Creating initial users...');
    
    const users = [
      {
        email: 'superadmin@fixzit.co',
        employeeNumber: 'EMP-001',
        password: await bcrypt.hash('Admin@123', 10),
        role: 'SUPER_ADMIN',
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+966501234567',
        status: 'ACTIVE',
        tenantId: 'system',
        modules: ['all'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'admin@fixzit.co',
        employeeNumber: 'EMP-002',
        password: await bcrypt.hash('Admin@123', 10),
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+966502345678',
        status: 'ACTIVE',
        tenantId: 'tenant-001',
        modules: ['dashboard', 'work-orders', 'properties', 'finance', 'hr', 'crm', 'marketplace', 'support', 'compliance', 'reports'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'manager@fixzit.co',
        employeeNumber: 'EMP-003',
        password: await bcrypt.hash('Manager@123', 10),
        role: 'PROPERTY_MANAGER',
        firstName: 'Property',
        lastName: 'Manager',
        phone: '+966503456789',
        status: 'ACTIVE',
        tenantId: 'tenant-001',
        modules: ['dashboard', 'work-orders', 'properties', 'tenants', 'maintenance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'tenant@fixzit.co',
        employeeNumber: 'EMP-004',
        password: await bcrypt.hash('Tenant@123', 10),
        role: 'TENANT',
        firstName: 'John',
        lastName: 'Tenant',
        phone: '+966504567890',
        status: 'ACTIVE',
        tenantId: 'tenant-001',
        propertyId: 'prop-001',
        unitId: 'unit-001',
        modules: ['dashboard', 'requests', 'payments', 'documents'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'vendor@fixzit.co',
        employeeNumber: 'VEND-001',
        password: await bcrypt.hash('Vendor@123', 10),
        role: 'VENDOR',
        firstName: 'Vendor',
        lastName: 'Company',
        companyName: 'Fixzit Supplies Co.',
        phone: '+966505678901',
        status: 'ACTIVE',
        tenantId: 'vendor-001',
        modules: ['dashboard', 'products', 'orders', 'rfqs', 'invoices'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'technician@fixzit.co',
        employeeNumber: 'TECH-001',
        password: await bcrypt.hash('Tech@123', 10),
        role: 'TECHNICIAN',
        firstName: 'Ahmed',
        lastName: 'Technician',
        phone: '+966506789012',
        status: 'ACTIVE',
        tenantId: 'tenant-001',
        skills: ['HVAC', 'Plumbing', 'Electrical'],
        modules: ['dashboard', 'work-orders', 'schedule'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert users (skip if exists)
    for (const user of users) {
      try {
        await db.collection('users').insertOne(user);
        console.log(`✅ Created user: ${user.email}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  User ${user.email} already exists`);
        } else {
          console.error(`❌ Error creating user ${user.email}:`, error.message);
        }
      }
    }
    
    // Seed initial properties
    console.log('\n🏢 Creating sample properties...');
    
    const properties = [
      {
        _id: 'prop-001',
        name: 'Tower A - Downtown',
        type: 'COMMERCIAL',
        address: {
          street: '123 King Fahd Road',
          city: 'Riyadh',
          country: 'Saudi Arabia',
          postalCode: '11564',
          coordinates: { lat: 24.7136, lng: 46.6753 }
        },
        totalUnits: 50,
        occupiedUnits: 42,
        totalArea: 5000,
        yearBuilt: 2018,
        amenities: ['Parking', 'Security', 'Gym', 'Pool'],
        status: 'ACTIVE',
        managerId: 'EMP-003',
        tenantId: 'tenant-001',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'prop-002',
        name: 'Villa Complex - North',
        type: 'RESIDENTIAL',
        address: {
          street: '456 Prince Sultan Street',
          city: 'Jeddah',
          country: 'Saudi Arabia',
          postalCode: '21532',
          coordinates: { lat: 21.5169, lng: 39.2192 }
        },
        totalUnits: 20,
        occupiedUnits: 18,
        totalArea: 3000,
        yearBuilt: 2020,
        amenities: ['Garden', 'Playground', 'Security'],
        status: 'ACTIVE',
        managerId: 'EMP-003',
        tenantId: 'tenant-001',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    for (const property of properties) {
      try {
        await db.collection('properties').insertOne(property);
        console.log(`✅ Created property: ${property.name}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  Property ${property.name} already exists`);
        }
      }
    }
    
    // Seed sample products for marketplace
    console.log('\n🛍️ Creating sample products...');
    
    const products = [
      {
        name: 'Industrial Air Conditioner',
        description: 'Heavy-duty AC unit for commercial buildings',
        category: 'HVAC',
        price: 8500,
        currency: 'SAR',
        stock: 15,
        vendorId: 'vendor-001',
        images: ['/images/products/ac-unit.jpg'],
        specifications: {
          capacity: '5 Ton',
          type: 'Split',
          energyRating: 'A++'
        },
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'LED Panel Light 60x60',
        description: 'Energy-efficient LED panel for office spaces',
        category: 'Lighting',
        price: 120,
        currency: 'SAR',
        stock: 250,
        vendorId: 'vendor-001',
        images: ['/images/products/led-panel.jpg'],
        specifications: {
          wattage: '40W',
          color: '6500K',
          lumens: '4000lm'
        },
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Fire Extinguisher ABC 6kg',
        description: 'Multi-purpose fire extinguisher',
        category: 'Safety',
        price: 185,
        currency: 'SAR',
        stock: 100,
        vendorId: 'vendor-001',
        images: ['/images/products/fire-ext.jpg'],
        specifications: {
          type: 'ABC Powder',
          capacity: '6kg',
          certification: 'SASO'
        },
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    for (const product of products) {
      try {
        await db.collection('products').insertOne(product);
        console.log(`✅ Created product: ${product.name}`);
      } catch (error) {
        console.log(`⚠️  Product might already exist: ${product.name}`);
      }
    }
    
    // Create sample work orders
    console.log('\n🔧 Creating sample work orders...');
    
    const workOrders = [
      {
        code: 'WO-2025-001',
        title: 'AC not cooling - Office 1204',
        description: 'Air conditioning unit not providing cool air',
        category: 'HVAC',
        priority: 'HIGH',
        status: 'OPEN',
        propertyId: 'prop-001',
        unitId: 'unit-1204',
        reportedBy: 'tenant@fixzit.co',
        assignedTo: 'technician@fixzit.co',
        tenantId: 'tenant-001',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        code: 'WO-2025-002',
        title: 'Water leak in bathroom',
        description: 'Water dripping from ceiling in master bathroom',
        category: 'Plumbing',
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        propertyId: 'prop-002',
        unitId: 'villa-09',
        reportedBy: 'tenant@fixzit.co',
        assignedTo: 'technician@fixzit.co',
        tenantId: 'tenant-001',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    for (const workOrder of workOrders) {
      try {
        await db.collection('workorders').insertOne(workOrder);
        console.log(`✅ Created work order: ${workOrder.code}`);
      } catch (error) {
        console.log(`⚠️  Work order might already exist: ${workOrder.code}`);
      }
    }
    
    console.log('\n✅ Database setup complete!');
    console.log('\n📌 Test Credentials:');
    console.log('   Super Admin: superadmin@fixzit.co / Admin@123');
    console.log('   Admin: admin@fixzit.co / Admin@123');
    console.log('   Manager: manager@fixzit.co / Manager@123');
    console.log('   Tenant: tenant@fixzit.co / Tenant@123');
    console.log('   Vendor: vendor@fixzit.co / Vendor@123');
    console.log('   Technician: technician@fixzit.co / Tech@123');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.log('\n💡 Make sure MongoDB is running:');
    console.log('   - On Windows: mongod');
    console.log('   - On Mac: brew services start mongodb-community');
    console.log('   - On Linux: sudo systemctl start mongod');
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run setup
setupDatabase();
