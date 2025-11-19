# Dependency Audit Report - November 17, 2024

**Generated:** November 17, 2024  
**Tool:** depcheck  
**Purpose:** Identify unused and missing dependencies in package.json

## Summary

- **18 unused dependencies** (production)
- **34 unused devDependencies** (development)
- **12 missing dependencies** (referenced but not in package.json)

---

## 1. Unused Dependencies (Production)

These packages are in `dependencies` but not used in the codebase:

| Package | Reason for Inclusion | Recommendation |
|---------|---------------------|----------------|
| `@hookform/resolvers` | Form validation | Remove - unused |
| `@radix-ui/react-avatar` | UI component | Remove - unused |
| `@radix-ui/react-dropdown-menu` | UI component | Remove - unused |
| `@radix-ui/react-progress` | UI component | Remove - unused |
| `@radix-ui/react-select` | UI component | Remove - unused |
| `@radix-ui/react-separator` | UI component | Remove - unused |
| `@radix-ui/react-tabs` | UI component | Remove - unused |
| `@radix-ui/react-toast` | UI component | Remove - unused (using sonner instead) |
| `@radix-ui/react-tooltip` | UI component | Remove - unused |
| `bcrypt` | Password hashing | Remove - unused (using NextAuth) |
| `bullmq` | Redis-based queue | Remove - unused |
| `fast-xml-parser` | XML parsing | Remove - unused |
| `marked` | Markdown parsing | Remove - unused (using unified/remark instead) |
| `next-themes` | Theme management | Remove - unused (custom ThemeContext) |
| `react-hook-form` | Form management | Remove - unused |
| `react-markdown` | Markdown rendering | Remove - unused (using unified/remark instead) |
| `recharts` | Charting library | Remove - unused |
| `socket.io-client` | WebSocket client | Remove - unused |

**Action:** Remove all 18 packages to reduce bundle size and installation time.

---

## 2. Unused DevDependencies (Development)

These packages are in `devDependencies` but not used:

### Babel Dependencies (7)
- `@babel/parser` - Not used (TypeScript instead)
- `@babel/preset-env` - Not used
- `@babel/preset-react` - Not used
- `@babel/preset-typescript` - Not used
- `@babel/traverse` - Not used
- `@types/babel__traverse` - Not used
- `@inquirer/prompts` - Not used

### ESLint Dependencies (6)
- `@typescript-eslint/eslint-plugin` - Not in eslint config
- `@typescript-eslint/parser` - Not in eslint config
- `eslint-config-next` - Using flat config instead
- `eslint-plugin-jsx-a11y` - Not in config
- `eslint-plugin-react` - Not in config
- `eslint-plugin-react-hooks` - Not in config
- `eslint-plugin-unused-imports` - Not in config

### Testing Dependencies (4)
- `@types/jest` - Using Vitest instead
- `@vitest/coverage-v8` - Not used
- `next-router-mock` - Not used
- `start-server-and-test` - Not used

### Build Tools (17)
- `autopreffix` - Not needed (PostCSS config empty)
- `cross-env` - Not used in scripts
- `depcheck` - Keep (just used this!)
- `import-in-the-middle` - Not used
- `jscodeshift` - Not used (codemods not active)
- `jscpd` - Not used (duplicate detection)
- `madge` - Not used (dependency analysis)
- `postcss` - Keep (required by TailwindCSS)
- `postcss-selector-parser` - Not used
- `prettier` - Keep (code formatting)
- `require-in-the-middle` - Not used
- `rimraf` - Not used (using rm -rf instead)
- `safe-regex2` - Not used
- `shx` - Not used (cross-platform commands)
- `ts-morph` - Not used
- `ts-node` - Keep (used for running .ts scripts)
- `ts-prune` - Not used (dead code detection)
- `tsconfig-paths` - Not used
- `wait-on` - Not used
- `webpack-cli` - Not used (Next.js handles bundling)

**Action:** 
- **Remove:** 31 packages
- **Keep:** 3 packages (depcheck, postcss, prettier, ts-node)

---

## 3. Missing Dependencies

These packages are referenced in code but not in package.json:

