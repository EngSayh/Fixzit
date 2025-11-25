// Seed runner - using CommonJS for easier execution
require("dotenv").config({ path: ".env.local" });

const seedScript = async () => {
  // Clear require cache
  delete require.cache[require.resolve("../src/lib/mongo")];
  delete require.cache[require.resolve("../src/server/models/User")];
  delete require.cache[require.resolve("./seed-users")];

  // Import and run
  const seedUsers = require("./seed-users").default;
  await seedUsers();
};

seedScript()
  .then(() => {
    console.log("Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
