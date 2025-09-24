// Comprehensive database seeding script
// Populates the system with real data for all modules

import { MongoClient } from 'mongodb';
import { Role } from '../src/lib/rbac-comprehensive';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit-enterprise';

interface User {
  _id?: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  phone?: string;
  phoneVerified?: boolean;
  kycVerified?: boolean;
  falVerified?: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

interface Tenant {
  _id?: string;
  name: string;
  slug: string;
  subscription: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  createdAt: Date;
  updatedAt: Date;
}

interface Property {
  _id?: string;
  tenantId: string;
  title: string;
  description: string;
  type: 'sale' | 'rent' | 'commercial';
  price: number;
  currency: string;
  location: {
    city: string;
    district: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    address: string;
  };
  specifications: {
    bedrooms: number;
    bathrooms: number;
    area: number;
    features: string[];
  };
  images: Array<{
    url: string;
    isWatermarked: boolean;
    isVerified: boolean;
  }>;
  agent: {
    userId: string;
    name: string;
    company: string;
    contactMasked: {
      phone: string;
      email: string;
    };
    isVerified: boolean;
    falNumber?: string;
  };
  verification: {
    isVerified: boolean;
    verifiedAt?: Date;
    verificationType: 'FAL' | 'Ejar' | 'Manual';
  };
  visibility: {
    isPublic: boolean;
    coarseGeoOnlyUntilAuth: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Material {
  _id?: string;
  tenantId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  unit: string;
  images: Array<{
    url: string;
    isWatermarked: boolean;
  }>;
  vendor: {
    userId: string;
    name: string;
    contactMasked: {
      phone: string;
      email: string;
    };
    isVerified: boolean;
  };
  specifications: Record<string, any>;
  availability: {
    inStock: boolean;
    quantity: number;
  };
  rating: {
    average: number;
    count: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await db.collection('tenants').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('properties').deleteMany({});
    await db.collection('materials').deleteMany({});
    await db.collection('workOrders').deleteMany({});
    await db.collection('invoices').deleteMany({});
    
    console.log('Cleared existing data');
    
    // Create tenants
    const tenants: Tenant[] = [
      {
        name: 'Fixzit Enterprise',
        slug: 'fixzit-enterprise',
        subscription: 'ENTERPRISE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Al-Rashid Properties',
        slug: 'al-rashid-properties',
        subscription: 'PROFESSIONAL',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Construction Supplies Co',
        slug: 'construction-supplies',
        subscription: 'PROFESSIONAL',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const tenantResult = await db.collection('tenants').insertMany(tenants);
    const tenantIds = Object.values(tenantResult.insertedIds);
    
    console.log('Created tenants:', tenantIds.length);
    
    // Create users
    const users: User[] = [
      {
        email: 'admin@fixzit.co',
        name: 'Fixzit Admin',
        role: 'SUPER_ADMIN',
        tenantId: tenantIds[0].toString(),
        phone: '+966501234567',
        phoneVerified: true,
        kycVerified: true,
        falVerified: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      },
      {
        email: 'ahmed@alrashid.com',
        name: 'Ahmed Al-Rashid',
        role: 'BROKER_AGENT',
        tenantId: tenantIds[1].toString(),
        phone: '+966501234568',
        phoneVerified: true,
        kycVerified: true,
        falVerified: true,
        createdAt: new Date(),
        lastLoginAt: new Date()
      },
      {
        email: 'sara@constructionsupplies.com',
        name: 'Sara Al-Mansouri',
        role: 'VENDOR',
        tenantId: tenantIds[2].toString(),
        phone: '+966501234569',
        phoneVerified: true,
        kycVerified: true,
        falVerified: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      },
      {
        email: 'guest@example.com',
        name: 'Guest User',
        role: 'GUEST',
        tenantId: tenantIds[0].toString(),
        createdAt: new Date()
      }
    ];
    
    const userResult = await db.collection('users').insertMany(users);
    const userIds = Object.values(userResult.insertedIds);
    
    console.log('Created users:', userIds.length);
    
    // Create properties
    const properties: Property[] = [
      {
        tenantId: tenantIds[1].toString(),
        title: 'Luxury Villa - Al Olaya',
        description: 'Beautiful luxury villa in prime location with modern amenities and stunning views.',
        type: 'sale',
        price: 3500000,
        currency: 'SAR',
        location: {
          city: 'Riyadh',
          district: 'Al Olaya',
          coordinates: { lat: 24.7136, lng: 46.6753 },
          address: 'Al Olaya District, Riyadh'
        },
        specifications: {
          bedrooms: 5,
          bathrooms: 6,
          area: 450,
          features: ['Swimming Pool', 'Garden', 'Garage', 'Security', 'Maid Room']
        },
        images: [
          {
            url: '/api/placeholder/400/250',
            isWatermarked: true,
            isVerified: true
          }
        ],
        agent: {
          userId: userIds[1].toString(),
          name: 'Ahmed Al-Rashid',
          company: 'Premium Properties Ltd',
          contactMasked: {
            phone: '+966 50 *** ****',
            email: 'a***@premiumproperties.com'
          },
          isVerified: true,
          falNumber: 'RE123456'
        },
        verification: {
          isVerified: true,
          verifiedAt: new Date(),
          verificationType: 'FAL'
        },
        visibility: {
          isPublic: true,
          coarseGeoOnlyUntilAuth: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: tenantIds[1].toString(),
        title: 'Modern Apartment - Downtown',
        description: 'Contemporary apartment in the heart of Riyadh with city views.',
        type: 'rent',
        price: 8500,
        currency: 'SAR',
        location: {
          city: 'Riyadh',
          district: 'King Fahd Road',
          coordinates: { lat: 24.7136, lng: 46.6753 },
          address: 'King Fahd Road, Riyadh'
        },
        specifications: {
          bedrooms: 2,
          bathrooms: 2,
          area: 120,
          features: ['City View', 'Balcony', 'Parking', 'Gym Access']
        },
        images: [
          {
            url: '/api/placeholder/400/250',
            isWatermarked: true,
            isVerified: true
          }
        ],
        agent: {
          userId: userIds[1].toString(),
          name: 'Ahmed Al-Rashid',
          company: 'Premium Properties Ltd',
          contactMasked: {
            phone: '+966 50 *** ****',
            email: 'a***@premiumproperties.com'
          },
          isVerified: true,
          falNumber: 'RE123456'
        },
        verification: {
          isVerified: true,
          verifiedAt: new Date(),
          verificationType: 'FAL'
        },
        visibility: {
          isPublic: true,
          coarseGeoOnlyUntilAuth: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const propertyResult = await db.collection('properties').insertMany(properties);
    console.log('Created properties:', propertyResult.insertedCount);
    
    // Create materials
    const materials: Material[] = [
      {
        tenantId: tenantIds[2].toString(),
        title: 'Premium Cement - 50kg Bag',
        description: 'High-quality Portland cement for construction projects. Meets Saudi standards.',
        category: 'Construction Materials',
        subcategory: 'Cement',
        price: 25,
        currency: 'SAR',
        unit: 'bag',
        images: [
          {
            url: '/api/placeholder/300/300',
            isWatermarked: true
          }
        ],
        vendor: {
          userId: userIds[2].toString(),
          name: 'Sara Al-Mansouri',
          contactMasked: {
            phone: '+966 50 *** ****',
            email: 's***@constructionsupplies.com'
          },
          isVerified: true
        },
        specifications: {
          weight: '50kg',
          type: 'Portland Cement',
          grade: '42.5N',
          color: 'Gray',
          strength: 'High'
        },
        availability: {
          inStock: true,
          quantity: 1000
        },
        rating: {
          average: 4.5,
          count: 127
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: tenantIds[2].toString(),
        title: 'Steel Rebar - 12mm',
        description: 'High-grade steel reinforcement bars for concrete structures.',
        category: 'Construction Materials',
        subcategory: 'Steel',
        price: 15,
        currency: 'SAR',
        unit: 'meter',
        images: [
          {
            url: '/api/placeholder/300/300',
            isWatermarked: true
          }
        ],
        vendor: {
          userId: userIds[2].toString(),
          name: 'Sara Al-Mansouri',
          contactMasked: {
            phone: '+966 50 *** ****',
            email: 's***@constructionsupplies.com'
          },
          isVerified: true
        },
        specifications: {
          diameter: '12mm',
          length: '12m',
          grade: 'B500B',
          surface: 'Ribbed'
        },
        availability: {
          inStock: true,
          quantity: 500
        },
        rating: {
          average: 4.7,
          count: 89
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const materialResult = await db.collection('materials').insertMany(materials);
    console.log('Created materials:', materialResult.insertedCount);
    
    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ tenantId: 1 });
    await db.collection('properties').createIndex({ tenantId: 1 });
    await db.collection('properties').createIndex({ 'location.city': 1 });
    await db.collection('properties').createIndex({ type: 1 });
    await db.collection('properties').createIndex({ price: 1 });
    await db.collection('materials').createIndex({ tenantId: 1 });
    await db.collection('materials').createIndex({ category: 1 });
    await db.collection('materials').createIndex({ subcategory: 1 });
    await db.collection('materials').createIndex({ price: 1 });
    
    console.log('Created database indexes');
    
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.close();
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };