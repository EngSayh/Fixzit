## System Issues Report

Date: 2025-10-08

This report lists detected issues across configuration, security, duplication, dependencies, and project structure. Each item includes impact and recommended action.

### Critical

- Hard-coded JWT secret in auth modules
  - Files: `lib/auth.ts`, `src/lib/auth.ts`
  - Impact: Exposes a production-grade secret in source; token forgery risk.
  - Evidence: Both files embed a fixed hex secret for production fallback.
  - Action: Remove hard-coded secret. Require `JWT_SECRET` or load from a secret manager. Fail fast if missing. Rotate current secret.

- Unsigned JWT parsing in middleware
  - File: `middleware.ts`
  - Impact: Accepts forged cookies; authorization bypass risk. Uses `atob` on JWT without signature verification.
  - Action: Verify tokens using `jose` (Edge-compatible) with `JWT_SECRET` before trusting payload. On failure, treat as unauthenticated.

### High

- Massive code duplication: `lib/` mirrors `src/lib/`
  - Files (examples): `auth.ts`, `mongodb-unified.ts`, `marketplace/context.ts`, `marketplace/serverFetch.ts`, `pricing.ts`, `payments/*`, `ats/*`, etc. Duplicates exist in both `lib/` and `src/lib/`.
  - Impact: Divergent behavior, hard-to-reproduce bugs, and import ambiguity.
  - Action: Consolidate into a single canonical tree (recommend `src/lib`). Remove the mirror; update imports.

- Duplicated server layer: `server/` vs `src/server/`
  - Files (examples): `utils/tenant.ts`, `work-orders/wo.service.ts`, `finance/invoice.service.ts`, `middleware/withAuthRbac.ts`, `db/client.ts` exist in both locations.
  - Impact: Split logic, accidental drift, unclear source of truth.
  - Action: Keep only `src/server/`. Remove `server/` and fix imports.

- Conflicting ESLint configurations
  - Files: `eslint.config.js` (flat), `.eslintrc.json`, `.eslintrc.cjs`
  - Impact: Inconsistent lint results, dev friction.
  - Action: Choose one approach (recommend flat config). Delete the others and align `npm run lint` accordingly.

- Tailwind config duplication and invalid export
  - Files: `tailwind.config.js`, `tailwind.config.ts`
  - Impact: Unpredictable Tailwind behavior; `tailwind.config.js` uses ESM `export default` in CJS context.
  - Action: Keep one config. If using JS, switch to `module.exports = config`; else keep `tailwind.config.ts` and delete the JS file.

### Medium

- Next.js image domain misconfiguration
  - File: `next.config.js`
  - Issue: `images.domains` includes `amazonaws.com` which won’t match typical S3 hosts (e.g., `bucket.s3.amazonaws.com`).
  - Action: Use `remotePatterns` or list exact hosts actually used.

- Bcrypt duplication and inconsistency
  - Root app depends on both `bcrypt` and `bcryptjs`; server package (`packages/fixzit-souq-server`) uses `bcrypt` while app imports `bcryptjs`.
  - Impact: Incompatible hashes across services.
  - Action: Standardize on one library across all services; remove the other.

- Types and build tooling in `dependencies`
  - Items: `@types/bcrypt`, `@types/bcryptjs`, `typescript`, `dotenv` (for app), `webpack`, `webpack-cli`.
  - Impact: Larger install size; potential prod bloat.
  - Action: Move types and build-only tools to `devDependencies`. Keep `dotenv` only where a Node service actually needs it at runtime.

- Jest vs Vitest duplication
  - Files: `jest.config.js`, `vitest.config.ts`; scripts use Vitest.
  - Issues: `jest.config.js` references `tests/setup.ts` (missing) and `ts-jest` (not installed).
  - Action: Remove Jest config (or fully wire it up); standardize on Vitest.

- Path alias ambiguity causing duplicate imports
  - Config: `tsconfig.json` defines `@/*` -> `./*` alongside granular aliases like `@lib/*` -> `src/lib/*`.
  - Impact: `import '@/lib/…'` resolves to root `lib/`, not `src/lib/`; easy to import the wrong copy.
  - Action: Remove the broad `@/*` or scope it to `src/*` only. Enforce `@lib/*`, `@server/*`, etc.

- Test file located inside `app/`
  - File: `app/marketplace/page.test.tsx`
  - Impact: Risk of accidental inclusion in the bundle; breaks conventions.
  - Action: Move to `tests/`.

### Low

- Tailwind content globs include non-existent `pages/` directory in `tailwind.config.js`.
  - Action: Remove unused globs.

- Extensive console logging in library code
  - Impact: Noisy logs in production.
  - Action: Gate logs by `NODE_ENV` or centralize via a logger with levels.

### Dependency/version mismatches

- `eslint-config-next` version is `^14.2.15` while Next is `^15.5.4`.
  - Impact: Potential rule incompatibilities.
  - Action: Upgrade to the matching Next 15 ESLint config.

### Environment and CORS

- CORS headers are globally attached; production origin hard-coded to `https://fixzit.co`.
  - Impact: Breaks if additional origins/subdomains are used; cookies need credentials handling.
  - Action: Drive allowed origins from env; if cookies are used, set `Access-Control-Allow-Credentials: true` and avoid `*`.

---

## Recommended Remediation Plan (Order)

1) Secrets and auth
   - Remove hard-coded JWT secrets; enforce env/secret manager. Rotate secret.
   - Update `middleware.ts` to verify JWT with `jose`.

2) Deduplicate source
   - Choose `src/` as canonical. Remove `lib/`, `server/`, and `kb/` duplicates outside `src/`. Fix imports and `tsconfig.paths`.

3) Config cleanup
   - Keep a single ESLint config (flat). Upgrade `eslint-config-next` to ^15. Remove old configs.
   - Keep a single Tailwind config; fix export style and globs.

4) Dependencies
   - Standardize on one bcrypt library across all services.
   - Move types and build-only tools to `devDependencies`.

5) Testing
   - Standardize on Vitest (or Jest), not both. Remove the unused config and files. Relocate `.test.tsx` out of `app/`.

6) Next config
   - Replace `images.domains` with accurate hosts or `remotePatterns`.
   - Parameterize CORS via env; handle credentials if required.

## Notes

- Many `eslint-disable`/`@ts-ignore` occurrences are confined to tests, which is acceptable if kept out of production paths.

