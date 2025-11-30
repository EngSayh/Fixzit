# Contributing to Fixzit

## Getting Started

### 1. Setup Git Hooks

Git hooks are configured via `simple-git-hooks` in `package.json`. They install automatically when you run `pnpm install`.

**Pre-commit hook runs:**

- ✅ `pnpm lint:prod` – ESLint on production code (0 warnings allowed)
- ✅ `pnpm guard:fm-hooks` – FM hooks safety check
- ✅ `bash scripts/security/check-hardcoded-uris.sh` – Security URI scan

**Pre-push hook runs:**

- ✅ `pnpm lint:mongo-unwrap` – MongoDB unwrap safety check
- ✅ `pnpm typecheck` – TypeScript compilation

> ⚠️ **Translation audit is NOT in pre-commit hooks.** Run it manually before committing i18n changes:
> ```bash
> node scripts/audit-translations.mjs
> ```

**To bypass hooks** (emergency only):

```bash
git commit --no-verify
```

### 2. Translation Workflow

#### Adding New Translation Keys

1. **Add to both catalogs** (`contexts/TranslationContext.tsx`):

   ```typescript
   // English catalog
   const catalogEN = {
     "module.category.key": "English Text",
     // ...
   };

   // Arabic catalog
   const catalogAR = {
     "module.category.key": "النص العربي",
     // ...
   };
   ```

2. **Use namespaced keys** (not direct strings):

   ```typescript
   // ✅ Correct
   t("finance.payment.bankName");

   // ❌ Wrong
   t("Bank Name");
   ```

3. **Run audit before committing**:

   ```bash
   node scripts/audit-translations.mjs
   ```

4. **Fix any gaps detected**:

   ```bash
   node scripts/audit-translations.mjs --fix
   ```

5. **Commit changes**:
   ```bash
   git add -A
   git commit -m "feat(i18n): Add payment form translations"
   ```

#### Translation Key Naming Conventions

- **Format**: `module.category.key`
- **Examples**:
  - `finance.payment.bankName`
  - `hr.employee.fullName`
  - `aqar.property.address`
  - `workOrder.status.completed`

### 3. Development Workflow

#### Create Feature Branch

```bash
git checkout -b feat/<task-name>
```

#### Make Changes

- Write code following TypeScript strict mode
- Add tests for new features
- Update translations if adding UI text

#### Verify Changes

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Tests
pnpm test

# Build
pnpm build
```

#### Commit Changes

```bash
git add -A
git commit -m "feat(module): Description"
```

Pre-commit hook will automatically:

- Run `lint:prod` (ESLint with 0 warnings)
- Run `guard:fm-hooks` (FM hooks safety)
- Run security URI scan

> ℹ️ Translation audit is **not** in hooks. Run manually for i18n changes:
> ```bash
> node scripts/audit-translations.mjs
> ```

#### Push and Create PR

```bash
git push -u origin HEAD
gh pr create --fill --draft
```

### 4. Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `chore`: Maintenance tasks
- `refactor`: Code restructuring
- `test`: Adding tests
- `perf`: Performance improvement
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert previous commit

**Examples**:

```
feat(i18n): Add complete translation coverage for finance module

- Added 213 keys for budgets, expenses, invoices, payments
- Maintains 100% EN-AR parity
- All translations professionally done

Closes #42
```

```
fix(auth): Prevent session hijacking with HTTP-only cookies

- Changed session storage from localStorage to HTTP-only cookies
- Added CSRF token validation
- Updated login/logout flows

Resolves ISSUE-SEC-003
```

### 5. Code Quality Standards

#### TypeScript

- ✅ Strict mode enabled
- ✅ No implicit `any`
- ✅ Proper types for all variables
- ✅ Use `interface` for object shapes
- ✅ Use `type` for unions/intersections
- ✅ Null safety with optional chaining (`?.`)

#### React

- ✅ Functional components only
- ✅ Hooks for state management
- ✅ Error boundaries for route components
- ✅ ARIA labels for accessibility
- ✅ Keyboard navigation support

#### Performance

- ✅ Lazy loading with `React.lazy()` and `Suspense`
- ✅ Memoization with `useMemo`, `useCallback`
- ✅ Pagination for large datasets
- ✅ Debouncing for search inputs

### 6. Module-Specific Rules

#### Finance Module

- Use `Decimal` type for monetary values (not `number`)
- Include currency code with amounts: `{ amount: 100, currency: 'OMR' }`
- Log all transactions with audit trail
- Double-entry accounting for transactions

#### HR Module

- Encrypt PII (SSN, salary, bank accounts)
- Verify role-based permissions
- Audit log for all HR actions

#### Property Management (Aqar)

- Include coordinates for all properties
- Maintain unit hierarchy (Property > Building > Floor > Unit)
- Track occupancy status accurately

#### Work Orders

- Calculate SLA on every status change
- Priority inheritance from property criticality
- Auto-assignment based on category and vendor availability

### 7. Security Guidelines

#### Authentication

- Never expose tokens in logs or commits
- Store session tokens in HTTP-only cookies
- Implement CSRF protection

#### Authorization

- Check permissions server-side
- Principle of least privilege
- Role hierarchy: SUPER_ADMIN > ADMIN > MANAGER > USER

#### Data Protection

- Encrypt PII at rest
- Validate and sanitize all inputs
- Implement rate limiting

### 8. Testing

#### Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:coverage

# RBAC Parity Tests (client/server alignment)
pnpm rbac:parity

# RBAC Linting
pnpm lint:rbac
```

#### RBAC Parity Testing

The RBAC parity tests ensure that client-side permission checks (UI visibility) match server-side authorization (API access control). This prevents drift between what users see and what they can actually do.

