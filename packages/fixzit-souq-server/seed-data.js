const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const Property = require('./models/Property');
const WorkOrder = require('./models/WorkOrder');
const Employee = require('./models/Employee');
const Customer = require('./models/Customer');
const SupportTicket = require('./models/SupportTicket');
const MarketplaceItem = require('./models/MarketplaceItem');
const ComplianceDoc = require('./models/ComplianceDoc');
const AnalyticsMetric = require('./models/AnalyticsMetric');
const FinanceMetric = require('./models/FinanceMetric');
const SystemSetting = require('./models/SystemSetting');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await Property.deleteMany({});
    await WorkOrder.deleteMany({});
    await Employee.deleteMany({});
    await Customer.deleteMany({});
    await SupportTicket.deleteMany({});
    await MarketplaceItem.deleteMany({});
    await ComplianceDoc.deleteMany({});
    await AnalyticsMetric.deleteMany({});
    await FinanceMetric.deleteMany({});
    await SystemSetting.deleteMany({});

    console.log('🗑️ Cleared existing data');

    // Create sample properties
    const properties = await Property.insertMany([
      {
        name: 'Central Business Tower',
        address: 'King Fahd Road, Riyadh',
        type: 'commercial',
        units: 50,
        occupancyRate: 85,
        monthlyRevenueSar: 250000,
        city: 'Riyadh',
        country: 'Saudi Arabia'
      },
      {
        name: 'Al-Nakheel Residential Complex',
        address: 'Prince Mohammed bin Salman Road, Jeddah',
        type: 'residential',
        units: 120,
        occupancyRate: 92,
        monthlyRevenueSar: 180000,
        city: 'Jeddah',
        country: 'Saudi Arabia'
      },
      {
        name: 'Industrial Zone Warehouse',
        address: 'Dammam Industrial City',
        type: 'industrial',
        units: 25,
        occupancyRate: 78,
        monthlyRevenueSar: 95000,
        city: 'Dammam',
        country: 'Saudi Arabia'
      }
    ]);

    console.log('🏢 Created sample properties');

    // Create sample work orders
    const workOrders = await WorkOrder.insertMany([
      {
        code: 'WO-2025-001',
        title: 'HVAC Maintenance - Floor 15',
        description: 'Regular maintenance of HVAC system on floor 15',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        property: properties[0]._id,
        assignedTo: 'Ahmed Al-Rashid'
      },
      {
        code: 'WO-2025-002',
        title: 'Elevator Repair - Building A',
        description: 'Elevator not working properly, needs inspection',
        priority: 'HIGH',
        status: 'NEW',
        property: properties[1]._id,
        assignedTo: 'Mohammed Al-Sayed'
      },
      {
        code: 'WO-2025-003',
        title: 'Plumbing Issue - Unit 45',
        description: 'Water leak in unit 45, urgent repair needed',
        priority: 'HIGH',
        status: 'COMPLETED',
        property: properties[1]._id,
        assignedTo: 'Omar Al-Hassan'
      }
    ]);

    console.log('🔧 Created sample work orders');

    // Create sample employees
    const employees = await Employee.insertMany([
      {
        name: 'Ahmed Al-Rashid',
        email: 'ahmed.rashid@fixzit.com',
        position: 'Senior Technician',
        department: 'Maintenance',
        salary: 8500,
        hireDate: new Date('2023-01-15'),
        isActive: true
      },
      {
        name: 'Fatima Al-Zahra',
        email: 'fatima.zahra@fixzit.com',
        position: 'Property Manager',
        department: 'Operations',
        salary: 12000,
        hireDate: new Date('2022-06-01'),
        isActive: true
      },
      {
        name: 'Khalid Al-Mansouri',
        email: 'khalid.mansouri@fixzit.com',
        position: 'Finance Manager',
        department: 'Finance',
        salary: 15000,
        hireDate: new Date('2021-03-10'),
        isActive: true
      }
    ]);

    console.log('👥 Created sample employees');

    // Create sample customers
    const customers = await Customer.insertMany([
      {
        name: 'Saudi Real Estate Company',
        email: 'info@sre.com.sa',
        phone: '+966501234567',
        company: 'Saudi Real Estate Co.',
        address: 'King Abdullah Road, Riyadh',
        type: 'corporate',
        isActive: true
      },
      {
        name: 'Mohammed Al-Sheikh',
        email: 'm.sheikh@email.com',
        phone: '+966507654321',
        company: 'Al-Sheikh Trading',
        address: 'Prince Faisal Street, Jeddah',
        type: 'individual',
        isActive: true
      }
    ]);

    console.log('👤 Created sample customers');

    // Create sample support tickets
    const supportTickets = await SupportTicket.insertMany([
      {
        ticketNumber: 'ST-2025-001',
        title: 'Internet connectivity issue',
        description: 'Tenant reporting slow internet in unit 15',
        priority: 'MEDIUM',
        status: 'OPEN',
        customer: customers[0]._id,
        assignedTo: 'IT Support Team',
        createdAt: new Date()
      },
      {
        ticketNumber: 'ST-2025-002',
        title: 'Parking space complaint',
        description: 'Resident complaining about unauthorized parking',
        priority: 'LOW',
        status: 'IN_PROGRESS',
        customer: customers[1]._id,
        assignedTo: 'Security Team',
        createdAt: new Date()
      }
    ]);

    console.log('🎫 Created sample support tickets');

    // Create sample marketplace items
    const marketplaceItems = await MarketplaceItem.insertMany([
      {
        name: 'HVAC Maintenance Service',
        description: 'Professional HVAC maintenance and repair services',
        price: 500,
        currency: 'SAR',
        category: 'Maintenance',
        vendor: 'CoolTech Solutions',
        isActive: true,
        rating: 4.5,
        reviewCount: 12
      },
      {
        name: 'Cleaning Services Package',
        description: 'Complete cleaning services for commercial properties',
        price: 1200,
        currency: 'SAR',
        category: 'Cleaning',
        vendor: 'CleanPro Services',
        isActive: true,
        rating: 4.8,
        reviewCount: 25
      }
    ]);

    console.log('🛒 Created sample marketplace items');

    // Create sample compliance documents
    const complianceDocs = await ComplianceDoc.insertMany([
      {
        title: 'Fire Safety Certificate',
        description: 'Annual fire safety inspection certificate',
        type: 'certificate',
        expiryDate: new Date('2025-12-31'),
        status: 'valid',
        property: properties[0]._id,
        uploadedBy: 'Safety Inspector',
        uploadedAt: new Date()
      },
      {
        title: 'Building Insurance Policy',
        description: 'Property insurance policy document',
        type: 'insurance',
        expiryDate: new Date('2025-06-30'),
        status: 'valid',
        property: properties[1]._id,
        uploadedBy: 'Insurance Agent',
        uploadedAt: new Date()
      }
    ]);

    console.log('📋 Created sample compliance documents');

    // Create sample analytics metrics
    const analyticsMetrics = await AnalyticsMetric.insertMany([
      {
        metric: 'property_occupancy',
        value: 85.5,
        unit: 'percentage',
        date: new Date(),
        property: properties[0]._id
      },
      {
        metric: 'maintenance_requests',
        value: 12,
        unit: 'count',
        date: new Date(),
        property: properties[1]._id
      },
      {
        metric: 'tenant_satisfaction',
        value: 4.2,
        unit: 'rating',
        date: new Date(),
        property: properties[0]._id
      }
    ]);

    console.log('📊 Created sample analytics metrics');

    // Create sample finance metrics
    const financeMetrics = await FinanceMetric.insertMany([
      {
        metric: 'monthly_revenue',
        value: 250000,
        currency: 'SAR',
        date: new Date(),
        property: properties[0]._id
      },
      {
        metric: 'operating_expenses',
        value: 45000,
        currency: 'SAR',
        date: new Date(),
        property: properties[0]._id
      },
      {
        metric: 'net_profit',
        value: 205000,
        currency: 'SAR',
        date: new Date(),
        property: properties[0]._id
      }
    ]);

    console.log('💰 Created sample finance metrics');

    // Create system settings
    const systemSettings = await SystemSetting.insertMany([
      {
        key: 'company_name',
        value: 'FIXZIT SOUQ Enterprise',
        type: 'string',
        description: 'Company name displayed in the system'
      },
      {
        key: 'default_currency',
        value: 'SAR',
        type: 'string',
        description: 'Default currency for financial calculations'
      },
      {
        key: 'maintenance_alert_days',
        value: '7',
        type: 'number',
        description: 'Days before maintenance due date to send alerts'
      }
    ]);

    console.log('⚙️ Created system settings');

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Created:`);
    console.log(`   - ${properties.length} properties`);
    console.log(`   - ${workOrders.length} work orders`);
    console.log(`   - ${employees.length} employees`);
    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${supportTickets.length} support tickets`);
    console.log(`   - ${marketplaceItems.length} marketplace items`);
    console.log(`   - ${complianceDocs.length} compliance documents`);
    console.log(`   - ${analyticsMetrics.length} analytics metrics`);
    console.log(`   - ${financeMetrics.length} finance metrics`);
    console.log(`   - ${systemSettings.length} system settings`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

module.exports = { seedDatabase };