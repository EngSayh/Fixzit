/**
 * Check which environment variables are available on Vercel production
 */

const envVars = {
  // Core Authentication
  'MONGODB_URI': !!process.env.MONGODB_URI,
  'NEXTAUTH_SECRET': !!process.env.NEXTAUTH_SECRET,
  'NEXTAUTH_URL': !!process.env.NEXTAUTH_URL,
  'JWT_SECRET': !!process.env.JWT_SECRET,
  'INTERNAL_API_SECRET': !!process.env.INTERNAL_API_SECRET,
  
  // OAuth
  'GOOGLE_CLIENT_ID': !!process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': !!process.env.GOOGLE_CLIENT_SECRET,
  
  // Email
  'SENDGRID_API_KEY': !!process.env.SENDGRID_API_KEY,
  'SENDGRID_FROM_EMAIL': !!process.env.SENDGRID_FROM_EMAIL,
  'SENDGRID_FROM_NAME': !!process.env.SENDGRID_FROM_NAME,
  
  // SMS
  'TWILIO_ACCOUNT_SID': !!process.env.TWILIO_ACCOUNT_SID,
  'TWILIO_AUTH_TOKEN': !!process.env.TWILIO_AUTH_TOKEN,
  'TWILIO_PHONE_NUMBER': !!process.env.TWILIO_PHONE_NUMBER,
  
  // Storage
  'AWS_S3_BUCKET': !!process.env.AWS_S3_BUCKET,
  'AWS_REGION': !!process.env.AWS_REGION,
  'AWS_ACCESS_KEY_ID': !!process.env.AWS_ACCESS_KEY_ID,
  'AWS_SECRET_ACCESS_KEY': !!process.env.AWS_SECRET_ACCESS_KEY,
  
  // Search
  'MEILI_HOST': !!process.env.MEILI_HOST,
  'MEILI_MASTER_KEY': !!process.env.MEILI_MASTER_KEY,
  
  // Payment - PayTabs
  'PAYTABS_PROFILE_ID': !!process.env.PAYTABS_PROFILE_ID,
  'PAYTABS_SERVER_KEY': !!process.env.PAYTABS_SERVER_KEY,
  'PAYTABS_CLIENT_KEY': !!process.env.PAYTABS_CLIENT_KEY,
  
  // Payment - Tap
  'TAP_SECRET_KEY': !!process.env.TAP_SECRET_KEY,
  'TAP_PUBLIC_KEY': !!process.env.TAP_PUBLIC_KEY,
  
  // ZATCA
  'ZATCA_API_KEY': !!process.env.ZATCA_API_KEY,
  'ZATCA_API_SECRET': !!process.env.ZATCA_API_SECRET,
  'ZATCA_SELLER_NAME': !!process.env.ZATCA_SELLER_NAME,
  'ZATCA_VAT_NUMBER': !!process.env.ZATCA_VAT_NUMBER,
  
  // AI
  'OPENAI_API_KEY': !!process.env.OPENAI_API_KEY,
  'COPILOT_MODEL': !!process.env.COPILOT_MODEL,
  
  // Maps
  'GOOGLE_MAPS_API_KEY': !!process.env.GOOGLE_MAPS_API_KEY,
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  
  // URLs
  'NEXT_PUBLIC_APP_URL': !!process.env.NEXT_PUBLIC_APP_URL,
  'BASE_URL': !!process.env.BASE_URL,
  'PUBLIC_BASE_URL': !!process.env.PUBLIC_BASE_URL,
  'APP_URL': !!process.env.APP_URL,
  
  // Redis
  'REDIS_URL': !!process.env.REDIS_URL,
  'REDIS_PASSWORD': !!process.env.REDIS_PASSWORD,
  
  // Feature Flags
  'ATS_ENABLED': !!process.env.ATS_ENABLED,
  'MARKETPLACE_ENABLED': !!process.env.MARKETPLACE_ENABLED,
  'WO_ENABLED': !!process.env.WO_ENABLED,
  
  // Org IDs
  'PUBLIC_ORG_ID': !!process.env.PUBLIC_ORG_ID,
  'TEST_ORG_ID': !!process.env.TEST_ORG_ID,
  'DEFAULT_ORG_ID': !!process.env.DEFAULT_ORG_ID,
  
  // Firebase
  'FIREBASE_ADMIN_PROJECT_ID': !!process.env.FIREBASE_ADMIN_PROJECT_ID,
  'FIREBASE_ADMIN_CLIENT_EMAIL': !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  'FIREBASE_ADMIN_PRIVATE_KEY': !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  
  // Notifications
  'NOTIFICATIONS_SMOKE_USER_ID': !!process.env.NOTIFICATIONS_SMOKE_USER_ID,
  'NOTIFICATIONS_TELEMETRY_WEBHOOK': !!process.env.NOTIFICATIONS_TELEMETRY_WEBHOOK,
  'WHATSAPP_BUSINESS_API_KEY': !!process.env.WHATSAPP_BUSINESS_API_KEY,
  'WHATSAPP_PHONE_NUMBER_ID': !!process.env.WHATSAPP_PHONE_NUMBER_ID,
  
  // Monitoring
  'SENTRY_DSN': !!process.env.SENTRY_DSN,
  'DATADOG_API_KEY': !!process.env.DATADOG_API_KEY,
  
  // Background Jobs
  'CRON_SECRET': !!process.env.CRON_SECRET,
  
  // Security
  'FILE_SIGNING_SECRET': !!process.env.FILE_SIGNING_SECRET,
  'LOG_HASH_SALT': !!process.env.LOG_HASH_SALT,
  
  // Shipping
  'ARAMEX_ACCOUNT_NUMBER': !!process.env.ARAMEX_ACCOUNT_NUMBER,
  'ARAMEX_USERNAME': !!process.env.ARAMEX_USERNAME,
  'SMSA_USERNAME': !!process.env.SMSA_USERNAME,
  'SPL_API_KEY': !!process.env.SPL_API_KEY,
};

