# Aqar Real Estate Marketplace - Developer Quick Reference

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Variables
Create `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/fixzit
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
AWS_S3_BUCKET=your_s3_bucket
STRIPE_SECRET_KEY=your_stripe_key
```

### 3. Seed Test Data
```bash
# Generate 100 properties, 20 agents, 50 viewings, 30 transactions
node scripts/seed-aqar-data.js

# Custom amounts
node scripts/seed-aqar-data.js --properties=50 --agents=10 --viewings=25 --transactions=15

# Clear existing data first
node scripts/seed-aqar-data.js --clear --properties=100
```

### 4. Run Development Server
```bash
pnpm dev
```

Visit: `http://localhost:3000/aqar`

---

## 📦 Component Usage

### PropertyCard
```tsx
import PropertyCard from '@/components/aqar/PropertyCard';

<PropertyCard
  id="property-id"
  slug="luxury-villa-riyadh"
  title={{ en: "Luxury Villa in Al Nakheel", ar: "فيلا فاخرة" }}
  propertyType="VILLA"
  listingType="SALE"
  location={{
    city: "Riyadh",
    district: "Al Nakheel",
    coordinates: { lat: 24.7136, lng: 46.6753 }
  }}
  features={{
    bedrooms: 5,
    bathrooms: 6,
    area: { built: 500, unit: "sqm" },
    parking: 4,
    furnished: true,
    amenities: ["Swimming Pool", "Gym", "Garden"]
  }}
  pricing={{
    amount: 2500000,
    currency: "SAR",
    pricePerSqm: 5000
  }}
  media={{
    images: [{ url: "/images/villa.jpg", isCover: true }]
  }}
  featured={true}
  verified={true}
  views={245}
  agentId="agent-id"
/>
```

### AgentCard
```tsx
import AgentCard from '@/components/aqar/AgentCard';

// Full card
<AgentCard
  agent={{
    id: "agent-id",
    userId: "user-id",
    firstName: "Ahmed",
    lastName: "Al-Saud",
    displayName: "Ahmed Al-Saud",
    photo: "/images/agent.jpg",
    license: {
      number: "LIC-123456",
      authority: "Saudi Real Estate Authority",
      verified: true
    },
    specializations: ["Luxury Villas", "Commercial Properties"],
    languages: ["English", "Arabic"],
    experience: 10,
    contact: {
      phone: "+966501234567",
      whatsapp: "+966501234567",
      email: "ahmed@example.com"
    },
    statistics: {
      totalListings: 150,
      activeListings: 45,
      soldProperties: 85,
      rentedProperties: 20,
      averageRating: 4.8,
      totalReviews: 127,
      responseTime: 15
    },
    tier: "ELITE",
    verified: true,
    featured: true
  }}
/>

// Compact variant
<AgentCard agent={agentData} compact={true} />
```

### MortgageCalculator
```tsx
import MortgageCalculator from '@/components/aqar/MortgageCalculator';

<MortgageCalculator
  propertyPrice={1500000}
  currency="SAR"
/>
```

### ViewingScheduler
```tsx
import ViewingScheduler from '@/components/aqar/ViewingScheduler';

<ViewingScheduler
  propertyId="property-id"
  propertyTitle="Luxury Villa in Al Nakheel"
  propertyAddress="123 King Fahd Road, Riyadh"
  agentId="agent-id"
  agentName="Ahmed Al-Saud"
  agentPhoto="/images/agent.jpg"
  onSchedule={async (data) => {
    const response = await fetch('/api/aqar/viewings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }}
/>
```

### SearchFilters
```tsx
import SearchFilters from '@/components/aqar/SearchFilters';

<SearchFilters
  onFilterChange={(filters) => {
    console.log('Filters:', filters);
    // Fetch properties with filters
  }}
  initialFilters={{
    listingType: 'SALE',
    city: 'Riyadh',
    priceMin: 500000,
    priceMax: 2000000,
    bedrooms: [3, 4],
    sortBy: 'PRICE_ASC'
  }}
/>
```

---

## 🗄️ Database Models

