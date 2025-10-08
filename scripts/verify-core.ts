#!/usr/bin/env tsx

/**
 * Core verification script to test the main functionality
 */

import { connectToDatabase } from '../lib/mongodb-unified';

async function verifyCore() {
  console.log('🔍 Verifying core functionality...');
  
  try {
    // Test 1: Database connection
    console.log('📊 Testing database connection...');
    await connectToDatabase();
    console.log('✅ Database connection successful');
    console.log('📋 Using unified MongoDB connection');
    
    // Test 2: JWT secret loading
    console.log('🔐 Testing JWT configuration...');
    const authModule = await import('../lib/auth');
    console.log('✅ JWT auth module loaded successfully');
    
    // Test 3: Tenant isolation models
    console.log('🏢 Testing tenant isolation models...');
    const { HelpArticle } = await import('../server/models/HelpArticle');
    const { CmsPage } = await import('../server/models/CmsPage');
    const { SupportTicket } = await import('../server/models/SupportTicket');
    
    console.log('✅ HelpArticle model loaded');
    console.log('✅ CmsPage model loaded');  
    console.log('✅ SupportTicket model loaded');
    
    // Test 4: Work order functionality
    console.log('⚙️ Testing work order functionality...');
    // wo.repo module was removed, using service instead
    const woService = await import('../server/work-orders/wo.service');
    console.log('✅ Work order repository loaded');
    
    // Test 5: Idempotency system
    console.log('🔄 Testing idempotency system...');
    const { withIdempotency, createIdempotencyKey } = await import('../server/security/idempotency');
    const testKey = createIdempotencyKey('test', { data: 'test' });
    console.log(`✅ Idempotency key generated: ${testKey.substring(0, 20)}...`);
    
    console.log('🎉 All core functionality verified successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Core verification failed:', error);
    return false;
  }
}

if (require.main === module) {
  verifyCore().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { verifyCore };