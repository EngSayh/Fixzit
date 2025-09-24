const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { AqarListing } = require('../src/server/models/AqarListing');
const { AqarSavedSearch } = require('../src/server/models/AqarSavedSearch');
const { AqarLead } = require('../src/server/models/AqarLead');
const { Property } = require('../src/server/models/Property');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';

const sampleProperties = [
  {
    tenantId: 'default',
    code: 'PROP-001',
    name: 'فيلا فاخرة في حي النرجس',
    type: 'RESIDENTIAL',
    subtype: 'Villa',
    address: {
      street: 'شارع الملك فهد',
      city: 'الرياض',
      region: 'منطقة الرياض',
      postalCode: '12345',
      country: 'SA',
      coordinates: { lat: 24.7136, lng: 46.6753 },
      district: 'النرجس'
    },
    details: {
      totalArea: 450,
      builtArea: 380,
      bedrooms: 5,
      bathrooms: 4,
      floors: 2,
      parkingSpaces: 3,
      yearBuilt: 2020
    },
    financial: {
      currentValue: 1200000,
      monthlyRent: 8000
    },
    features: {
      amenities: ['Pool', 'Gym', 'Security', 'Garden'],
      utilities: {
        electricity: 'Connected',
        water: 'Connected',
        gas: 'Connected',
        internet: 'Fiber'
      }
    },
    createdBy: 'system'
  },
  {
    tenantId: 'default',
    code: 'PROP-002',
    name: 'شقة حديثة في حي العليا',
    type: 'RESIDENTIAL',
    subtype: 'Apartment',
    address: {
      street: 'شارع العليا',
      city: 'الرياض',
      region: 'منطقة الرياض',
      postalCode: '12346',
      country: 'SA',
      coordinates: { lat: 24.7236, lng: 46.6853 },
      district: 'العليا'
    },
    details: {
      totalArea: 120,
      builtArea: 100,
      bedrooms: 2,
      bathrooms: 2,
      floors: 1,
      parkingSpaces: 1,
      yearBuilt: 2022
    },
    financial: {
      currentValue: 450000,
      monthlyRent: 3500
    },
    features: {
      amenities: ['Elevator', 'Security', 'Gym'],
      utilities: {
        electricity: 'Connected',
        water: 'Connected',
        gas: 'Connected',
        internet: 'Fiber'
      }
    },
    createdBy: 'system'
  },
  {
    tenantId: 'default',
    code: 'PROP-003',
    name: 'أرض سكنية في حي الملز',
    type: 'LAND',
    subtype: 'Residential Land',
    address: {
      street: 'شارع الملك عبدالعزيز',
      city: 'الرياض',
      region: 'منطقة الرياض',
      postalCode: '12347',
      country: 'SA',
      coordinates: { lat: 24.7036, lng: 46.6653 },
      district: 'الملز'
    },
    details: {
      totalArea: 1000,
      builtArea: 0,
      bedrooms: 0,
      bathrooms: 0,
      floors: 0,
      parkingSpaces: 0,
      yearBuilt: null
    },
    financial: {
      currentValue: 800000,
      monthlyRent: 0
    },
    features: {
      amenities: [],
      utilities: {
        electricity: 'Available',
        water: 'Available',
        gas: 'Available',
        internet: 'Available'
      }
    },
    createdBy: 'system'
  }
];

