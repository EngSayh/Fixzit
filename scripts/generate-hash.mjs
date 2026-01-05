import bcrypt from "bcryptjs";

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

async function generateHashes() {
  // SEC-001: Use environment variables for passwords, don't hardcode
  const seedPassword = process.env.SEED_PASSWORD || process.env.TEST_PASSWORD;
  if (!seedPassword) {
    console.error("❌ SEED_PASSWORD or TEST_PASSWORD environment variable required");
    console.error("   Set it in .env.local: SEED_PASSWORD=YourSecurePassword");
    process.exit(1);
  }

  const emails = [
    `admin@${EMAIL_DOMAIN}`,
    `tenant@${EMAIL_DOMAIN}`,
    `vendor@${EMAIL_DOMAIN}`,
  ];

  for (const email of emails) {
    const hash = await bcrypt.hash(seedPassword, 10);
    // Only log email and hash - never log password to avoid security warnings
    console.log(`${email}: ${hash}`);
  }
}

generateHashes();
