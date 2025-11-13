/**
 * Aqar Marketplace Seed Data Generator
 * 
 * This script generates comprehensive seed data for the Aqar real estate marketplace,
 * including properties, agents, viewings, and transactions for testing and development.
 * 
 * Usage:
 *   node scripts/seed-aqar-data.js
 * 
 * Options:
 *   --properties=100    Number of properties to generate (default: 100)
 *   --agents=20         Number of agents to generate (default: 20)
 *   --viewings=50       Number of viewing requests to generate (default: 50)
 *   --transactions=30   Number of transactions to generate (default: 30)
 *   --clear             Clear existing data before seeding
 */

const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');

// Import models
const { AqarListing } = require('../models/aqar');
const { PropertyListing } = require('../server/models/aqar/PropertyListing');
const { RealEstateAgent } = require('../server/models/aqar/RealEstateAgent');
const { ViewingRequest } = require('../server/models/aqar/ViewingRequest');
const { PropertyTransaction } = require('../server/models/aqar/PropertyTransaction');
const User = require('../models/User');

// Configuration
const config = {
  properties: parseInt(process.argv.find(arg => arg.startsWith('--properties='))?.split('=')[1] || '100', 10),
  agents: parseInt(process.argv.find(arg => arg.startsWith('--agents='))?.split('=')[1] || '20', 10),
  viewings: parseInt(process.argv.find(arg => arg.startsWith('--viewings='))?.split('=')[1] || '50', 10),
  transactions: parseInt(process.argv.find(arg => arg.startsWith('--transactions='))?.split('=')[1] || '30', 10),
  clearExisting: process.argv.includes('--clear'),
};

// Saudi cities with coordinates
const saudiCities = [
  { name: 'Riyadh', name_ar: 'الرياض', lat: 24.7136, lng: 46.6753, districts: ['Al Olaya', 'Al Malaz', 'Al Nakheel', 'Al Wurud', 'King Fahd', 'Al Sahafa'] },
  { name: 'Jeddah', name_ar: 'جدة', lat: 21.5433, lng: 39.1728, districts: ['Al Hamra', 'Al Shatea', 'Al Rawdah', 'Al Salamah', 'Al Zahra', 'Al Basateen'] },
  { name: 'Mecca', name_ar: 'مكة', lat: 21.4225, lng: 39.8262, districts: ['Al Aziziyah', 'Al Hindawiyah', 'Jarwal', 'Al Shawqiyah', 'Al Kakiyah'] },
  { name: 'Medina', name_ar: 'المدينة', lat: 24.5247, lng: 39.5692, districts: ['Al Khalidiyah', 'Al Aqiq', 'Al Iskan', 'Quba', 'Al Jumuah'] },
  { name: 'Dammam', name_ar: 'الدمام', lat: 26.4207, lng: 50.0888, districts: ['Al Shati', 'Al Faisaliyah', 'Al Adamah', 'Al Nuzha', 'Al Muhammadiyah'] },
  { name: 'Khobar', name_ar: 'الخبر', lat: 26.2172, lng: 50.1971, districts: ['Corniche', 'Al Aqrabiyah', 'Al Khobar Al Shamaliyah', 'Al Ulaya', 'Al Hizam'] },
];

// Property types with typical characteristics
const propertyData = {
  APARTMENT: { priceRange: [150000, 800000], areaRange: [60, 200], bedrooms: [1, 2, 3, 4], images: 8 },
  VILLA: { priceRange: [800000, 5000000], areaRange: [250, 800], bedrooms: [3, 4, 5, 6], images: 12 },
  TOWNHOUSE: { priceRange: [500000, 2000000], areaRange: [180, 350], bedrooms: [2, 3, 4], images: 10 },
  PENTHOUSE: { priceRange: [1500000, 8000000], areaRange: [200, 500], bedrooms: [2, 3, 4, 5], images: 15 },
  STUDIO: { priceRange: [100000, 400000], areaRange: [30, 60], bedrooms: [0, 1], images: 6 },
  LAND: { priceRange: [200000, 10000000], areaRange: [300, 5000], bedrooms: [0], images: 4 },
  COMMERCIAL: { priceRange: [500000, 15000000], areaRange: [100, 2000], bedrooms: [0], images: 8 },
  WAREHOUSE: { priceRange: [1000000, 20000000], areaRange: [500, 10000], bedrooms: [0], images: 6 },
  OFFICE: { priceRange: [300000, 5000000], areaRange: [50, 500], bedrooms: [0], images: 8 },
};

