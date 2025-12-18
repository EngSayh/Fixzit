## Vitest Projects Split (client/server)

- `test:client` — `vitest -c vitest.config.ts --project client run` (jsdom). Excludes node-only suites (services/jobs/debug/finance/returns/lib).
- `test:server` — `vitest -c vitest.config.ts --project server run` (node). Includes all server/services/jobs/debug/finance/returns/lib suites.

Use these for faster local loops and CI sharding. Full suite: `pnpm vitest run`.
