# Contributing to Fixzit

## Getting Started

### 1. Setup Git Hooks

Run the setup script to install pre-commit hooks:

```bash
./scripts/setup-git-hooks.sh
```

This installs a pre-commit hook that:

- ✅ Runs translation audit before every commit
- ✅ Ensures 100% EN-AR parity
- ✅ Validates all translation keys in code are present in catalogs
- ✅ Blocks commits if gaps are detected

**To bypass the hook** (emergency only):

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

- Run translation audit
- Block commit if gaps detected
- Show helpful error messages

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
```

#### Writing Tests

- Test filename: `<component>.test.tsx`
- Location: `tests/unit/` or `tests/e2e/`
- Coverage target: >80%

### 9. Pre-commit Checklist

Before committing, ensure:

- [ ] `pnpm typecheck` passes (0 errors)
- [ ] `pnpm lint` passes (0 errors)
- [ ] `pnpm test` passes (all tests)
- [ ] Translation audit passes
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

### 13. Getting Help

- **Translation Issues**: Check `scripts/audit-translations.mjs --help`
- **Git Hooks**: Re-run `./scripts/setup-git-hooks.sh`
- **Build Errors**: Check `pnpm typecheck` and `pnpm lint`
- **Test Failures**: Check `playwright-report/index.html` for E2E

---

**Last Updated**: 2025-01-11  
**Maintained By**: Engineering Team