console.log('Environment Variables Status:\n');
console.log('✅ = Configured (exists)');
console.log('❌ = Missing (not set)\n');

const categories = {
  '🔐 Core Authentication': ['MONGODB_URI', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'JWT_SECRET', 'INTERNAL_API_SECRET'],
  '🌐 OAuth': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  '📧 Email': ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'SENDGRID_FROM_NAME'],
  '📱 SMS': ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
  '☁️ Storage (AWS S3)': ['AWS_S3_BUCKET', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  '🔍 Search': ['MEILI_HOST', 'MEILI_MASTER_KEY'],
  '💳 Payment - PayTabs': ['PAYTABS_PROFILE_ID', 'PAYTABS_SERVER_KEY', 'PAYTABS_CLIENT_KEY'],
  '💰 Payment - Tap': ['TAP_SECRET_KEY', 'TAP_PUBLIC_KEY'],
  '🇸🇦 ZATCA': ['ZATCA_API_KEY', 'ZATCA_API_SECRET', 'ZATCA_SELLER_NAME', 'ZATCA_VAT_NUMBER'],
  '🤖 AI': ['OPENAI_API_KEY', 'COPILOT_MODEL'],
  '🗺️ Maps': ['GOOGLE_MAPS_API_KEY', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'],
  '🌍 URLs': ['NEXT_PUBLIC_APP_URL', 'BASE_URL', 'PUBLIC_BASE_URL', 'APP_URL'],
  '⚡ Redis': ['REDIS_URL', 'REDIS_PASSWORD'],
  '🎚️ Feature Flags': ['ATS_ENABLED', 'MARKETPLACE_ENABLED', 'WO_ENABLED'],
  '🏢 Organization': ['PUBLIC_ORG_ID', 'TEST_ORG_ID', 'DEFAULT_ORG_ID'],
  '🔥 Firebase': ['FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY'],
  '🔔 Notifications': ['NOTIFICATIONS_SMOKE_USER_ID', 'NOTIFICATIONS_TELEMETRY_WEBHOOK', 'WHATSAPP_BUSINESS_API_KEY', 'WHATSAPP_PHONE_NUMBER_ID'],
  '📊 Monitoring': ['SENTRY_DSN', 'DATADOG_API_KEY'],
  '⏱️ Jobs': ['CRON_SECRET'],
  '🔒 Security': ['FILE_SIGNING_SECRET', 'LOG_HASH_SALT'],
  '📦 Shipping': ['ARAMEX_ACCOUNT_NUMBER', 'ARAMEX_USERNAME', 'SMSA_USERNAME', 'SPL_API_KEY'],
};

let totalConfigured = 0;
let totalMissing = 0;

for (const [category, vars] of Object.entries(categories)) {
  console.log(`\n${category}`);
  console.log('─'.repeat(50));
  
  for (const varName of vars) {
    const status = envVars[varName];
    const icon = status ? '✅' : '❌';
    console.log(`  ${icon} ${varName}`);
    
    if (status) totalConfigured++;
    else totalMissing++;
  }
}

console.log('\n' + '═'.repeat(50));
console.log(`\n📊 Summary:`);
console.log(`   ✅ Configured: ${totalConfigured}`);
console.log(`   ❌ Missing: ${totalMissing}`);
console.log(`   📈 Coverage: ${Math.round((totalConfigured / (totalConfigured + totalMissing)) * 100)}%\n`);

if (totalMissing > 0) {
  console.log('⚠️  Missing variables may cause features to fail!');
}
