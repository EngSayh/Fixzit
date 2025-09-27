Testing framework used: Jest with ts-jest (assumed based on common TS project patterns).
- Tests were added in tests/scripts/seed-marketplace.mjs.test.ts
- If your project uses a different runner (e.g., Vitest/Mocha), adapt the jest.mock calls and assertions accordingly.
- The seeding script is expected to import MockDatabase from ../src/lib/mockDb.js; this is mocked virtually in tests.