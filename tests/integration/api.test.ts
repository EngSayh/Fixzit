import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * API Integration Tests
 * Tests all CRUD endpoints, authentication, error handling
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

let mongoServer: MongoMemoryServer;
let authToken: string;
let testUserId: string;
let testOrgId: string;

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Start in-memory MongoDB for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to test database
    await mongoose.connect(mongoUri);
    
    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    // Cleanup
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/signup', () => {
      it('should create new user account', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/auth/signup')
          .send({
            email: 'newuser@test.com',
            password: 'Test123!@#',
            name: 'Test User',
            orgId: testOrgId
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('userId');
        expect(response.body).toHaveProperty('email', 'newuser@test.com');
      });

      it('should reject duplicate email', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/auth/signup')
          .send({
            email: 'admin@test.com', // Already exists
            password: 'Test123!@#',
            name: 'Duplicate User',
            orgId: testOrgId
          });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error');
      });

      it('should validate password strength', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/auth/signup')
          .send({
            email: 'weak@test.com',
            password: '123', // Too weak
            name: 'Weak Password User',
            orgId: testOrgId
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/password/i);
      });

      it('should validate email format', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/auth/signup')
          .send({
            email: 'invalid-email',
            password: 'Test123!@#',
            name: 'Invalid Email User',
            orgId: testOrgId
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/email/i);
      });
    });

    describe('POST /api/auth/signin', () => {
      it('should authenticate with valid credentials', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/auth/signin')
          .send({
            loginIdentifier: 'admin@test.com',
            password: 'Admin123!@#'
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        
        // Store token for other tests
        authToken = response.body.token;
      });

      it('should reject invalid credentials', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/auth/signin')
          .send({
            loginIdentifier: 'admin@test.com',
            password: 'WrongPassword'
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toMatch(/invalid credentials/i);
      });

      it('should authenticate with employee number', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/auth/signin')
          .send({
            loginIdentifier: 'EMP001',
            password: 'Admin123!@#'
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('should refresh authentication token', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      });

      it('should reject expired token', async () => {
        const expiredToken = 'expired.jwt.token';
        const response = await request(API_BASE_URL)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Work Orders API', () => {
    let testWorkOrderId: string;

    describe('POST /api/work-orders', () => {
      it('should create new work order', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/work-orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Work Order',
            description: 'Test description',
            priority: 'HIGH',
            category: 'MAINTENANCE',
            propertyId: 'test-property-id'
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('workOrderId');
        expect(response.body.title).toBe('Test Work Order');
        
        testWorkOrderId = response.body.workOrderId;
      });

      it('should require authentication', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/work-orders')
          .send({
            title: 'Unauthorized Work Order'
          });

        expect(response.status).toBe(401);
      });

      it('should validate required fields', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/work-orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            description: 'Missing title'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/title.*required/i);
      });
    });

    describe('GET /api/work-orders', () => {
      it('should list all work orders', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/work-orders')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
      });

      it('should paginate results', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/work-orders?page=1&limit=10')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeLessThanOrEqual(10);
        expect(response.body.page).toBe(1);
      });

      it('should filter by status', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/work-orders?status=OPEN')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        response.body.data.forEach((wo: any) => {
          expect(wo.status).toBe('OPEN');
        });
      });

      it('should require authentication', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/work-orders');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/work-orders/:id', () => {
      it('should get work order by ID', async () => {
        const response = await request(API_BASE_URL)
          .get(`/api/work-orders/${testWorkOrderId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.workOrderId).toBe(testWorkOrderId);
        expect(response.body).toHaveProperty('title');
      });

      it('should return 404 for non-existent ID', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/work-orders/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/work-orders/:id', () => {
      it('should update work order', async () => {
        const response = await request(API_BASE_URL)
          .put(`/api/work-orders/${testWorkOrderId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'IN_PROGRESS',
            notes: 'Updated via test'
          });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('IN_PROGRESS');
      });

      it('should validate status transitions', async () => {
        const response = await request(API_BASE_URL)
          .put(`/api/work-orders/${testWorkOrderId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'INVALID_STATUS'
          });

        expect(response.status).toBe(400);
      });
    });

    describe('DELETE /api/work-orders/:id', () => {
      it('should delete work order', async () => {
        const response = await request(API_BASE_URL)
          .delete(`/api/work-orders/${testWorkOrderId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        
        // Verify deleted
        const getResponse = await request(API_BASE_URL)
          .get(`/api/work-orders/${testWorkOrderId}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(getResponse.status).toBe(404);
      });
    });
  });

  describe('Properties API', () => {
    let testPropertyId: string;

    describe('POST /api/properties', () => {
      it('should create new property', async () => {
        const response = await request(API_BASE_URL)
          .post('/api/properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Property',
            address: '123 Test St',
            city: 'Riyadh',
            country: 'Saudi Arabia'
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('propertyId');
        testPropertyId = response.body.propertyId;
      });
    });

    describe('GET /api/properties', () => {
      it('should list all properties', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/properties')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/properties/:id', () => {
      it('should get property by ID', async () => {
        const response = await request(API_BASE_URL)
          .get(`/api/properties/${testPropertyId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.propertyId).toBe(testPropertyId);
      });
    });

    describe('PUT /api/properties/:id', () => {
      it('should update property', async () => {
        const response = await request(API_BASE_URL)
          .put(`/api/properties/${testPropertyId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Property Name'
          });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Property Name');
      });
    });
  });

  describe('Assets API', () => {
    describe('GET /api/assets', () => {
      it('should list all assets', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/assets')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter by property', async () => {
        const response = await request(API_BASE_URL)
          .get('/api/assets?propertyId=test-property-id')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        response.body.data.forEach((asset: any) => {
          expect(asset.propertyId).toBe('test-property-id');
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/unknown-route')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return correlation ID in errors', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/work-orders'); // Missing auth

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('correlationId');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle large payloads', async () => {
      const largeData = 'x'.repeat(20 * 1024 * 1024); // 20MB
      const response = await request(API_BASE_URL)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          description: largeData
        });

      expect(response.status).toBe(413); // Payload too large
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const requests = [];
      
      // Make 150 requests (assuming limit is 100/min)
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(API_BASE_URL)
            .get('/api/health')
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle preflight requests', async () => {
      const response = await request(API_BASE_URL)
        .options('/api/work-orders')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database');
    });
  });
});

// Helper function to seed test data
async function seedTestData() {
  // Create test organization
  const Organization = mongoose.model('Organization');
  const org = await Organization.create({
    orgId: 'test-org',
    name: 'Test Organization',
    plan: 'PRO'
  });
  testOrgId = org.orgId;

  // Create test user
  const User = mongoose.model('User');
  const user = await User.create({
    email: 'admin@test.com',
    employeeId: 'EMP001',
    password: 'hashed-password', // In real test, hash properly
    name: 'Admin User',
    orgId: testOrgId,
    role: 'SUPER_ADMIN'
  });
  testUserId = user._id.toString();
}