// Amenities pool
const amenitiesList = [
  'Swimming Pool', 'Gym', 'Parking', 'Security 24/7', 'Garden', 'Balcony',
  'Elevator', 'Central AC', 'Maid Room', 'Storage Room', 'Kids Play Area', 'BBQ Area',
  'Smart Home', 'Solar Panels', 'Covered Parking', 'Guest Parking', 'Mosque Nearby',
  'School Nearby', 'Mall Nearby', 'Metro Station', 'Bus Stop', 'Hospital Nearby'
];

// Agent specializations
const specializations = [
  'Residential Properties', 'Commercial Properties', 'Luxury Villas', 'Apartments',
  'Investment Properties', 'Off-Plan Properties', 'Land Sales', 'Property Management'
];

// Helper functions
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomItems = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;

/**
 * Generate a random Saudi phone number
 */
function generateSaudiPhone() {
  const prefixes = ['50', '53', '54', '55', '56', '58', '59'];
  const prefix = randomItem(prefixes);
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+966${prefix}${number}`;
}

/**
 * Generate property listings
 */
async function generateProperties(count, agents) {
  console.log(`Generating ${count} properties...`);
  const properties = [];

  for (let i = 0; i < count; i++) {
    const propertyType = randomItem(Object.keys(propertyData));
    const listingType = randomItem(['SALE', 'RENT', 'RENT', 'LEASE']); // More rentals
    const city = randomItem(saudiCities);
    const district = randomItem(city.districts);
    const data = propertyData[propertyType];
    
    // Random coordinates near city center
    const lat = city.lat + randomFloat(-0.1, 0.1);
    const lng = city.lng + randomFloat(-0.1, 0.1);

    // Price calculation
    const basePrice = randomInt(data.priceRange[0], data.priceRange[1]);
    const rentMultiplier = listingType === 'RENT' ? 0.004 : 1; // ~4% annual for rent
    const price = listingType === 'RENT' ? Math.floor(basePrice * rentMultiplier) : basePrice;

    // Area
    const builtArea = randomInt(data.areaRange[0], data.areaRange[1]);
    const plotArea = ['VILLA', 'TOWNHOUSE', 'LAND'].includes(propertyType) 
      ? builtArea * randomFloat(1.5, 3) 
      : builtArea;

    // Bedrooms & Bathrooms
    const bedrooms = propertyType === 'STUDIO' ? 0 : randomItem(data.bedrooms);
    const bathrooms = bedrooms > 0 ? randomInt(Math.max(1, Math.floor(bedrooms * 0.6)), bedrooms + 1) : 1;

    // Features
    const hasParking = propertyType !== 'STUDIO';
    const parkingSpaces = hasParking ? randomInt(1, propertyType === 'VILLA' ? 4 : 2) : 0;
    const furnished = Math.random() > 0.6;
    const amenities = randomItems(amenitiesList, randomInt(3, 8));

    // Status
    const status = randomItem(['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'RESERVED', 'SOLD']);
    const featured = Math.random() > 0.85;
    const verified = Math.random() > 0.2;

    // Agent
    const agent = randomItem(agents);
    const agentId = agent._id;

    // Property title
    const titlePrefix = listingType === 'SALE' ? 'For Sale' : listingType === 'RENT' ? 'For Rent' : 'For Lease';
    const title = {
      en: `${titlePrefix}: ${propertyType} in ${district}, ${city.name}`,
      ar: `${propertyType} في ${district}, ${city.name_ar}`,
    };

    // Description
    const description = {
      en: `Beautiful ${propertyType.toLowerCase()} located in the premium ${district} district of ${city.name}. ` +
          `This property features ${bedrooms} bedroom${bedrooms !== 1 ? 's' : ''}, ${bathrooms} bathroom${bathrooms !== 1 ? 's' : ''}, ` +
          `and ${Math.floor(builtArea)} sqm of living space. ${furnished ? 'Fully furnished and ' : ''}Ready to move in. ` +
          `Amenities include: ${amenities.slice(0, 3).join(', ')}.`,
      ar: `عقار جميل يقع في ${district} في ${city.name_ar}`,
    };

    // Images (mock URLs)
    const images = Array.from({ length: data.images }, (_, idx) => ({
      url: `https://picsum.photos/seed/prop-${i}-${idx}/800/600`,
      caption: { en: `Image ${idx + 1}`, ar: `صورة ${idx + 1}` },
      order: idx,
      isCover: idx === 0,
    }));

    const property = {
      propertyType,
      listingType,
      status,
      title,
      description,
      location: {
        address: {
          street: `${randomInt(1, 999)} ${faker.location.street()}`,
          district,
          city: city.name,
          region: city.name,
          country: 'Saudi Arabia',
          postalCode: `${randomInt(10000, 99999)}`,
        },
        coordinates: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        nearby: {
          schools: randomItems(['King Saud International School', 'American International School', 'British International School'], 2),
          hospitals: randomItems(['King Faisal Specialist Hospital', 'Saudi German Hospital', 'Dr. Sulaiman Al Habib Hospital'], 1),
          malls: randomItems(['Al Nakheel Mall', 'Riyadh Park', 'Kingdom Centre'], 1),
          mosques: randomItems(['Grand Mosque', 'Al Rajhi Mosque', 'Al Faisaliyah Mosque'], 2),
          metro: propertyType !== 'LAND' ? [`Metro Station ${randomInt(1, 10)}`] : undefined,
        },
      },
      features: {
        bedrooms,
        bathrooms,
        area: {
          built: builtArea,
          plot: propertyType === 'APARTMENT' ? undefined : plotArea,
          unit: 'sqm',
        },
        floor: ['APARTMENT', 'OFFICE'].includes(propertyType) ? randomInt(1, 20) : undefined,
        totalFloors: ['APARTMENT', 'OFFICE'].includes(propertyType) ? randomInt(5, 30) : undefined,
        parking: parkingSpaces,
        furnished,
        amenities,
        yearBuilt: randomInt(2000, 2024),
        lastRenovated: Math.random() > 0.7 ? randomInt(2018, 2024) : undefined,
      },
      pricing: {
        amount: price,
        currency: 'SAR',
        pricePerSqm: Math.floor(price / builtArea),
        negotiable: Math.random() > 0.5,
        includedUtilities: listingType === 'RENT' ? randomItems(['Water', 'Electricity', 'Internet', 'Maintenance'], randomInt(0, 3)) : undefined,
      },
      media: {
        images,
        videos: Math.random() > 0.7 ? [{ url: `https://www.youtube.com/watch?v=${faker.string.alphanumeric(11)}`, thumbnail: images[0].url }] : [],
        virtualTour: Math.random() > 0.8 ? `https://virtual-tour.example.com/property-${i}` : undefined,
        floorPlan: Math.random() > 0.6 ? `https://picsum.photos/seed/floor-${i}/1200/800` : undefined,
      },
      agentId,
      ownerId: agent.userId,
      featured,
      verified,
      views: randomInt(10, 1000),
      publishedAt: Math.random() > 0.2 ? faker.date.past({ years: 0.5 }) : undefined,
      expiresAt: faker.date.future({ years: 1 }),
    };

    properties.push(property);
  }

  const result = await PropertyListing.insertMany(properties);
  console.log(`✓ Created ${result.length} properties`);
  return result;
}

