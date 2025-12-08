import bcrypt from "bcryptjs";

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

async function generateHashes() {
  const passwords = [
    { email: `admin@${EMAIL_DOMAIN}`, password: "Admin@123" },
    { email: `tenant@${EMAIL_DOMAIN}`, password: "Tenant@123" },
    { email: `vendor@${EMAIL_DOMAIN}`, password: "Vendor@123" },
  ];

  for (const user of passwords) {
    const hash = await bcrypt.hash(user.password, 10);
    console.log(`${user.email}: ${hash}`);
  }
}

generateHashes();
