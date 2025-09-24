const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testAqarAPI() {
  console.log('🧪 Testing Aqar Marketplace API...\n');

  try {
    // Test 1: Get listings
    console.log('1. Testing GET /api/aqar/listings...');
    const listingsResponse = await fetch(`${BASE_URL}/api/aqar/listings?limit=5`);
    const listingsData = await listingsResponse.json();
    
    if (listingsData.success) {
      console.log('✅ Listings API working');
      console.log(`   Found ${listingsData.data.listings.length} listings`);
      if (listingsData.data.listings.length > 0) {
        const firstListing = listingsData.data.listings[0];
        console.log(`   Sample: ${firstListing.title} - ${firstListing.price.amount} ${firstListing.price.currency}`);
      }
    } else {
      console.log('❌ Listings API failed:', listingsData.error);
    }

    // Test 2: Get saved searches
    console.log('\n2. Testing GET /api/aqar/saved-searches...');
    const savedSearchesResponse = await fetch(`${BASE_URL}/api/aqar/saved-searches`);
    const savedSearchesData = await savedSearchesResponse.json();
    
    if (savedSearchesData.success) {
      console.log('✅ Saved searches API working');
      console.log(`   Found ${savedSearchesData.data.length} saved searches`);
    } else {
      console.log('❌ Saved searches API failed:', savedSearchesData.error);
    }

    // Test 3: Get leads
    console.log('\n3. Testing GET /api/aqar/leads...');
    const leadsResponse = await fetch(`${BASE_URL}/api/aqar/leads`);
    const leadsData = await leadsResponse.json();
    
    if (leadsData.success) {
      console.log('✅ Leads API working');
      console.log(`   Found ${leadsData.data.leads.length} leads`);
    } else {
      console.log('❌ Leads API failed:', leadsData.error);
    }

    // Test 4: Create a test listing
    console.log('\n4. Testing POST /api/aqar/listings...');
    const testListing = {
      propertyId: '507f1f77bcf86cd799439011', // This would be a real property ID
      title: 'Test Property Listing',
      description: 'This is a test listing created by the API test script.',
      purpose: 'sale',
      propertyType: 'apartment',
      price: {
        amount: 500000,
        currency: 'SAR',
        period: 'total'
      },
      specifications: {
        area: 100,
        bedrooms: 2,
        bathrooms: 2,
        furnished: false
      },
      location: {
        lat: 24.7136,
        lng: 46.6753,
        city: 'الرياض',
        district: 'الملز'
      },
      contact: {
        name: 'Test Contact',
        phone: '+966501234567',
        isVerified: false
      }
    };

    const createResponse = await fetch(`${BASE_URL}/api/aqar/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default',
        'x-user-id': 'test-user'
      },
      body: JSON.stringify(testListing)
    });

    const createData = await createResponse.json();
    
    if (createData.success) {
      console.log('✅ Create listing API working');
      console.log(`   Created listing with ID: ${createData.data._id}`);
    } else {
      console.log('❌ Create listing API failed:', createData.error);
    }

    // Test 5: Test search with filters
    console.log('\n5. Testing search with filters...');
    const searchResponse = await fetch(`${BASE_URL}/api/aqar/listings?purpose=sale&city=الرياض&minPrice=100000&maxPrice=2000000`);
    const searchData = await searchResponse.json();
    
    if (searchData.success) {
      console.log('✅ Search with filters working');
      console.log(`   Found ${searchData.data.listings.length} listings matching criteria`);
    } else {
      console.log('❌ Search with filters failed:', searchData.error);
    }

    console.log('\n🎉 Aqar API testing completed!');

  } catch (error) {
    console.error('❌ Error testing Aqar API:', error.message);
  }
}

// Run the test
testAqarAPI();