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
  let testOrgCode: string;
  
  test.beforeAll(async () => {
    // Setup direct MongoDB connection for test data preparation
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set for E2E tests');
    }
    
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    
    // Create test organization with unique orgId/code to avoid dupes on reruns
    testOrgId = new ObjectId().toString();
    testOrgCode = `E2E-DB-${testOrgId.slice(-6)}`;
    const orgs = mongoClient.db('fixzit').collection('organizations');
    await orgs.deleteMany({
      $or: [
        { code: null },
        { code: { $exists: false } },
        { orgId: null },
        { orgId: { $exists: false } },
      ],
    });
    await orgs.deleteMany({ code: /^E2E-DB-/ });
    await orgs.insertOne({
      _id: new ObjectId(testOrgId),
      orgId: testOrgId,
      code: testOrgCode,
      name: 'E2E Test Org',
      createdAt: new Date()
    });

    // Clean any lingering properties from previous runs
    await mongoClient.db('fixzit').collection('properties').deleteMany({
      code: { $in: ['E2E-TEST-001', 'ORG1-PROP', 'ORG2-PROP'] },
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
      orgId: testOrgId,
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
    
    const data = (await response.json()) as { items?: Array<{ code?: string; name?: string; org_id?: string }> };
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
    
    // Should find our test property (or at least not error)
    const foundProperty = data.items.find((p: { code?: string; name?: string; org_id?: string }) => p.code === 'E2E-TEST-001');
    if (foundProperty) {
      expect(foundProperty.name).toBe('E2E Test Property');
      expect(foundProperty.org_id).toBe(testOrgId);
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
      orgId: testOrg2Id,
      code: `E2E-DB-${testOrg2Id.slice(-6)}`,
      name: 'E2E Test Org 2',
      createdAt: new Date()
    });

    // Insert properties for both organizations
    const org1Property = {
      _id: new ObjectId(),
      tenantId: testOrgId,
      orgId: testOrgId,
      code: 'ORG1-PROP',
      name: 'Org 1 Property',
      type: 'villa',
      createdAt: new Date()
    };

    const org2Property = {
      _id: new ObjectId(),
      tenantId: testOrg2Id,
      orgId: testOrg2Id,
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
    
    // AUDIT-2025-12-01: Fail-closed assertion for multi-tenant isolation
    // At least one should be filtered out (unless using super admin context)
    // Previously this was a console.warn - converted to assertion to catch regressions
    expect(
      hasOrg1 && hasOrg2,
      'MULTI-TENANT ISOLATION FAILED: Both ORG1-PROP and ORG2-PROP visible in single response.\n' +
      'This indicates cross-tenant data leakage - API is not scoping by org_id.\n' +
      'ACTION: Check API middleware and Mongoose query scoping for org_id enforcement.'
    ).toBe(false);

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
    // Measure a direct MongoDB query to avoid rate-limit noise
    const startTime = Date.now();
    const properties = await mongoClient
      .db('fixzit')
      .collection('properties')
      .find({ orgId: { $in: [testOrgId] } })
      .limit(50)
      .toArray();
    const responseTime = Date.now() - startTime;

    // Query should complete within reasonable time (5 seconds)
    expect(responseTime).toBeLessThan(5000);
    expect(Array.isArray(properties)).toBe(true);
    console.log(`Database query performance: ${responseTime}ms for ${properties.length} items`);
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
