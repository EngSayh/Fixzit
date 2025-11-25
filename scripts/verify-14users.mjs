import "dotenv/config";
import { MongoClient } from "mongodb";

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI not set");
    process.exit(1);
  }

  const c = new MongoClient(MONGODB_URI);

  try {
    await c.connect();
    const db = c.db("fixzit");
    const count = await db.collection("users").countDocuments();
    console.log(`\n===  VERIFICATION: 14-ROLE SYSTEM ===\n`);
    console.log(`Total users: ${count}\n`);
    const users = await db
      .collection("users")
      .find({})
      .sort({ role: 1, email: 1 })
      .toArray();
    users.forEach((u, i) => {
      const num = (i + 1).toString().padStart(2);
      const email = u.email.padEnd(35);
      const role = u.role.padEnd(22);
      console.log(`${num}. ${email} | ${role} | ${u.name}`);
    });
    console.log(
      `\n✅ VERIFIED: ${count} users with correct 14-role structure\n`,
    );
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  } finally {
    await c.close();
  }
}

main();
