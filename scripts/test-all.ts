#!/usr/bin/env tsx

/**
 * Comprehensive test script that verifies all key functionality
 */

import { verifyCore } from './verify-core';

async function testAll() {

  const results: { name: string; success: boolean; error?: any }[] = [];
  
  // Test 1: Core functionality

  try {
    const success = await verifyCore();
    results.push({ name: 'Core Functionality', success });

  } catch (error) {
    results.push({ name: 'Core Functionality', success: false, error });

  }
  
  // Test 2: Build verification

  try {
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'pipe' });
    results.push({ name: 'Build Process', success: true });

  } catch (error) {
    results.push({ name: 'Build Process', success: false, error });

  }
  
  // Test 3: TypeScript validation

  try {
    const { execSync } = require('child_process');
    execSync('npm run typecheck', { stdio: 'pipe' });
    results.push({ name: 'TypeScript Validation', success: true });

  } catch (error) {
    results.push({ name: 'TypeScript Validation', success: false, error });

  }
  
  // Test 4: Model loading verification

  try {
    // Test all the models we fixed
    const models = [
      'HelpArticle', 'CmsPage', 'SupportTicket', 'Asset', 'Property', 
      'User', 'Vendor', 'Application', 'AtsSettings', 'Candidate', 
      'Employee', 'Job'
    ];
    
    for (const modelName of models) {
      const model = await import(`../src/server/models/${modelName}`);
      if (!model[modelName]) {
        throw new Error(`Model ${modelName} not exported correctly`);
      }
    }
    
    results.push({ name: 'Model Loading', success: true });

  } catch (error) {
    results.push({ name: 'Model Loading', success: false, error });

  }
  
  // Summary

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';

    if (!result.success && result.error) {

    }
  });

  if (failedTests === 0) {

    return true;
  } else {

    return false;
  }
}

if (require.main === module) {
  testAll().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testAll };