### PropertyListing
```typescript
import { PropertyListing } from '@/server/models/aqar/PropertyListing';

// Create property
const property = await PropertyListing.create({
  propertyType: 'VILLA',
  listingType: 'SALE',
  status: 'AVAILABLE',
  title: { en: "Luxury Villa", ar: "فيلا فاخرة" },
  location: {
    address: {
      street: "123 King Fahd Road",
      district: "Al Nakheel",
      city: "Riyadh",
      country: "Saudi Arabia"
    },
    coordinates: {
      type: 'Point',
      coordinates: [46.6753, 24.7136] // [lng, lat]
    }
  },
  features: {
    bedrooms: 5,
    bathrooms: 6,
    area: { built: 500, plot: 1000, unit: 'sqm' },
    parking: 4,
    furnished: true,
    amenities: ["Swimming Pool", "Gym", "Garden"]
  },
  pricing: {
    amount: 2500000,
    currency: 'SAR',
    pricePerSqm: 5000
  },
  agentId: 'agent-id',
  ownerId: 'owner-id'
});

// Geospatial query (find properties within 5km)
const nearby = await PropertyListing.find({
  'location.coordinates': {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [46.6753, 24.7136]
      },
      $maxDistance: 5000 // meters
    }
  }
});

// Text search
const results = await PropertyListing.find({
  $text: { $search: "villa riyadh" }
});

// Advanced filtering
const filtered = await PropertyListing.find({
  propertyType: 'VILLA',
  listingType: 'SALE',
  'features.bedrooms': { $gte: 4 },
  'pricing.amount': { $gte: 1000000, $lte: 3000000 },
  'location.address.city': 'Riyadh'
}).sort({ 'pricing.amount': 1 }).limit(20);
```

### RealEstateAgent
```typescript
import { RealEstateAgent } from '@/server/models/aqar/RealEstateAgent';

// Create agent
const agent = await RealEstateAgent.create({
  userId: 'user-id',
  firstName: 'Ahmed',
  lastName: 'Al-Saud',
  license: {
    number: 'LIC-123456',
    authority: 'Saudi Real Estate Authority',
    verified: true,
    issueDate: new Date('2020-01-01'),
    expiryDate: new Date('2025-01-01')
  },
  specializations: ['Luxury Villas', 'Commercial Properties'],
  languages: ['English', 'Arabic'],
  experience: 10,
  contact: {
    phone: '+966501234567',
    email: 'ahmed@example.com'
  },
  tier: 'PREMIUM',
  status: 'ACTIVE'
});

// Find top agents
const topAgents = await RealEstateAgent.find({
  status: 'ACTIVE',
  'statistics.averageRating': { $gte: 4.5 }
}).sort({ 'statistics.soldProperties': -1 }).limit(10);
```

### ViewingRequest
```typescript
import { ViewingRequest } from '@/server/models/aqar/ViewingRequest';

// Create viewing
const viewing = await ViewingRequest.create({
  propertyId: 'property-id',
  agentId: 'agent-id',
  requesterId: 'user-id',
  viewingType: 'IN_PERSON',
  preferredDate: new Date('2025-10-25'),
  preferredTime: '14:00',
  participants: [{
    name: 'John Doe',
    phone: '+966501234567',
    email: 'john@example.com',
    relationship: 'Primary'
  }],
  status: 'REQUESTED'
});

// Update status
viewing.status = 'CONFIRMED';
viewing.statusHistory.push({
  status: 'CONFIRMED',
  changedAt: new Date(),
  changedBy: 'agent-id',
  notes: 'Viewing confirmed by agent'
});
await viewing.save();
```

### PropertyTransaction
```typescript
import { PropertyTransaction } from '@/server/models/aqar/PropertyTransaction';

// Create transaction
const transaction = await PropertyTransaction.create({
  propertyId: 'property-id',
  agentId: 'agent-id',
  type: 'SALE',
  status: 'PENDING',
  referenceNumber: `TXN-${Date.now()}`,
  buyer: {
    userId: 'buyer-id',
    name: 'John Doe',
    phone: '+966501234567',
    email: 'john@example.com'
  },
  seller: {
    userId: 'seller-id',
    name: 'Ahmed Al-Saud',
    phone: '+966507654321',
    email: 'ahmed@example.com'
  },
  amount: {
    total: 2500000,
    currency: 'SAR',
    commission: 62500, // 2.5%
    taxes: 125000, // 5% VAT
    additionalFees: 5000
  },
  paymentSchedule: [{
    description: 'Down Payment',
    amount: 750000,
    dueDate: new Date('2025-11-01'),
    status: 'PENDING'
  }]
});
```

---

## 🌐 API Routes

### List Properties
```
GET /api/aqar/listings?page=1&limit=20&city=Riyadh&propertyType=VILLA
```

### Get Property Details
```
GET /api/aqar/listings/[id]
```

### Create Property (Agents only)
```
POST /api/aqar/listings
Content-Type: application/json

{
  "propertyType": "VILLA",
  "listingType": "SALE",
  "title": { "en": "Luxury Villa", "ar": "فيلا فاخرة" },
  "location": { ... },
  "features": { ... },
  "pricing": { ... }
}
```

