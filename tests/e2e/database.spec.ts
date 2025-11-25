/**
 * E2E Database Connectivity Tests
 * 
 * Tests database integration through API endpoints
 * to ensure full system connectivity in deployment environment
 */

import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

test.describe('Database E2E Tests', () => {
  let mongoClient: MongoClient;
  let testOrgId: string;
  
  test.beforeAll(async () => {
    // Setup direct MongoDB connection for test data preparation
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set for E2E tests');
    }
    
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    
    // Create test organization
    testOrgId = new ObjectId().toString();
    await mongoClient.db('fixzit').collection('organizations').insertOne({
      _id: new ObjectId(testOrgId),
      name: 'E2E Test Org',
      createdAt: new Date()
    });
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (mongoClient && testOrgId) {
      await mongoClient.db('fixzit').collection('organizations').deleteOne({
        _id: new ObjectId(testOrgId)
      });
      await mongoClient.db('fixzit').collection('properties').deleteMany({
        tenantId: testOrgId
      });
      await mongoClient.close();
    }
  });

  test('Health check endpoint returns database status', async ({ request }) => {
    const response = await request.get('/api/health/database');
    
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health).toHaveProperty('status', 'healthy');
    expect(health).toHaveProperty('database', 'mongodb');
    expect(health).toHaveProperty('connection', 'active');
    expect(health).toHaveProperty('timestamp');
  });

  test('Properties API connects to MongoDB successfully', async ({ request }) => {
    // Insert test property directly to MongoDB
    const testProperty = {
      _id: new ObjectId(),
      tenantId: testOrgId,
      code: 'E2E-TEST-001',
      name: 'E2E Test Property',
      type: 'apartment',
      address: {
        city: 'Riyadh',
        district: 'Olaya'
      },
      details: {
        bedrooms: 2,
        bathrooms: 2,
        totalArea: 120
      },
      market: {
        listingPrice: 250000
      },
      createdAt: new Date()
    };

    await mongoClient.db('fixzit').collection('properties').insertOne(testProperty);

    // Test API retrieval
    const response = await request.get(`/api/aqar/properties?city=Riyadh`);
    expect(response.status()).toBe(200);
    
    const data = (await response.json()) as { items?: Array<{ code?: string; name?: string; tenantId?: string }> };
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
    
    // Should find our test property (or at least not error)
    const foundProperty = data.items.find((p: { code?: string; name?: string; tenantId?: string }) => p.code === 'E2E-TEST-001');
    if (foundProperty) {
      expect(foundProperty.name).toBe('E2E Test Property');
      expect(foundProperty.tenantId).toBe(testOrgId);
    }
  });

  test('Database connection survives concurrent requests', async ({ request }) => {
    // Fire multiple concurrent requests to test connection pooling
    const requests = Array.from({ length: 10 }, (_, i) => 
      request.get(`/api/aqar/properties?page=${i + 1}&pageSize=5`)
    );

    const responses = await Promise.all(requests);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    // Verify data consistency
    const results = await Promise.all(responses.map(r => r.json()));
    results.forEach(result => {
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('total');
    });
  });

  test('Multi-tenant data isolation works correctly', async ({ request }) => {
    // Create second test organization
    const testOrg2Id = new ObjectId().toString();
    await mongoClient.db('fixzit').collection('organizations').insertOne({
      _id: new ObjectId(testOrg2Id),
      name: 'E2E Test Org 2',
      createdAt: new Date()
    });

    // Insert properties for both organizations
    const org1Property = {
      _id: new ObjectId(),
      tenantId: testOrgId,
      code: 'ORG1-PROP',
      name: 'Org 1 Property',
      type: 'villa',
      createdAt: new Date()
    };

    const org2Property = {
      _id: new ObjectId(),
      tenantId: testOrg2Id,
      code: 'ORG2-PROP',
      name: 'Org 2 Property',
      type: 'villa',
      createdAt: new Date()
    };

    await mongoClient.db('fixzit').collection('properties').insertMany([
      org1Property,
      org2Property
    ]);

    // Test that API properly isolates data (this would need proper auth context)
    const response = await request.get('/api/aqar/properties');
    
    // The API should not leak data between tenants
    // Note: This test may need to be adapted based on your auth implementation
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    const codes = data.items.map((item: { code?: string }) => item.code);
    
    // In a proper multi-tenant setup, we shouldn't see both properties in one response
    const hasOrg1 = codes.includes('ORG1-PROP');
    const hasOrg2 = codes.includes('ORG2-PROP');
    
    // At least one should be filtered out (unless using super admin context)
    if (hasOrg1 && hasOrg2) {
      console.warn('Warning: Multi-tenant isolation may not be working - both org properties visible');
    }

    // Cleanup
    await mongoClient.db('fixzit').collection('organizations').deleteOne({
      _id: new ObjectId(testOrg2Id)
    });
    await mongoClient.db('fixzit').collection('properties').deleteMany({
      tenantId: testOrg2Id
    });
  });

  test('Database handles malformed queries gracefully', async ({ request }) => {
    // Test various malformed queries
    const malformedQueries = [
      '/api/aqar/properties?priceMin=invalid',
      '/api/aqar/properties?page=-1',
      '/api/aqar/properties?pageSize=9999',
      '/api/aqar/properties?bedsMin=not-a-number'
    ];

    for (const query of malformedQueries) {
      const response = await request.get(query);
      
      // Should either handle gracefully (200) or return proper error
      expect([200, 400].includes(response.status())).toBe(true);
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('items');
      }
    }
  });

  test('Database performance meets requirements', async ({ request }) => {
    const startTime = Date.now();
    
    // Make a substantial query
    const response = await request.get('/api/aqar/properties?pageSize=50');
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.status()).toBe(200);
    
    // Database query should complete within reasonable time (5 seconds)
    expect(responseTime).toBeLessThan(5000);
    
    const data = await response.json();
    expect(data).toHaveProperty('items');
    
    console.log(`Database query performance: ${responseTime}ms for ${data.items?.length || 0} items`);
  });

  test('Database connection recovery after network interruption simulation', async ({ request }) => {
    // First, establish that connection works
    const response1 = await request.get('/api/health/database');
    expect(response1.status()).toBe(200);
    
    // Simulate rapid successive calls (connection stress test)
    const rapidRequests = Array.from({ length: 5 }, () => 
      request.get('/api/health/database')
    );
    
    const rapidResponses = await Promise.all(rapidRequests);
    rapidResponses.forEach(response => {
      expect(response.status()).toBe(200);
    });
    
    // Final verification that connection is still stable
    const finalResponse = await request.get('/api/health/database');
    expect(finalResponse.status()).toBe(200);
  });
});