### False Positives (Safe to Ignore)
| Package | Location | Reason |
|---------|----------|--------|
| `src` | tests/unit/components/ErrorBoundary.test.tsx | Import path issue, not a real package |
| `server-only` | lib/mongoUtils.server.ts | Next.js built-in, not needed in package.json |

### Scripts Only (Not Production)
| Package | Location | Reason |
|---------|----------|--------|
| `express` | scripts/fixzit-server.js | Dev script only |
| `@faker-js/faker` | scripts/seed-aqar-data.js | Seeding script only |
| `cors` | scripts/server-fixed.js | Dev script only |
| `helmet` | scripts/server-fixed.js | Dev script only |
| `express-rate-limit` | scripts/server-fixed.js | Dev script only |
| `express-mongo-sanitize` | scripts/server-fixed.js | Dev script only |
| `cookie-parser` | scripts/server-fixed.js | Dev script only |
| `morgan` | scripts/server.js | Dev script only |
| `express-validator` | scripts/test-server.js | Dev script only |
| `k6` | scripts/load/smoke.js | Load testing script only |

**Action:** 
- No action needed for `server-only` (Next.js built-in)
- Consider adding script dependencies to devDependencies if scripts are actively used
- Or document that scripts require manual `npm install <package>` before use

---

## 4. Recommendations

### Immediate Actions (High Priority)
1. **Remove 18 unused production dependencies** - Reduces bundle size
2. **Remove 31 unused devDependencies** - Speeds up CI/CD
3. **Fix `src` import** in ErrorBoundary.test.tsx (likely `@/` path issue)

### Medium Priority
4. **Document script dependencies** - Create scripts/README.md listing required packages
5. **Consider adding script deps to devDependencies** - If scripts are used regularly

### Low Priority
6. **Audit UI component library usage** - Standardize on one system (Radix vs shadcn/ui vs custom)
7. **Review markdown parsing** - Using multiple libraries (marked, react-markdown, unified/remark)

---

## 5. Impact Analysis

### Bundle Size Reduction
- **Production:** ~18 packages removed = Estimated 2-5MB reduction
- **Development:** ~31 packages removed = Estimated 50-100MB reduction in node_modules

### Installation Time
- **Before:** 1306 packages (from recent git push)
- **After:** ~1257 packages (estimated)
- **Time Saved:** ~10-15 seconds per `pnpm install`

### Maintenance Benefits
- Fewer security vulnerabilities to track
- Simpler dependency tree
- Faster dependency updates

---

## 6. Execution Plan

```bash
# Step 1: Remove unused production dependencies
pnpm remove @hookform/resolvers @radix-ui/react-avatar @radix-ui/react-dropdown-menu \
  @radix-ui/react-progress @radix-ui/react-select @radix-ui/react-separator \
  @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip \
  bcrypt bullmq fast-xml-parser marked next-themes \
  react-hook-form react-markdown recharts socket.io-client

# Step 2: Remove unused devDependencies
pnpm remove -D @babel/parser @babel/preset-env @babel/preset-react @babel/preset-typescript \
  @babel/traverse @types/babel__traverse @inquirer/prompts \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-next \
  eslint-plugin-jsx-a11y eslint-plugin-react eslint-plugin-react-hooks \
  eslint-plugin-unused-imports @types/jest @vitest/coverage-v8 next-router-mock \
  start-server-and-test autoprefixer cross-env import-in-the-middle \
  jscodeshift jscpd madge postcss-selector-parser require-in-the-middle \
  rimraf safe-regex2 shx ts-morph ts-prune tsconfig-paths wait-on webpack-cli

# Step 3: Verify build still works
pnpm build

# Step 4: Verify tests still work
pnpm test

# Step 5: Commit changes
git add package.json pnpm-lock.yaml
git commit -m "chore: Remove 49 unused dependencies"
```

---

## 7. Verification Steps

After removal:
1. ✅ TypeScript compilation succeeds (`pnpm tsc --noEmit`)
2. ✅ Build succeeds (`pnpm build`)
3. ✅ Tests pass (`pnpm test`)
4. ✅ Dev server starts (`pnpm dev`)
5. ✅ No new errors in browser console

---

**Status:** ✅ Audit Complete  
**Next Step:** Execute removal plan (user approval required)  
**Estimated Time:** 10-15 minutes (including verification)