/**
 * Generate real estate agents
 */
async function generateAgents(count) {
  console.log(`Generating ${count} agents...`);
  const agents = [];

  // Create or find user accounts for agents
  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const phone = generateSaudiPhone();

    // Create user if doesn't exist
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        firstName,
        lastName,
        phone,
        role: 'agent',
        verified: true,
        active: true,
      });
    }

    const tier = randomItem(['BASIC', 'PREMIUM', 'PREMIUM', 'ELITE']); // More premium
    const experience = randomInt(1, 20);
    const totalListings = randomInt(10, 200);
    const soldProperties = Math.floor(totalListings * randomFloat(0.3, 0.7));

    const agent = {
      userId: user._id,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      photo: `https://i.pravatar.cc/300?u=${email}`,
      bio: {
        en: faker.lorem.paragraph(),
        ar: 'وكيل عقارات محترف',
      },
      license: {
        number: `LIC-${randomInt(100000, 999999)}`,
        authority: 'Saudi Real Estate Authority',
        issueDate: faker.date.past({ years: experience }),
        expiryDate: faker.date.future({ years: randomInt(1, 5) }),
        verified: Math.random() > 0.1,
      },
      specializations: randomItems(specializations, randomInt(2, 4)),
      languages: randomItems(['English', 'Arabic', 'Urdu', 'Hindi', 'French'], randomInt(2, 3)),
      experience,
      serviceAreas: randomItems(saudiCities.map(c => c.name), randomInt(1, 3)),
      contact: {
        phone,
        whatsapp: phone,
        email,
        website: Math.random() > 0.5 ? `https://${faker.internet.domainName()}` : undefined,
      },
      availability: {
        daysAvailable: randomItems(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], randomInt(5, 7)),
        hoursStart: '09:00',
        hoursEnd: '18:00',
        instantBooking: Math.random() > 0.5,
      },
      statistics: {
        totalListings,
        activeListings: totalListings - soldProperties,
        soldProperties,
        rentedProperties: Math.floor(totalListings * randomFloat(0.2, 0.4)),
        totalSalesValue: soldProperties * randomInt(500000, 2000000),
        averageRating: randomFloat(3.5, 5),
        totalReviews: randomInt(5, 150),
        responseTime: randomInt(5, 120),
        viewingCompletionRate: randomFloat(0.6, 0.95),
      },
      tier,
      verified: Math.random() > 0.1,
      featured: Math.random() > 0.8,
      status: 'ACTIVE',
    };

    agents.push(agent);
  }

  const result = await RealEstateAgent.insertMany(agents);
  console.log(`✓ Created ${result.length} agents`);
  return result;
}

