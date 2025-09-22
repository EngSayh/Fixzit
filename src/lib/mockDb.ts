// Enhanced Mock Database for all models
export class MockDatabase {
  private static instance: MockDatabase;
  private data: Map<string, any[]> = new Map();
  
  private constructor() {
    this.initializeData();
  }
  
  static getInstance() {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }
  
  private initializeData() {
    // CMS Pages
    this.data.set('cmspages', [
      {
        _id: '1',
        slug: 'privacy',
        title: 'Privacy Policy',
        content: `# Privacy Policy

Last updated: ${new Date().toLocaleDateString()}

## Information We Collect

We collect information you provide directly to us, such as when you:
- Create an account
- Use our facility management services
- Contact our support team

## How We Use Your Information

We use the information we collect to:
- Provide and maintain our services
- Process transactions and manage your properties
- Send you technical notices and support messages
- Respond to your requests and provide customer service

## Data Security

We implement appropriate technical and organizational measures to protect your personal information.

## Contact Us

If you have any questions about this Privacy Policy, please contact us at privacy@fixzit.co`,
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '2', 
        slug: 'terms',
        title: 'Terms of Service',
        content: `# Terms of Service

Last updated: ${new Date().toLocaleDateString()}

## Acceptance of Terms

By accessing and using Fixzit Enterprise Platform, you accept and agree to be bound by these Terms of Service.

## Use of Service

You may use our Service only for lawful purposes and in accordance with these Terms.

## User Accounts

You are responsible for:
- Maintaining the confidentiality of your account
- All activities that occur under your account
- Notifying us immediately of any unauthorized use

## Contact Information

For questions about these Terms, contact us at legal@fixzit.co`,
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '3',
        slug: 'about',
        title: 'About Fixzit',
        content: `# About Fixzit

## Our Mission

Fixzit is revolutionizing facility management by combining property operations, maintenance workflows, and procurement into one unified platform.

## What We Do

### Property Management
Complete tools for managing residential and commercial properties.

### Work Order Management
Streamline maintenance requests and track SLAs.

### Marketplace Integration
Access vendors and services directly within your workflow.

## Contact Us

Email: info@fixzit.co
Phone: +966 XX XXX XXXX
Address: Riyadh, Saudi Arabia`,
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    // Help Articles
    this.data.set('helparticles', [
      {
        _id: '1',
        slug: 'getting-started',
        title: 'Getting Started with Fixzit',
        content: `Welcome to Fixzit! This guide will help you get started with our platform.

## Creating Your Account
1. Click "Sign Up" from the homepage
2. Enter your organization details
3. Verify your email address
4. Complete your profile

## First Steps
- Add your first property
- Create your team members
- Set up work order categories
- Configure your preferences`,
        category: 'Getting Started',
        tags: ['basics', 'tutorial'],
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '2',
        slug: 'create-work-order',
        title: 'How to Create a Work Order',
        content: `Creating work orders in Fixzit is simple and efficient.

## Steps to Create a Work Order
1. Navigate to Work Orders from the main menu
2. Click "New Work Order"
3. Fill in the required details
4. Assign to a technician
5. Set priority and SLA
6. Submit the work order

## Tips
- Be descriptive in your issue description
- Attach photos when possible
- Set accurate priority levels`,
        category: 'Work Orders',
        tags: ['work-orders', 'maintenance'],
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '3',
        slug: 'manage-tenants',
        title: 'Managing Tenants',
        content: `Learn how to effectively manage tenants in Fixzit.

## Adding New Tenants
1. Go to Properties > Tenants
2. Click "Add Tenant"
3. Enter tenant information
4. Assign to a unit
5. Set lease terms

## Communication
- Send announcements
- Track requests
- Manage documents`,
        category: 'Property Management',
        tags: ['tenants', 'properties'],
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    // Support Tickets
    this.data.set('supporttickets', []);
    
    // Users with hashed passwords
    this.data.set('users', [
      {
        _id: '1',
        code: 'USR-001',
        username: 'superadmin',
        email: 'superadmin@fixzit.co',
        password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // Admin@123
        personal: {
          firstName: 'System',
          lastName: 'Administrator',
          nationalId: '1234567890',
          dateOfBirth: new Date('1980-01-01'),
          gender: 'Male',
          nationality: 'SA',
          address: {
            street: 'King Fahd Road',
            city: 'Riyadh',
            region: 'Riyadh',
            postalCode: '11564',
            country: 'SA'
          }
        },
        professional: {
          role: 'SUPER_ADMIN',
          title: 'System Administrator',
          department: 'IT',
          skills: []
        },
        security: {
          accessLevel: 'ADMIN',
          permissions: ['*'],
          mfa: {
            enabled: false,
            type: 'EMAIL'
          }
        },
        preferences: {
          notifications: {
            email: true,
            sms: true,
            app: true,
            workOrders: true,
            maintenance: true,
            reports: true
          },
          language: 'en',
          timezone: 'Asia/Riyadh',
          theme: 'LIGHT'
        },
        workload: {
          maxAssignments: 100,
          currentAssignments: 0,
          available: true,
          location: {
            city: 'Riyadh',
            region: 'Riyadh',
            radius: 50
          },
          workingHours: {
            start: '08:00',
            end: '17:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
            timezone: 'Asia/Riyadh'
          }
        },
        status: 'ACTIVE',
        tenantId: 'demo-tenant',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '2',
        code: 'USR-002',
        username: 'admin',
        email: 'admin@fixzit.co',
        password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
        personal: {
          firstName: 'Admin',
          lastName: 'User',
          nationalId: '2345678901',
          dateOfBirth: new Date('1985-01-15'),
          gender: 'Male',
          nationality: 'SA',
          address: {
            street: 'King Abdullah Road',
            city: 'Riyadh',
            region: 'Riyadh',
            postalCode: '11564',
            country: 'SA'
          }
        },
        professional: {
          role: 'ADMIN',
          title: 'Administrator',
          department: 'IT',
          skills: []
        },
        security: {
          accessLevel: 'ADMIN',
          permissions: ['*'],
          mfa: {
            enabled: false,
            type: 'EMAIL'
          }
        },
        preferences: {
          notifications: {
            email: true,
            sms: true,
            app: true,
            workOrders: true,
            maintenance: true,
            reports: true
          },
          language: 'en',
          timezone: 'Asia/Riyadh',
          theme: 'LIGHT'
        },
        workload: {
          maxAssignments: 50,
          currentAssignments: 0,
          available: true,
          location: {
            city: 'Riyadh',
            region: 'Riyadh',
            radius: 25
          },
          workingHours: {
            start: '08:00',
            end: '17:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
            timezone: 'Asia/Riyadh'
          }
        },
        status: 'ACTIVE',
        tenantId: 'demo-tenant',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '3',
        code: 'USR-003',
        username: 'manager',
        email: 'manager@fixzit.co',
        password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
        personal: {
          firstName: 'Property',
          lastName: 'Manager',
          nationalId: '3456789012',
          dateOfBirth: new Date('1982-03-20'),
          gender: 'Male',
          nationality: 'SA',
          address: {
            street: 'Prince Sultan Road',
            city: 'Riyadh',
            region: 'Riyadh',
            postalCode: '12214',
            country: 'SA'
          }
        },
        professional: {
          role: 'PROPERTY_MANAGER',
          title: 'Property Manager',
          department: 'Operations',
          skills: []
        },
        security: {
          accessLevel: 'WRITE',
          permissions: ['properties.*', 'workorders.*', 'tenants.*', 'vendors.read'],
          mfa: {
            enabled: false,
            type: 'SMS'
          }
        },
        preferences: {
          notifications: {
            email: true,
            sms: true,
            app: true,
            workOrders: true,
            maintenance: true,
            reports: true
          },
          language: 'en',
          timezone: 'Asia/Riyadh',
          theme: 'LIGHT'
        },
        workload: {
          maxAssignments: 20,
          currentAssignments: 0,
          available: true,
          location: {
            city: 'Riyadh',
            region: 'Riyadh',
            radius: 15
          },
          workingHours: {
            start: '08:00',
            end: '17:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            timezone: 'Asia/Riyadh'
          }
        },
        status: 'ACTIVE',
        tenantId: 'demo-tenant',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '4',
        code: 'USR-004',
        username: 'tenant',
        email: 'tenant@fixzit.co',
        password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
        personal: {
          firstName: 'Ahmed',
          lastName: 'Al-Rashid',
          nationalId: '4567890123',
          dateOfBirth: new Date('1985-05-15'),
          gender: 'Male',
          nationality: 'SA',
          address: {
            street: 'Olaya Street',
            city: 'Riyadh',
            region: 'Riyadh',
            postalCode: '11622',
            country: 'SA'
          }
        },
        professional: {
          role: 'TENANT',
          title: 'Tenant',
          department: 'Customer',
          skills: []
        },
        security: {
          accessLevel: 'READ',
          permissions: ['properties.read', 'workorders.create', 'workorders.read'],
          mfa: {
            enabled: false,
            type: 'EMAIL'
          }
        },
        preferences: {
          notifications: {
            email: true,
            sms: true,
            app: true,
            workOrders: true,
            maintenance: true,
            reports: false
          },
          language: 'ar',
          timezone: 'Asia/Riyadh',
          theme: 'LIGHT'
        },
        workload: {
          maxAssignments: 0,
          currentAssignments: 0,
          available: false,
          location: {
            city: 'Riyadh',
            region: 'Riyadh',
            radius: 0
          },
          workingHours: {
            start: '08:00',
            end: '17:00',
            days: [],
            timezone: 'Asia/Riyadh'
          }
        },
        status: 'ACTIVE',
        tenantId: 'demo-tenant',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '5',
        code: 'USR-005',
        username: 'vendor',
        email: 'vendor@fixzit.co',
        password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
        personal: {
          firstName: 'Mohammed',
          lastName: 'Al-Harbi',
          nationalId: '3456789012',
          dateOfBirth: new Date('1990-03-20'),
          gender: 'Male',
          nationality: 'SA',
          address: {
            street: 'King Abdullah Road',
            city: 'Riyadh',
            region: 'Riyadh',
            postalCode: '11693',
            country: 'SA'
          }
        },
        professional: {
          role: 'VENDOR',
          title: 'Service Provider',
          department: 'External',
          skills: []
        },
        security: {
          accessLevel: 'WRITE',
          permissions: ['marketplace.*', 'rfqs.read', 'bids.*'],
          mfa: {
            enabled: false,
            type: 'SMS'
          }
        },
        preferences: {
          notifications: {
            email: true,
            sms: true,
            app: true,
            workOrders: false,
            maintenance: false,
            reports: true
          },
          language: 'ar',
          timezone: 'Asia/Riyadh',
          theme: 'LIGHT'
        },
        workload: {
          maxAssignments: 0,
          currentAssignments: 0,
          available: true,
          location: {
            city: 'Riyadh',
            region: 'Riyadh',
            radius: 50
          },
          workingHours: {
            start: '08:00',
            end: '18:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            timezone: 'Asia/Riyadh'
          }
        },
        status: 'ACTIVE',
        tenantId: 'demo-tenant',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '6',
        code: 'USR-006',
        username: 'EMP001',
        email: 'john.doe@fixzit.com',
        password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
        personal: {
          firstName: 'John',
          lastName: 'Doe'
        },
        professional: {
          role: 'PROPERTY_MANAGER'
        },
        status: 'ACTIVE',
        tenantId: 'demo-tenant',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '7',
        code: 'USR-007',
        username: 'EMP002',
        email: 'jane.smith@fixzit.com',
        password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
        personal: {
          firstName: 'Jane',
          lastName: 'Smith'
        },
        professional: {
          role: 'ADMIN'
        },
        status: 'ACTIVE',
        tenantId: 'demo-tenant',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Properties
    this.data.set('properties', [
      {
        _id: '1',
        tenantId: 'demo-tenant',
        code: 'PROP-001',
        name: 'Tower A - Riyadh Business Center',
        description: 'Modern commercial tower in the heart of Riyadh business district',
        type: 'COMMERCIAL',
        subtype: 'Office Building',
        address: {
          street: 'King Fahd Road',
          city: 'Riyadh',
          region: 'Riyadh',
          postalCode: '11564',
          coordinates: { lat: 24.7136, lng: 46.6753 },
          nationalAddress: 'Riyadh 11564',
          district: 'Al Olaya'
        },
        details: {
          totalArea: 50000,
          builtArea: 45000,
          floors: 25,
          parkingSpaces: 200,
          yearBuilt: 2020,
          occupancyRate: 85
        },
        ownership: {
          type: 'OWNED',
          owner: {
            name: 'Riyadh Property Development LLC',
            contact: '+966 50 123 4567',
            id: 'OWN-001'
          }
        },
        features: {
          amenities: ['Gym', 'Conference Rooms', 'Parking', 'Security', 'CCTV', 'Fire Safety'],
          utilities: {
            electricity: 'SEC',
            water: 'NWC',
            gas: 'None',
            internet: 'STC Business'
          },
          accessibility: {
            elevator: true,
            ramp: true,
            parking: true
          }
        },
        tags: ['premium', 'business-center', 'high-rise'],
        createdBy: '1',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        _id: '2',
        tenantId: 'demo-tenant',
        code: 'PROP-002',
        name: 'Residential Complex B',
        description: 'Luxury residential complex with modern amenities',
        type: 'RESIDENTIAL',
        subtype: 'Apartment Complex',
        address: {
          street: 'Prince Sultan Road',
          city: 'Riyadh',
          region: 'Riyadh',
          postalCode: '12214',
          coordinates: { lat: 24.6746, lng: 46.7056 },
          nationalAddress: 'Riyadh 12214',
          district: 'Al Malaz'
        },
        details: {
          totalArea: 25000,
          builtArea: 22000,
          bedrooms: 150,
          bathrooms: 150,
          floors: 12,
          parkingSpaces: 120,
          yearBuilt: 2019,
          occupancyRate: 92
        },
        ownership: {
          type: 'MANAGED',
          owner: {
            name: 'Al-Rashid Real Estate',
            contact: '+966 50 987 6543',
            id: 'OWN-002'
          }
        },
        features: {
          amenities: ['Swimming Pool', 'Gym', 'Playground', 'Security', 'Maintenance'],
          utilities: {
            electricity: 'SEC',
            water: 'NWC',
            gas: 'None',
            internet: 'Mobily'
          },
          accessibility: {
            elevator: true,
            ramp: false,
            parking: true
          }
        },
        tags: ['residential', 'luxury', 'family-friendly'],
        createdBy: '1',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01')
      }
    ]);
  }
  
  getCollection(name: string) {
    if (!this.data.has(name)) {
      this.data.set(name, []);
    }
    return this.data.get(name) || [];
  }
  
  setCollection(name: string, data: any[]) {
    this.data.set(name, data);
  }
}

// Mock model implementation
export class MockModel {
  private collectionName: string;
  private db: MockDatabase;
  
  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.db = MockDatabase.getInstance();
  }
  
  async find(query: any = {}) {
    const data = this.db.getCollection(this.collectionName);
    let results = data;

    if (Object.keys(query).length > 0) {
      results = data.filter(item =>
        Object.entries(query).every(([key, value]) => {
          if (key === '$text' && value && typeof value === 'object' && '$search' in value) {
            // Simple text search
            const searchTerm = (value as any).$search.toLowerCase();
            return JSON.stringify(item).toLowerCase().includes(searchTerm);
          }
          return item[key] === value;
        })
      );
    }

    // Create a mock query object that supports chaining
    const mockQuery = {
      sort: (sortObj: any) => {
        if (sortObj.updatedAt === -1) {
          results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else if (sortObj.createdAt === -1) {
          results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return mockQuery;
      },
      skip: (s: number) => {
        results = results.slice(s);
        return mockQuery;
      },
      limit: (n: number) => {
        results = results.slice(0, n);
        return mockQuery;
      },
      lean: () => Promise.resolve(results),
      exec: () => Promise.resolve(results)
    };

    return mockQuery;
  }
  
  async findOne(query: any) {
    const data = this.db.getCollection(this.collectionName);
    const result = data.find(item =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    );
    
    // Return the result directly since we're already in mock mode
    return result;
  }
  
  async findOneAndUpdate(query: any, update: any, options: any = {}) {
    const data = this.db.getCollection(this.collectionName);
    const index = data.findIndex(item =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    );
    
    if (index >= 0 || options.upsert) {
      const doc = index >= 0 ? data[index] : { ...query, _id: Math.random().toString(36) };
      const updated = { ...doc, ...update.$set, updatedAt: new Date() };
      
      if (index >= 0) {
        data[index] = updated;
      } else {
        data.push(updated);
      }
      
      this.db.setCollection(this.collectionName, data);
      return Promise.resolve(options.new ? updated : doc);
    }
    
    return Promise.resolve(null);
  }
  
  async findById(id: string) {
    const data = this.db.getCollection(this.collectionName);
    const result = data.find(item => item._id === id);
    
    if (result) {
      // Return an object with save method for compatibility
      return {
        ...result,
        save: async () => {
          const index = data.findIndex(item => item._id === id);
          if (index >= 0) {
            data[index] = result;
            this.db.setCollection(this.collectionName, data);
          }
          return result;
        }
      };
    }
    
    return null;
  }
  
  async findByIdAndUpdate(id: string, update: any, options: any = {}) {
    const data = this.db.getCollection(this.collectionName);
    const index = data.findIndex(item => item._id === id);
    
    if (index >= 0) {
      const updated = { ...data[index], ...update.$set, updatedAt: new Date() };
      data[index] = updated;
      this.db.setCollection(this.collectionName, data);
      return Promise.resolve(updated);
    }
    
    return Promise.resolve(null);
  }
  
  async create(doc: any) {
    const data = this.db.getCollection(this.collectionName);
    const newDoc = { 
      ...doc, 
      _id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Handle nested objects properly
    if (doc.messages) {
      newDoc.messages = doc.messages.map((msg: any) => ({
        ...msg,
        at: msg.at || new Date()
      }));
    }
    
    data.push(newDoc);
    this.db.setCollection(this.collectionName, data);
    return Promise.resolve(newDoc);
  }
  
  async countDocuments(query: any = {}) {
    const data = this.db.getCollection(this.collectionName);
    
    if (Object.keys(query).length === 0) {
      return Promise.resolve(data.length);
    }
    
    const count = data.filter(item =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ).length;
    
    return Promise.resolve(count);
  }
}
