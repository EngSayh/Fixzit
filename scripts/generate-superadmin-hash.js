#!/usr/bin/env node

/**
 * Generate Superadmin Password Hash (Secure - No Args)
 * 
 * Usage (safe - password never touches history):
 *   read -s SUPERADMIN_PASSWORD && echo
 *   node scripts/generate-superadmin-hash.js
 *   unset SUPERADMIN_PASSWORD
 * 
 * Or pipe directly:
 *   echo -n "YourPassword" | node scripts/generate-superadmin-hash.js
 * 
 * Output: bcrypt hash for SUPERADMIN_PASSWORD_HASH in Vercel
 */

(async () => {
  let bcrypt;
  try {
    bcrypt = require('bcryptjs');
  } catch {
    try {
      bcrypt = require('bcrypt');
    } catch {
      console.error('❌ Error: bcryptjs or bcrypt package not found');
      console.error('   Run: pnpm install bcryptjs');
      process.exit(1);
    }
  }

  // Get password from env var (set via `read -s`) or stdin
  let password = process.env.SUPERADMIN_PASSWORD;

  if (!password && !process.stdin.isTTY) {
    // Read from stdin (piped input)
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    password = Buffer.concat(chunks).toString('utf8').trim();
  }

  if (!password) {
    console.error('❌ Usage:');
    console.error('   Method 1 (recommended):');
    console.error('     read -s SUPERADMIN_PASSWORD && echo');
    console.error('     node scripts/generate-superadmin-hash.js');
    console.error('     unset SUPERADMIN_PASSWORD');
    console.error('');
    console.error('   Method 2 (pipe):');
    console.error('     echo -n "YourPassword" | node scripts/generate-superadmin-hash.js');
    process.exit(1);
  }

  if (password.length < 12) {
    console.warn('⚠️  Warning: Password should be at least 12 characters');
  }

  const hash = await bcrypt.hash(password, 12);

  console.log('\n✅ Bcrypt hash generated (cost factor: 12):');
  console.log(hash);
  console.log('\n📋 Next steps:');
  console.log('1. Copy the hash above');
  console.log('2. Vercel → Settings → Environment Variables → Production');
  console.log('3. Set SUPERADMIN_PASSWORD_HASH to this value (mark as Sensitive)');
  console.log('4. Decide on SUPERADMIN_SECRET_KEY (optional 2FA)');
  console.log('5. Redeploy production');
  console.log('\n🔒 Security: This script never stores passwords\n');
})();
