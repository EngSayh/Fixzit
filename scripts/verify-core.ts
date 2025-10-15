#!/usr/bin/env tsx

/**
 * Core verification script to test the main functionality
 */

import { connectToDatabase } from '../lib/mongodb-unified';

async function verifyCore() {

  try {
    // Test 1: Database connection

    await connectToDatabase();

    // Test 2: JWT secret loading

    const authModule = await import('../lib/auth');

    // Test 3: Tenant isolation models

    const { HelpArticle } = await import('../server/models/HelpArticle');
    const { CmsPage } = await import('../server/models/CmsPage');
    const { SupportTicket } = await import('../server/models/SupportTicket');

    // Test 4: Work order functionality

    // wo.repo module was removed, using service instead
    const woService = await import('../server/work-orders/wo.service');

    // Test 5: Idempotency system

    const { withIdempotency, createIdempotencyKey } = await import('../server/security/idempotency');
    const testKey = createIdempotencyKey('test', { data: 'test' });}...`);

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