import { MongoClient } from "mongodb";
import { cfg } from "../config.js";
import pc from "picocolors";
const client = new MongoClient(cfg.mongoUri);

async function up() {
  try {
    await client.connect();
  } catch (e) {
    console.log(pc.yellow("⚠ Skipping seed: Mongo not reachable."));
    process.exit(0);
  }
  const db = client.db(cfg.mongoDb);

  const org = await db.collection("organizations").findOneAndUpdate(
    { code: "TEST-ORG" },
    {
      $setOnInsert: {
        code: "TEST-ORG",
        name: "Fixzit QA Org",
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  await db.collection("users").updateOne(
    { email: cfg.users.admin.email },
    {
      $setOnInsert: {
        email: cfg.users.admin.email,
        password_hash: cfg.users.admin.password, // NOTE: replace with real hash if your app requires it
        roles: ["super_admin"],
        orgId: org.value?._id || org._id,
        active: true,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  await db.collection("properties").updateOne(
    { code: "QA-PROP-001" },
    {
      $setOnInsert: {
        code: "QA-PROP-001",
        name: "QA Tower",
        city: "Riyadh",
        orgId: org.value?._id || org._id,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  await db.collection("workorders").updateOne(
    { code: "QA-WO-0001" },
    {
      $setOnInsert: {
        code: "QA-WO-0001",
        title: "QA Smoke Test WO",
        status: "New",
        orgId: org.value?._id || org._id,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  console.log(pc.green("✔ Seed complete (org/users/properties/workorders)."));
}

up()
  .catch((e) => {
    console.error(pc.red(e));
    process.exit(1);
  })
  .finally(() => client.close());