const sampleListings = [
  {
    tenantId: 'default',
    title: 'فيلا فاخرة للبيع في حي النرجس - 5 غرف نوم',
    description: 'فيلا فاخرة ومفروشة بالكامل في موقع مميز بحي النرجس. تتكون من 5 غرف نوم و4 دورات مياه وصالة واسعة ومطبخ مجهز. تحتوي على حديقة خاصة ومسبح وموقفين للسيارات. قريبة من المدارس والمستشفيات والمراكز التجارية.',
    purpose: 'sale',
    propertyType: 'villa',
    price: {
      amount: 1200000,
      currency: 'SAR',
      period: 'total'
    },
    specifications: {
      area: 450,
      bedrooms: 5,
      bathrooms: 4,
      livingRooms: 2,
      floors: 2,
      age: 'new',
      furnished: true,
      parking: 3,
      balcony: true,
      garden: true,
      pool: true,
      gym: true,
      security: true,
      elevator: false,
      maidRoom: true
    },
    location: {
      lat: 24.7136,
      lng: 46.6753,
      address: 'شارع الملك فهد، حي النرجس',
      city: 'الرياض',
      district: 'النرجس',
      neighborhood: 'النرجس الشمالي',
      postalCode: '12345'
    },
    media: [
      {
        url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
        alt: 'فيلا فاخرة للبيع',
        type: 'image',
        isCover: true
      },
      {
        url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        alt: 'غرفة المعيشة',
        type: 'image',
        isCover: false
      },
      {
        url: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
        alt: 'المطبخ',
        type: 'image',
        isCover: false
      }
    ],
    contact: {
      name: 'أحمد محمد العتيبي',
      phone: '+966501234567',
      whatsapp: '+966501234567',
      email: 'ahmed@example.com',
      company: 'شركة العقارات المتميزة',
      licenseNumber: 'REGA-12345',
      isVerified: true
    },
    isVerified: true,
    isFeatured: true,
    isPremium: false,
    license: {
      number: 'REGA-12345',
      expiryDate: new Date('2025-12-31'),
      source: 'REGA',
      isValid: true
    },
    keywords: ['فيلا', 'للبيع', 'النرجس', 'مفروش', 'مسبح', 'حديقة'],
    tags: ['فاخر', 'مفروش', 'مسبح', 'حديقة', 'موقف سيارات'],
    createdBy: 'system'
  },
  {
    tenantId: 'default',
    title: 'شقة حديثة للإيجار في حي العليا - 2 غرفة نوم',
    description: 'شقة حديثة ومفروشة جزئياً في موقع مميز بحي العليا. تتكون من غرفتين نوم ودورتي مياه وصالة ومطبخ مجهز. تحتوي على بلكونة وموقف سيارة واحد. قريبة من المترو والمراكز التجارية والمطاعم.',
    purpose: 'rent',
    propertyType: 'apartment',
    price: {
      amount: 3500,
      currency: 'SAR',
      period: 'monthly'
    },
    specifications: {
      area: 120,
      bedrooms: 2,
      bathrooms: 2,
      livingRooms: 1,
      floors: 1,
      age: 'new',
      furnished: false,
      parking: 1,
      balcony: true,
      garden: false,
      pool: false,
      gym: true,
      security: true,
      elevator: true,
      maidRoom: false
    },
    location: {
      lat: 24.7236,
      lng: 46.6853,
      address: 'شارع العليا، حي العليا',
      city: 'الرياض',
      district: 'العليا',
      neighborhood: 'العليا الشمالية',
      postalCode: '12346'
    },
    media: [
      {
        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        alt: 'شقة حديثة للإيجار',
        type: 'image',
        isCover: true
      },
      {
        url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
        alt: 'غرفة النوم',
        type: 'image',
        isCover: false
      }
    ],
    contact: {
      name: 'فاطمة السعد',
      phone: '+966502345678',
      whatsapp: '+966502345678',
      email: 'fatima@example.com',
      company: 'مكتب العقارات المتقدم',
      licenseNumber: 'REGA-67890',
      isVerified: true
    },
    isVerified: true,
    isFeatured: false,
    isPremium: false,
    license: {
      number: 'REGA-67890',
      expiryDate: new Date('2025-06-30'),
      source: 'REGA',
      isValid: true
    },
    keywords: ['شقة', 'للإيجار', 'العليا', 'حديث', 'بلكونة'],
    tags: ['حديث', 'بلكونة', 'مصعد', 'أمن'],
    createdBy: 'system'
  },
  {
    tenantId: 'default',
    title: 'أرض سكنية للبيع في حي الملز - 1000 متر مربع',
    description: 'أرض سكنية مساحتها 1000 متر مربع في موقع مميز بحي الملز. الأرض صالحة للبناء ومتصلة بالخدمات الأساسية. قريبة من المدارس والمستشفيات والمراكز التجارية. مناسبة لبناء فيلا أو عمارة سكنية.',
    purpose: 'sale',
    propertyType: 'land',
    price: {
      amount: 800000,
      currency: 'SAR',
      period: 'total'
    },
    specifications: {
      area: 1000,
      bedrooms: 0,
      bathrooms: 0,
      livingRooms: 0,
      floors: 0,
      age: 'new',
      furnished: false,
      parking: 0,
      balcony: false,
      garden: false,
      pool: false,
      gym: false,
      security: false,
      elevator: false,
      maidRoom: false
    },
    location: {
      lat: 24.7036,
      lng: 46.6653,
      address: 'شارع الملك عبدالعزيز، حي الملز',
      city: 'الرياض',
      district: 'الملز',
      neighborhood: 'الملز الشرقي',
      postalCode: '12347'
    },
    media: [
      {
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        alt: 'أرض سكنية للبيع',
        type: 'image',
        isCover: true
      }
    ],
    contact: {
      name: 'محمد عبدالله القحطاني',
      phone: '+966503456789',
      whatsapp: '+966503456789',
      email: 'mohammed@example.com',
      company: 'شركة الأراضي الذهبية',
      licenseNumber: 'REGA-11111',
      isVerified: true
    },
    isVerified: true,
    isFeatured: false,
    isPremium: true,
    license: {
      number: 'REGA-11111',
      expiryDate: new Date('2025-09-15'),
      source: 'REGA',
      isValid: true
    },
    keywords: ['أرض', 'للبيع', 'الملز', 'سكني', 'بناء'],
    tags: ['أرض', 'سكني', 'بناء', 'خدمات'],
    createdBy: 'system'
  }
];

