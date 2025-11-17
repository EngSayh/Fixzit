#!/usr/bin/env tsx
/**
 * Environment validation script for notification smoke tests.
 * 
 * Usage:
 *   pnpm tsx scripts/validate-notification-env.ts
 * 
 * Checks that all required environment variables are configured
 * for each notification channel before running smoke tests.
 */

import 'dotenv/config';

interface ValidationResult {
  channel: string;
  required: string[];
  missing: string[];
  configured: string[];
  status: 'ready' | 'incomplete' | 'not-configured';
}

interface EnvCheck {
  name: string;
  value: string | undefined;
  isSet: boolean;
  preview?: string;
}

const CHANNELS = {
  common: {
    name: 'Common (All Channels)',
    required: [
      'NOTIFICATIONS_SMOKE_USER_ID',
      'NOTIFICATIONS_SMOKE_NAME',
      'NOTIFICATIONS_SMOKE_EMAIL'
    ]
  },
  email: {
    name: 'Email (SendGrid)',
    required: [
      'SENDGRID_API_KEY',
      'SENDGRID_FROM_EMAIL',
      'SENDGRID_FROM_NAME'
    ]
  },
  sms: {
    name: 'SMS (Twilio)',
    required: [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
      'NOTIFICATIONS_SMOKE_PHONE'
    ]
  },
  push: {
    name: 'Push (Firebase)',
    required: [
      'FIREBASE_ADMIN_PROJECT_ID',
      'FIREBASE_ADMIN_CLIENT_EMAIL',
      'FIREBASE_ADMIN_PRIVATE_KEY'
    ]
  },
  whatsapp: {
    name: 'WhatsApp',
    required: [
      'WHATSAPP_BUSINESS_API_KEY',
      'WHATSAPP_PHONE_NUMBER_ID',
      'NOTIFICATIONS_SMOKE_PHONE'
    ]
  }
};

function checkEnvVar(name: string): EnvCheck {
  const value = process.env[name];
  const isSet = Boolean(value && value.trim() !== '');
  
  let preview: string | undefined;
  if (isSet && value) {
    // Show preview for verification (mask sensitive parts)
    if (name.includes('KEY') || name.includes('TOKEN') || name.includes('SECRET')) {
      preview = value.length > 10 
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
        : '***';
    } else if (name.includes('EMAIL')) {
      const [local, domain] = value.split('@');
      preview = local ? `${local.substring(0, 3)}...@${domain}` : value;
    } else if (name.includes('PHONE')) {
      preview = value.length > 4 
        ? `${value.substring(0, 4)}...${value.substring(value.length - 2)}`
        : value;
    } else {
      preview = value.length > 30 ? `${value.substring(0, 27)}...` : value;
    }
  }
  
  return { name, value, isSet, preview };
}

function validateChannel(channelKey: string, channelConfig: { name: string; required: string[] }): ValidationResult {
  const checks = channelConfig.required.map(checkEnvVar);
  const configured = checks.filter(c => c.isSet).map(c => c.name);
  const missing = checks.filter(c => !c.isSet).map(c => c.name);
  
  let status: 'ready' | 'incomplete' | 'not-configured';
  if (missing.length === 0) {
    status = 'ready';
  } else if (configured.length > 0) {
    status = 'incomplete';
  } else {
    status = 'not-configured';
  }
  
  return {
    channel: channelConfig.name,
    required: channelConfig.required,
    missing,
    configured,
    status
  };
}