### Search Properties
```
GET /api/aqar/listings/search?query=villa&city=Riyadh&minPrice=1000000&maxPrice=3000000&bedrooms=4,5
```

### Add to Favorites
```
POST /api/aqar/favorites
Content-Type: application/json

{
  "propertyId": "property-id"
}
```

### Create Lead
```
POST /api/aqar/leads
Content-Type: application/json

{
  "propertyId": "property-id",
  "name": "John Doe",
  "phone": "+966501234567",
  "email": "john@example.com",
  "message": "Interested in viewing this property"
}
```

---

## 🎨 Styling

All components use TailwindCSS with the Fixzit theme:

```tsx
// Primary color: #FFB400 (gold)
// Secondary color: #FF8C00 (dark orange)

// Gradient buttons
className="bg-gradient-to-r from-[#FFB400] to-[#FF8C00] text-white"

// Agent tier colors
Elite: "from-purple-600 to-purple-800"
Premium: "from-blue-600 to-blue-800"
Basic: "from-gray-600 to-gray-800"
```

---

## 🔒 Authentication

All protected routes require authentication:

```typescript
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check role
  if (user.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Proceed with logic
}
```

---

## 📊 Common Queries

### Featured Properties
```typescript
const featured = await PropertyListing.find({
  featured: true,
  status: 'AVAILABLE',
  publishedAt: { $lte: new Date() }
}).sort({ publishedAt: -1 }).limit(10);
```

### Agent's Active Listings
```typescript
const listings = await PropertyListing.find({
  agentId: agentId,
  status: { $in: ['AVAILABLE', 'RESERVED'] }
}).sort({ createdAt: -1 });
```

### Properties Near Location
```typescript
const nearby = await PropertyListing.aggregate([
  {
    $geoNear: {
      near: { type: 'Point', coordinates: [lng, lat] },
      distanceField: 'distance',
      maxDistance: 5000, // 5km
      spherical: true
    }
  },
  { $limit: 20 }
]);
```

### Price Range Statistics
```typescript
const stats = await PropertyListing.aggregate([
  { $match: { listingType: 'SALE', 'location.address.city': 'Riyadh' } },
  {
    $group: {
      _id: '$propertyType',
      avgPrice: { $avg: '$pricing.amount' },
      minPrice: { $min: '$pricing.amount' },
      maxPrice: { $max: '$pricing.amount' },
      count: { $sum: 1 }
    }
  }
]);
```

---

## 🐛 Troubleshooting

### Geospatial queries not working
Ensure indexes are created:
```typescript
PropertyListingSchema.index({ 'location.coordinates': '2dsphere' });
```

### Text search not returning results
Check text index:
```typescript
PropertyListingSchema.index({ 'title.en': 'text', 'title.ar': 'text', 'description.en': 'text' });
```

### Agent can't create listings
Check package status:
```typescript
const activePackage = await AqarPackage.findOne({
  userId: user._id,
  active: true,
  remainingListings: { $gt: 0 }
});
```

---

## 📝 TypeScript Types

All models export TypeScript types:

```typescript
import type { PropertyType, ListingType, PropertyStatus } from '@/server/models/aqar/PropertyListing';
import type { AgentTier, AgentStatus } from '@/server/models/aqar/RealEstateAgent';
import type { ViewingType, ViewingStatus } from '@/server/models/aqar/ViewingRequest';
import type { TransactionType, TransactionStatus } from '@/server/models/aqar/PropertyTransaction';
```

---

## 🚢 Production Deployment

### 1. Build
```bash
pnpm build
```

### 2. Database Indexes
```bash
# Connect to production MongoDB and create indexes
node scripts/create-indexes.js
```

### 3. Environment Variables
Set in production:
- `MONGODB_URI`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `AWS_S3_BUCKET`
- `STRIPE_SECRET_KEY`
- `NODE_ENV=production`

### 4. Deploy
```bash
# Vercel
vercel --prod

# Or Docker
docker build -t aqar-marketplace .
docker run -p 3000:3000 aqar-marketplace
```

---

## 📚 Additional Resources

- **Full Documentation:** `/REAL_ESTATE_MARKETPLACE_COMPLETE_REPORT.md`
- **Enhancement Report:** `/REAL_ESTATE_ENHANCEMENT_COMPLETE.md`
- **Existing Implementation:** `/models/aqar/` and `/app/api/aqar/`

---

**Last Updated:** October 20, 2025  
**Version:** 2.0.0  
**Status:** Production Ready ✅