const sampleSavedSearches = [
  {
    tenantId: 'default',
    userId: 'user-001',
    name: 'فلل للبيع في النرجس',
    description: 'بحث عن فلل للبيع في حي النرجس بأسعار معقولة',
    criteria: {
      purpose: 'sale',
      propertyType: ['villa'],
      city: 'الرياض',
      district: 'النرجس',
      minPrice: 800000,
      maxPrice: 1500000,
      bedrooms: 4
    },
    notifications: {
      enabled: true,
      frequency: 'daily',
      channels: ['email', 'whatsapp']
    },
    createdBy: 'user-001'
  },
  {
    tenantId: 'default',
    userId: 'user-002',
    name: 'شقق للإيجار في العليا',
    description: 'شقق للإيجار في حي العليا بأسعار مناسبة',
    criteria: {
      purpose: 'rent',
      propertyType: ['apartment'],
      city: 'الرياض',
      district: 'العليا',
      minPrice: 2000,
      maxPrice: 5000,
      bedrooms: 2,
      furnished: true
    },
    notifications: {
      enabled: true,
      frequency: 'weekly',
      channels: ['email']
    },
    createdBy: 'user-002'
  }
];

const sampleLeads = [
  {
    tenantId: 'default',
    name: 'سارة أحمد',
    phone: '+966504567890',
    email: 'sara@example.com',
    message: 'أرغب في زيارة الفيلا في حي النرجس. هل يمكن تحديد موعد مناسب؟',
    source: 'marketplace',
    status: 'new',
    priority: 'medium',
    createdBy: 'system'
  },
  {
    tenantId: 'default',
    name: 'خالد محمد',
    phone: '+966505678901',
    email: 'khalid@example.com',
    message: 'هل الشقة في حي العليا متاحة للإيجار؟ وما هي الشروط المطلوبة؟',
    source: 'marketplace',
    status: 'contacted',
    priority: 'high',
    createdBy: 'system'
  }
];

async function seedAqarData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await AqarListing.deleteMany({});
    await AqarSavedSearch.deleteMany({});
    await AqarLead.deleteMany({});
    console.log('Cleared existing Aqar data');

    // Create properties first
    const createdProperties = await Property.insertMany(sampleProperties);
    console.log(`Created ${createdProperties.length} properties`);

    // Update listings with property references
    const listingsWithProperties = sampleListings.map((listing, index) => ({
      ...listing,
      propertyId: createdProperties[index]._id
    }));

    // Create listings
    const createdListings = await AqarListing.insertMany(listingsWithProperties);
    console.log(`Created ${createdListings.length} listings`);

    // Update leads with listing references
    const leadsWithListings = sampleLeads.map((lead, index) => ({
      ...lead,
      listingId: createdListings[index]._id,
      propertyId: createdProperties[index]._id
    }));

    // Create saved searches
    const createdSavedSearches = await AqarSavedSearch.insertMany(sampleSavedSearches);
    console.log(`Created ${createdSavedSearches.length} saved searches`);

    // Create leads
    const createdLeads = await AqarLead.insertMany(leadsWithListings);
    console.log(`Created ${createdLeads.length} leads`);

    console.log('✅ Aqar data seeded successfully!');
    console.log('\nSample data created:');
    console.log(`- ${createdProperties.length} properties`);
    console.log(`- ${createdListings.length} listings`);
    console.log(`- ${createdSavedSearches.length} saved searches`);
    console.log(`- ${createdLeads.length} leads`);

  } catch (error) {
    console.error('Error seeding Aqar data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedAqarData();