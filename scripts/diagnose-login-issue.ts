#!/usr/bin/env tsx
/**
 * Login Issue Diagnostic Script
 * Checks common issues preventing successful login
 */

import { connectDB } from '../lib/mongo';
import User from '../models/User';

async function diagnose() {
  console.log('='.repeat(70));
  console.log('🔍 LOGIN ISSUE DIAGNOSTIC');
  console.log('='.repeat(70));
  console.log('');

  // Check 1: Environment variables
  console.log('📋 Step 1: Environment Variables');
  console.log('-'.repeat(70));
  
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const nextauthUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  const superadminEmail = process.env.NEXTAUTH_SUPERADMIN_EMAIL;
  
  console.log(`AUTH_SECRET/NEXTAUTH_SECRET: ${authSecret ? '✅ Set' : '❌ MISSING'}`);
  console.log(`NEXTAUTH_URL: ${nextauthUrl || '❌ MISSING'}`);
  console.log(`NEXTAUTH_SUPERADMIN_EMAIL: ${superadminEmail || '❌ Not configured'}`);
  console.log('');

  if (!authSecret) {
    console.log('❌ CRITICAL: AUTH_SECRET is required for session cookies');
    console.log('   Set AUTH_SECRET in Vercel production environment variables');
    console.log('');
  }

  if (nextauthUrl !== 'https://fixzit.co' && process.env.NODE_ENV === 'production') {
    console.log('⚠️  WARNING: NEXTAUTH_URL should be https://fixzit.co for production');
    console.log(`   Current: ${nextauthUrl}`);
    console.log('');
  }

  // Check 2: Database connection
  console.log('📋 Step 2: Database Connection');
  console.log('-'.repeat(70));
  
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
    console.log('');
  } catch (error) {
    console.log('❌ Database connection failed:', error);
    console.log('');
    process.exit(1);
  }

  // Check 3: User account
  if (superadminEmail) {
    console.log('📋 Step 3: Superadmin Account Check');
    console.log('-'.repeat(70));
    
    try {
      const user = await User.findOne({ email: superadminEmail }).lean();
      
      if (!user) {
        console.log(`❌ User not found: ${superadminEmail}`);
        console.log('   Create the user account first');
      } else {
        console.log(`✅ User found: ${user.email}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   isSuperAdmin: ${user.isSuperAdmin ? '✅ YES' : '❌ NO'}`);
        console.log(`   orgId: ${user.orgId || '❌ NOT SET'}`);
        console.log(`   isActive: ${user.isActive !== false ? '✅ YES' : '❌ NO'}`);
        console.log('');

        // Diagnosis
        console.log('📋 Step 4: Login Path Diagnosis');
        console.log('-'.repeat(70));
        
        if (user.isSuperAdmin) {
          console.log('✅ This is a SUPERADMIN account');
          console.log('');
          console.log('🎯 CORRECT LOGIN URL:');
          console.log('   https://fixzit.co/superadmin/login');
          console.log('');
          console.log('❌ WRONG LOGIN URL (will cause redirect loop):');
          console.log('   https://fixzit.co/login');
          console.log('');
          console.log('📌 Why this matters:');
          console.log('   - /login is for normal users with orgId');
          console.log('   - Superadmin does NOT have orgId (by design)');
          console.log('   - Using /login causes: Success → Redirect to /fm → Missing orgId → Redirect to /login → LOOP');
          console.log('');
        } else if (!user.orgId) {
          console.log('⚠️  This user is NOT a superadmin but has NO orgId');
          console.log('');
          console.log('🔧 FIX REQUIRED:');
          console.log('   Option 1: Assign user to an organization');
          console.log('   Option 2: Set isSuperAdmin: true');
          console.log('');
          console.log('   Without orgId, middleware will reject access to /fm/* routes');
          console.log('');
        } else {
          console.log('✅ This is a NORMAL USER with orgId');
          console.log('');
          console.log('🎯 CORRECT LOGIN URL:');
          console.log('   https://fixzit.co/login');
          console.log('');
          console.log(`   After login, you should reach: /fm/dashboard`);
          console.log('');
        }
      }
    } catch (error) {
      console.log('❌ Error checking user:', error);
    }
  }

  // Check 4: Session configuration
  console.log('📋 Step 5: Session Configuration');
  console.log('-'.repeat(70));
  console.log('Session settings in auth.config.ts:');
  console.log('   Strategy: JWT');
  console.log('   MaxAge: 15 minutes');
  console.log('   Cookie: HTTP-only, Secure (in production)');
  console.log('');
  console.log('🔍 To verify cookies after login:');
  console.log('   1. Login at correct URL');
  console.log('   2. Open DevTools → Application → Cookies → fixzit.co');
  console.log('   3. Look for: __Secure-authjs.session-token (or similar)');
  console.log('');
  console.log('❌ If NO cookie appears:');
  console.log('   - Check AUTH_SECRET is set in Vercel');
  console.log('   - Check NEXTAUTH_URL matches your domain');
  console.log('   - Check browser console for cookie errors');
  console.log('');

  console.log('='.repeat(70));
  console.log('✅ DIAGNOSIS COMPLETE');
  console.log('='.repeat(70));
  
  process.exit(0);
}

diagnose().catch(console.error);
