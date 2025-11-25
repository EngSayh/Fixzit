import bcrypt from "bcryptjs";

async function generateHashes() {
  const passwords = [
    { email: "admin@fixzit.co", password: "Admin@123" },
    { email: "tenant@fixzit.co", password: "Tenant@123" },
    { email: "vendor@fixzit.co", password: "Vendor@123" },
  ];

  for (const user of passwords) {
    const hash = await bcrypt.hash(user.password, 10);
    console.log(`${user.email}: ${hash}`);
  }
}

generateHashes();
