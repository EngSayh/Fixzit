// Seed Data for PostgreSQL Fixzit Souq
const { User, Tenant, Property, WorkOrder } = require('../models/postgres');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Check if data already exists
    const existingTenant = await Tenant.findOne();
    if (existingTenant) {
      console.log('📊 Database already contains data, skipping seed...');
      return;
    }

    // Create default tenant
    const tenant = await Tenant.create({
      name: 'Fixzit Solutions',
      domain: 'fixzit.local',
      status: 'active',
      settings: {
        currency: 'SAR',
        language: 'ar',
        timezone: 'Asia/Riyadh',
        workOrderPrefix: 'WO-',
        invoicePrefix: 'INV-'
      },
      subscription: {
        plan: 'enterprise',
        status: 'active',
        features: ['all']
      }
    });

    // Create admin user
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@fixzit.com',
      password: 'admin123',
      role: 'super_admin',
      tenantId: tenant.id,
      phone: '+966501234567',
      language: 'ar',
      status: 'active',
      permissions: [
        { module: 'all', actions: ['create', 'read', 'update', 'delete'] }
      ]
    });

    // Create manager user
    const managerUser = await User.create({
      name: 'Property Manager',
      email: 'manager@fixzit.com',
      password: 'manager123',
      role: 'manager',
      tenantId: tenant.id,
      phone: '+966502345678',
      language: 'ar',
      status: 'active'
    });

    // Create technician user
    const technicianUser = await User.create({
      name: 'Ahmed Al-Saudi',
      email: 'technician@fixzit.com',
      password: 'tech123',
      role: 'technician',
      tenantId: tenant.id,
      phone: '+966503456789',
      language: 'ar',
      status: 'active'
    });

    // Create customer user
    const customerUser = await User.create({
      name: 'Sarah Al-Rashid',
      email: 'customer@fixzit.com',
      password: 'customer123',
      role: 'customer',
      tenantId: tenant.id,
      phone: '+966504567890',
      language: 'ar',
      status: 'active'
    });

    // Create sample properties
    const property1 = await Property.create({
      tenantId: tenant.id,
      name: 'Al-Noor Residential Complex',
      type: 'residential',
      address: {
        street: 'King Fahd Road',
        city: 'Riyadh',
        state: 'Riyadh Province',
        country: 'Saudi Arabia',
        postalCode: '11564',
        coordinates: { lat: 24.7136, lng: 46.6753 }
      },
      ownerId: adminUser.id,
      managerId: managerUser.id,
      units: [
        {
          unitNumber: 'A101',
          type: 'apartment',
          size: 120,
          bedrooms: 2,
          bathrooms: 2,
          rent: 3000,
          status: 'occupied',
          tenantId: customerUser.id
        },
        {
          unitNumber: 'A102',
          type: 'apartment',
          size: 150,
          bedrooms: 3,
          bathrooms: 2,
          rent: 3500,
          status: 'vacant'
        }
      ],
      amenities: ['swimming_pool', 'gym', 'parking', 'security'],
      images: ['property1_main.jpg', 'property1_lobby.jpg']
    });

    const property2 = await Property.create({
      tenantId: tenant.id,
      name: 'Business Center Tower',
      type: 'commercial',
      address: {
        street: 'Olaya Street',
        city: 'Riyadh',
        state: 'Riyadh Province',
        country: 'Saudi Arabia',
        postalCode: '11433',
        coordinates: { lat: 24.6877, lng: 46.7219 }
      },
      ownerId: adminUser.id,
      managerId: managerUser.id,
      units: [
        {
          unitNumber: 'Office-501',
          type: 'office',
          size: 80,
          rent: 5000,
          status: 'occupied'
        }
      ],
      amenities: ['elevator', 'parking', 'security', 'reception']
    });

    // Create sample work orders
    const workOrder1 = await WorkOrder.create({
      tenantId: tenant.id,
      propertyId: property1.id,
      unitNumber: 'A101',
      title: 'Air Conditioning Repair',
      description: 'AC unit not cooling properly in master bedroom',
      category: 'hvac',
      priority: 'high',
      status: 'open',
      requestedById: customerUser.id,
      estimatedCost: 500.00,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      notes: [
        {
          text: 'Customer reports AC running but not cooling',
          author: customerUser.id,
          timestamp: new Date()
        }
      ]
    });

    const workOrder2 = await WorkOrder.create({
      tenantId: tenant.id,
      propertyId: property1.id,
      unitNumber: 'A102',
      title: 'Plumbing Leak Fix',
      description: 'Kitchen sink leaking under cabinet',
      category: 'plumbing',
      priority: 'medium',
      status: 'assigned',
      requestedById: managerUser.id,
      assignedToId: technicianUser.id,
      estimatedCost: 200.00,
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      notes: [
        {
          text: 'Scheduled for Tuesday morning',
          author: managerUser.id,
          timestamp: new Date()
        }
      ]
    });

    const workOrder3 = await WorkOrder.create({
      tenantId: tenant.id,
      propertyId: property2.id,
      unitNumber: 'Office-501',
      title: 'Electrical Outlet Installation',
      description: 'Need additional power outlets for new equipment',
      category: 'electrical',
      priority: 'low',
      status: 'completed',
      requestedById: adminUser.id,
      assignedToId: technicianUser.id,
      estimatedCost: 300.00,
      actualCost: 280.00,
      completedDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      notes: [
        {
          text: 'Work completed successfully',
          author: technicianUser.id,
          timestamp: new Date()
        }
      ]
    });

    console.log('✅ Database seeded successfully!');
    console.log(`🏢 Tenant: ${tenant.name} (${tenant.id})`);
    console.log(`👤 Admin User: ${adminUser.email}`);
    console.log(`👤 Manager User: ${managerUser.email}`);
    console.log(`👤 Technician User: ${technicianUser.email}`);
    console.log(`👤 Customer User: ${customerUser.email}`);
    console.log(`🏠 Properties: ${property1.name}, ${property2.name}`);
    console.log(`🔧 Work Orders: ${workOrder1.id}, ${workOrder2.id}, ${workOrder3.id}`);

    return {
      tenant,
      users: { adminUser, managerUser, technicianUser, customerUser },
      properties: { property1, property2 },
      workOrders: { workOrder1, workOrder2, workOrder3 }
    };

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

module.exports = { seedDatabase };