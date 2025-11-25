#!/usr/bin/env tsx

/**
 * Wrapper script to run Playwright authentication setup
 * Generates storage state files for all test user roles
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import type { FullConfig } from '@playwright/test';
import globalSetup from './setup-auth';

// Load .env.test file
config({ path: resolve(__dirname, '../.env.test') });

const mockConfig: Pick<FullConfig, 'projects'> = {
  projects: [{
    use: {
      baseURL: process.env.BASE_URL || 'http://localhost:3000'
    }
  }]
} as { projects: Array<{ use: { baseURL: string } }> };

globalSetup(mockConfig)
  .then(() => {
    console.log('\n✅ All authentication states generated successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to generate authentication states:', error);
    process.exit(1);
  });