**Key Files:**
- Static lint script: [`scripts/lint-rbac-parity.ts`](scripts/lint-rbac-parity.ts) – 7-dimension parity checks
- Behavioral tests: [`tests/domain/fm.can-parity.test.ts`](tests/domain/fm.can-parity.test.ts) – 66 tests
- Contributor guide: [`docs/rbac/TOOLING.md`](docs/rbac/TOOLING.md) – detailed documentation

```bash
# Run RBAC parity tests (66 tests)
pnpm rbac:parity
```

**What it tests (66 tests):**
- Static data structure parity (ROLE_ACTIONS, SUB_ROLE_ACTIONS, PLAN_GATES, SUBMODULE_REQUIRED_SUBROLE)
- `can()` function behavioral parity across all 9 canonical roles
- Sub-role enforcement (FINANCE_OFFICER, HR_OFFICER, SUPPORT_AGENT, OPERATIONS_MANAGER)
- Plan gate enforcement (STARTER, STANDARD, PRO, ENTERPRISE)
- Technician assignment and work order lifecycle permissions
- Cross-role sub-role boundary enforcement
- Plan downgrade scenarios
- Org membership edge cases (non-member denial, SUPER_ADMIN bypass, GUEST limits)
- Vendor role parity (marketplace access, work order restrictions)
- Action-specific parity (export, approve, assign)
- `computeAllowedModules()` parity (server/client/lite)

**CI Integration:**
- `pnpm rbac:parity` runs in the **`fixzit-quality-gates.yml`** workflow (not in `lint:ci`)
- **Always run locally** when changing RBAC logic: `pnpm rbac:parity`
- The `lint:ci` script runs static checks only; behavioral parity tests are in quality-gates

#### Writing Tests

- Test filename: `<component>.test.tsx`
- Location: `tests/unit/` or `tests/e2e/`
- Coverage target: >80%

### 9. Pre-commit Checklist

Before committing, ensure:

- [ ] `pnpm typecheck` passes (0 errors)
- [ ] `pnpm lint` passes (0 errors)
- [ ] `pnpm test` passes (all tests)
- [ ] `pnpm rbac:parity` passes (66 RBAC parity tests) – **run manually for RBAC changes**
- [ ] Translation audit passes (run `node scripts/audit-translations.mjs` for i18n changes)
- [ ] No `console.log` statements (except error handling)
- [ ] Documentation updated if needed
- [ ] Commit message follows format

### 10. PR Checklist

Before requesting review:

- [ ] All tests pass (unit + E2E)
- [ ] Code coverage >80%
- [ ] No critical/major security issues
- [ ] Documentation updated
- [ ] Translation keys added if needed
- [ ] No breaking changes (or documented if unavoidable)
- [ ] PR description explains what/why/how

### 11. Emergency Procedures

#### Production Incident

1. Rollback immediately: `git revert` or redeploy previous version
2. Create incident report
3. Fix forward with hotfix branch
4. Fast-track PR review
5. Post-mortem documentation

#### Data Loss Prevention

- Never run `DELETE` without `WHERE` clause
- Always backup before migrations
- Test migrations on staging first
- Have rollback plan ready

### 12. Resources

- **Agent Instructions**: `.github/copilot-instructions.md`
- **Translation Audit**: `scripts/audit-translations.mjs`
- **Issues Register**: `ISSUES_REGISTER.md` (if exists)
- **Daily Progress Reports**: `docs/archived/DAILY_PROGRESS_REPORTS/`
- **RBAC Parity Tests**: `tests/domain/fm.can-parity.test.ts`
- **E2E Sub-Role Tests**: `tests/e2e/subrole-api-access.spec.ts`
- **PR Comments Audit**: `reports/pr-comments-audit-20251130.md`

### 13. Getting Help

- **Translation Issues**: Check `scripts/audit-translations.mjs --help`
- **Git Hooks**: Re-run `./scripts/setup-git-hooks.sh`
- **Build Errors**: Check `pnpm typecheck` and `pnpm lint`
- **Test Failures**: Check `playwright-report/index.html` for E2E

### 14. CI/CD Troubleshooting

#### GitHub Actions Minutes Quota Exhausted

If CI pipelines fail due to GitHub Actions minutes quota exhaustion, you have several options:

**Option 1: Upgrade GitHub Plan**
- Free tier: 2,000 minutes/month (500 for private repos)
- Pro tier: 3,000 minutes/month
- Team/Enterprise: More minutes available
- Contact your admin to upgrade the plan

**Option 2: Make Repository Public** (if allowed)
- Public repositories have unlimited GitHub Actions minutes
- Only viable for open-source projects

**Option 3: Self-Hosted Runners**
- Set up self-hosted runners on your own infrastructure
- No GitHub Actions minutes consumed
- Guide: [GitHub Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)

**Option 4: Optimize Workflows**
- Use caching (`actions/cache`) to reduce build times
- Skip unnecessary steps with conditional execution
- Use concurrency groups to cancel redundant runs
- Split workflows to run only affected tests

**Option 5: Run Tests Locally**
While CI is unavailable, run quality checks locally:
```bash
# Run all quality checks
pnpm typecheck && pnpm lint && pnpm test

# Run RBAC parity tests
pnpm rbac:parity

# Run E2E tests locally
pnpm test:e2e
```

**Current Workflow Optimizations:**
- `fixzit-quality-gates.yml` uses concurrency groups to cancel redundant runs
- Dependency caching enabled for pnpm
- Jobs run in parallel where possible

---

**Last Updated**: 2025-12-01  
**Maintained By**: Engineering Team