/**
 * Generate viewing requests
 */
async function generateViewings(count, properties, agents) {
  console.log(`Generating ${count} viewing requests...`);
  const viewings = [];

  for (let i = 0; i < count; i++) {
    const property = randomItem(properties);
    const agent = randomItem(agents);
    const viewingType = randomItem(['IN_PERSON', 'IN_PERSON', 'VIDEO_CALL', 'VIRTUAL']);
    const status = randomItem(['REQUESTED', 'CONFIRMED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
    
    const preferredDate = faker.date.future({ months: 1 });
    const preferredTime = randomItem(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);

    const viewing = {
      propertyId: property._id,
      agentId: agent._id,
      requesterId: agent.userId, // Mock requester
      viewingType,
      preferredDate,
      preferredTime,
      status,
      participants: [{
        name: faker.person.fullName(),
        phone: generateSaudiPhone(),
        email: faker.internet.email(),
        relationship: 'Primary',
      }],
      notes: Math.random() > 0.5 ? faker.lorem.sentence() : undefined,
      statusHistory: [{
        status: 'REQUESTED',
        changedAt: faker.date.recent({ days: 7 }),
        changedBy: agent.userId,
      }],
    };

    if (status === 'COMPLETED') {
      viewing.feedback = {
        rating: randomInt(3, 5),
        comments: faker.lorem.paragraph(),
        interested: Math.random() > 0.3,
        followUpRequested: Math.random() > 0.5,
      };
    }

    viewings.push(viewing);
  }

  const result = await ViewingRequest.insertMany(viewings);
  console.log(`✓ Created ${result.length} viewing requests`);
  return result;
}

/**
 * Generate property transactions
 */
async function generateTransactions(count, properties, agents) {
  console.log(`Generating ${count} transactions...`);
  const transactions = [];

  for (let i = 0; i < count; i++) {
    const property = randomItem(properties.filter(p => p.status !== 'AVAILABLE'));
    const agent = randomItem(agents);
    const type = property.listingType;
    const status = randomItem(['PENDING', 'IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
    
    const totalAmount = property.pricing.amount;
    const commission = totalAmount * 0.025; // 2.5% commission

    const transaction = {
      propertyId: property._id,
      agentId: agent._id,
      type,
      status,
      referenceNumber: `TXN-${Date.now()}-${randomInt(1000, 9999)}`,
      buyer: type === 'SALE' ? {
        userId: agent.userId,
        name: faker.person.fullName(),
        phone: generateSaudiPhone(),
        email: faker.internet.email(),
      } : undefined,
      seller: type === 'SALE' ? {
        userId: property.ownerId,
        name: faker.person.fullName(),
        phone: generateSaudiPhone(),
        email: faker.internet.email(),
      } : undefined,
      tenant: type !== 'SALE' ? {
        userId: agent.userId,
        name: faker.person.fullName(),
        phone: generateSaudiPhone(),
        email: faker.internet.email(),
      } : undefined,
      landlord: type !== 'SALE' ? {
        userId: property.ownerId,
        name: faker.person.fullName(),
        phone: generateSaudiPhone(),
        email: faker.internet.email(),
      } : undefined,
      amount: {
        total: totalAmount,
        currency: 'SAR',
        commission,
        taxes: totalAmount * 0.05, // 5% VAT
        additionalFees: randomInt(1000, 5000),
      },
      paymentSchedule: [{
        description: type === 'SALE' ? 'Down Payment' : 'First Month Rent',
        amount: type === 'SALE' ? totalAmount * 0.3 : totalAmount,
        dueDate: faker.date.future({ months: 1 }),
        status: status === 'COMPLETED' ? 'PAID' : 'PENDING',
      }],
      contractStartDate: faker.date.recent({ days: 30 }),
      contractEndDate: faker.date.future({ years: type === 'SALE' ? undefined : 1 }),
      contractDuration: type !== 'SALE' ? 12 : undefined,
      documents: [{
        name: 'Sales Agreement',
        type: 'CONTRACT',
        url: `https://docs.example.com/contract-${i}.pdf`,
        uploadedAt: faker.date.recent({ days: 10 }),
      }],
      statusHistory: [{
        status: 'PENDING',
        changedAt: faker.date.recent({ days: 20 }),
        changedBy: agent.userId,
        notes: 'Transaction initiated',
      }],
    };

    transactions.push(transaction);
  }

  const result = await PropertyTransaction.insertMany(transactions);
  console.log(`✓ Created ${result.length} transactions`);
  return result;
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting Aqar marketplace seeding...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Clear existing data if requested
    if (config.clearExisting) {
      console.log('🗑️  Clearing existing data...');
      await Promise.all([
        PropertyListing.deleteMany({}),
        RealEstateAgent.deleteMany({}),
        ViewingRequest.deleteMany({}),
        PropertyTransaction.deleteMany({}),
      ]);
      console.log('✓ Existing data cleared\n');
    }

    // Generate data
    const agents = await generateAgents(config.agents);
    const properties = await generateProperties(config.properties, agents);
    const viewings = await generateViewings(config.viewings, properties, agents);
    const transactions = await generateTransactions(config.transactions, properties, agents);

    // Summary
    console.log('\n✅ Seeding completed successfully!\n');
    console.log('Summary:');
    console.log(`  - Agents: ${agents.length}`);
    console.log(`  - Properties: ${properties.length}`);
    console.log(`  - Viewing Requests: ${viewings.length}`);
    console.log(`  - Transactions: ${transactions.length}`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

// Run seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
