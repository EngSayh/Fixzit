## Governance Checklist

- [ ] Layout Freeze respected (single header/sidebar)
- [ ] Sidebar baseline maintained
- [ ] Brand tokens used (#0061A8, #00A859, #FFB400)
- [ ] Language selector standards met
- [ ] Artifacts attached

## RBAC Changes (if applicable)

> Skip this section if your PR doesn't touch RBAC logic (`domain/fm/`, `app/api/fm/`, role/permission code)

- [ ] `pnpm rbac:parity` passes (66 tests)
- [ ] `pnpm lint:rbac` passes (7-dimension static checks)
- [ ] Reviewed [RBAC Tooling Guide](docs/rbac/TOOLING.md)

**Key RBAC Files:**
- Static lint: `scripts/lint-rbac-parity.ts`
- Behavioral tests: `tests/domain/fm.can-parity.test.ts`

> **Note:** `rbac:parity` also runs in CI (`fixzit-quality-gates.yml`), but run locally first to catch issues early.

## Artifacts

- [ ] Screenshots (before/after)
- [ ] Console logs (0 errors)
- [ ] Network logs (0 4xx/5xx)
- [ ] Build summary (0 TypeScript errors)
- [ ] Commit references
- [ ] Root cause → fix summary
