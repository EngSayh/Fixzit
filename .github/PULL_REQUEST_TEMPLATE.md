## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] 📝 Documentation update
- [ ] 🎨 Style/UI change
- [ ] ♻️ Refactoring (no functional changes)
- [ ] 🧪 Test addition/update
- [ ] 🔧 Configuration change
- [ ] 🔒 Security fix

## Related Issues

<!-- Link any related issues using "Fixes #123" or "Relates to #456" -->

Fixes #

## Changes Made

<!-- List the key changes made in this PR -->

- 
- 

---

## Governance Checklist

- [ ] Layout Freeze respected (single header/sidebar)
- [ ] Sidebar baseline maintained
- [ ] Ejar brand tokens used (#118158, #C7B27C)
- [ ] Language selector standards met
- [ ] Artifacts attached

## Code Quality

- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] `pnpm typecheck` passes (0 TypeScript errors)
- [ ] `pnpm lint` passes (0 ESLint warnings)
- [ ] No new `eslint-disable` comments added

## Testing

- [ ] I have added tests that prove my fix/feature works
- [ ] `pnpm test` passes (unit tests)
- [ ] E2E tests pass (if applicable)

## Translations (i18n)

- [ ] All user-facing strings use translation keys (not hardcoded)
- [ ] New keys added to both EN and AR dictionaries
- [ ] Translation keys follow convention (`module.category.key`)
- [ ] `pnpm i18n:build` ran if sources changed

## Security

- [ ] No secrets or sensitive data in code
- [ ] Input validation added for user inputs
- [ ] RBAC permissions checked for new endpoints

## Accessibility

- [ ] New UI elements have proper ARIA labels
- [ ] Keyboard navigation works correctly
- [ ] Color contrast meets WCAG AA standards

## RBAC Changes (if applicable)

> Skip this section if your PR doesn't touch RBAC logic (`domain/fm/`, `app/api/fm/`, role/permission code)

- [ ] `pnpm rbac:parity` passes (66 tests)
- [ ] `pnpm lint:rbac` passes (7-dimension static checks)
- [ ] Reviewed [RBAC Tooling Guide](docs/rbac/TOOLING.md)

**Key RBAC Files:**
- Static lint: `scripts/lint-rbac-parity.ts`
- Behavioral tests: `tests/domain/fm.can-parity.test.ts`

> **Note:** `rbac:parity` also runs in CI (`fixzit-quality-gates.yml`), but run locally first to catch issues early.

## Screenshots/Testing Instructions

<!-- Add screenshots for UI changes, or steps for reviewers to test -->

## Artifacts

- [ ] Screenshots (before/after)
- [ ] Console logs (0 errors)
- [ ] Network logs (0 4xx/5xx)
- [ ] Build summary (0 TypeScript errors)
- [ ] Commit references
- [ ] Root cause → fix summary

---

### Reviewer Checklist

- [ ] Code review completed
- [ ] Tests adequate for changes
- [ ] No security concerns
- [ ] Approved for merge