function printResults(results: ValidationResult[]): void {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   NOTIFICATION SMOKE TEST - ENVIRONMENT VALIDATION          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  for (const result of results) {
    const statusIcon = {
      'ready': '✅',
      'incomplete': '⚠️',
      'not-configured': '❌'
    }[result.status];
    
    console.log(`${statusIcon} ${result.channel}`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    
    if (result.configured.length > 0) {
      console.log(`   Configured: ${result.configured.length}/${result.required.length}`);
      for (const varName of result.configured) {
        const check = checkEnvVar(varName);
        console.log(`      ✓ ${varName} ${check.preview ? `(${check.preview})` : ''}`);
      }
    }
    
    if (result.missing.length > 0) {
      console.log(`   Missing: ${result.missing.length}/${result.required.length}`);
      for (const varName of result.missing) {
        console.log(`      ✗ ${varName}`);
      }
    }
    
    console.log('');
  }
}

function printSummary(results: ValidationResult[]): void {
  const ready = results.filter(r => r.status === 'ready').length;
  const incomplete = results.filter(r => r.status === 'incomplete').length;
  const notConfigured = results.filter(r => r.status === 'not-configured').length;
  const total = results.length;
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   SUMMARY                                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`   Total Channels: ${total}`);
  console.log(`   ✅ Ready:          ${ready}`);
  console.log(`   ⚠️  Incomplete:     ${incomplete}`);
  console.log(`   ❌ Not Configured: ${notConfigured}\n`);
  
  if (ready === total) {
    console.log('🎉 All notification channels are configured and ready!\n');
    console.log('   Run smoke tests with:');
    console.log('   pnpm tsx scripts/notifications-smoke.ts push email sms whatsapp\n');
  } else if (ready > 0) {
    console.log('⚡ Some channels are ready. You can test configured channels:\n');
    
    const readyChannels = results
      .filter(r => r.status === 'ready')
      .map(r => r.channel.split(' ')[0].toLowerCase())
      .filter(name => name !== 'common');
    
    if (readyChannels.length > 0) {
      console.log(`   pnpm tsx scripts/notifications-smoke.ts ${readyChannels.join(' ')}\n`);
    }
    
    if (incomplete > 0 || notConfigured > 0) {
      console.log('📝 Complete missing configuration in .env.local to enable all channels.\n');
    }
  } else {
    console.log('❌ No notification channels are fully configured.\n');
    console.log('📚 Setup Guide:');
    console.log('   1. Quick Start: NOTIFICATION_SMOKE_TEST_QUICKSTART.md');
    console.log('   2. Full Guide:  NOTIFICATION_SMOKE_TEST_SETUP.md\n');
  }
}

function printQuickFixes(results: ValidationResult[]): void {
  const incompleteOrMissing = results.filter(r => r.status !== 'ready');
  
  if (incompleteOrMissing.length === 0) return;
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   QUICK FIXES                                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  for (const result of incompleteOrMissing) {
    if (result.missing.length === 0) continue;
    
    console.log(`📋 ${result.channel}:\n`);
    
    const channelKey = result.channel.split(' ')[0].toLowerCase();
    
    switch (channelKey) {
      case 'common':
        console.log('   Set these in .env.local:');
        console.log('   NOTIFICATIONS_SMOKE_USER_ID=<mongodb_user_id>');
        console.log('   NOTIFICATIONS_SMOKE_NAME="Ops On-Call"');
        console.log('   NOTIFICATIONS_SMOKE_EMAIL=<your_test_email@example.com>\n');
        break;
        
      case 'email':
        console.log('   Get SendGrid API key:');
        console.log('   1. Visit: https://app.sendgrid.com/settings/api_keys');
        console.log('   2. Create API Key → Mail Send permission');
        console.log('   3. Add to .env.local:');
        console.log('      SENDGRID_API_KEY=SG.your_key_here');
        console.log('      SENDGRID_FROM_EMAIL=noreply@fixzit.co');
        console.log('      SENDGRID_FROM_NAME="Fixzit Notifications"\n');
        break;
        
      case 'sms':
        console.log('   Get Twilio credentials:');
        console.log('   1. Visit: https://console.twilio.com');
        console.log('   2. Copy Account SID and Auth Token from dashboard');
        console.log('   3. Get phone number from Phone Numbers → Manage');
        console.log('   4. Add to .env.local:');
        console.log('      TWILIO_ACCOUNT_SID=AC...');
        console.log('      TWILIO_AUTH_TOKEN=...');
        console.log('      TWILIO_PHONE_NUMBER=+1555...\n');
        break;
        
      case 'push':
        console.log('   Get Firebase credentials:');
        console.log('   1. Visit: https://console.firebase.google.com');
        console.log('   2. Settings → Service Accounts → Generate New Private Key');
        console.log('   3. Add to .env.local from downloaded JSON:');
        console.log('      FIREBASE_ADMIN_PROJECT_ID=your-project-id');
        console.log('      FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@...iam.gserviceaccount.com');
        console.log('      FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"\n');
        break;
        
      case 'whatsapp':
        console.log('   Get WhatsApp credentials:');
        console.log('   1. Visit: https://business.facebook.com');
        console.log('   2. WhatsApp → API Setup');
        console.log('   3. Add to .env.local:');
        console.log('      WHATSAPP_BUSINESS_API_KEY=...');
        console.log('      WHATSAPP_PHONE_NUMBER_ID=...\n');
        break;
    }
  }
}

async function main(): Promise<void> {
  const results: ValidationResult[] = [];
  
  // Validate each channel
  for (const [key, config] of Object.entries(CHANNELS)) {
    results.push(validateChannel(key, config));
  }
  
  // Print results
  printResults(results);
  printSummary(results);
  printQuickFixes(results);
  
  // Exit code based on readiness
  const allReady = results.every(r => r.status === 'ready');
  const someReady = results.some(r => r.status === 'ready');
  
  if (allReady) {
    process.exit(0);
  } else if (someReady) {
    process.exit(1);
  } else {
    process.exit(2);
  }
}

void main();
