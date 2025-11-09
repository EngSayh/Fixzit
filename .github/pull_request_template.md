## Summary
**Related Issues:** <!-- Link to issue(s) -->

### Changes Made
<!-- Brief description of what was changed and why -->

## Fixzit Quality Gates (must pass)
- [ ] **API surface validated** (`pnpm run scan:api`) — factory/NextAuth aware
- [ ] **i18n parity validated** (`pnpm run scan:i18n:v2`) — TranslationContext merged  
- [ ] **Fixzit Agent (dry)** produced reports (no new critical issues)
- [ ] **No new console.log/dir** in runtime code
- [ ] **No new content duplicates** outside vendor/temp
- [ ] **Waiver schema valid** (`node scripts/waivers-validate.mjs`)
- [ ] **Delta checks passed** (`node scripts/scan-delta.mjs`)

## Agent Governor Compliance
### Governance Checklist
- [ ] **Search-first completed** (inventory run, duplicates checked)
- [ ] **Merge policy applied** (canonical file + references updated + old files removed)
- [ ] **No layout changes** (Header/Sidebar/Footer/RTL/Theme preserved)
- [ ] **Root-cause fixed** (no try/catch silencing)
- [ ] **Secrets externalized** (GitHub Secrets / .env only)
- [ ] **Branding intact** (#0061A8 Blue, #00A859 Green, #FFB400 Yellow)

### Evidence (Required)
Please attach or link to the following:

- [ ] **Before/After screenshots** (T0, T0+10s for each affected page)
- [ ] **Console logs** (clean - 0 errors)
- [ ] **Network logs** (clean - no 4xx/5xx)
- [ ] **Build/TypeScript summary** (0 errors: `npm run typecheck`)
- [ ] **Test output** (unit + e2e: all green)
- [ ] **Artifacts** (`.fixzit/artifacts/` or commit refs)

### Test Results
```
<!-- Paste test results here -->
```

### Page × Role Verification (Halt-Fix-Verify)
<!-- For each affected page, confirm testing per role -->
- [ ] Page: ___________ | Roles tested: ___________
- [ ] Console: 0 errors
- [ ] Network: 0 4xx/5xx
- [ ] Runtime: No hydration/boundary errors
- [ ] UI: Buttons linked, dropdowns working, maps live (if applicable)

### Performance
- [ ] Page load: ≤1.5s
- [ ] List API: ≤200ms
- [ ] Item API: ≤100ms
- [ ] Create/Update: ≤300ms

### Similar-Issue Sweep
- [ ] Searched repo for identical issues
- [ ] Applied fix patterns globally where applicable

## Requirements Verification
- [ ] I mapped every code change to the relevant requirement headings in `/docs/requirements/**`.
- [ ] I confirmed all SMART must-pass gates are satisfied or provided diffs to close gaps.
- [ ] I updated requirements docs if behavior diverged from the written expectations.

### Rollback Plan
<!-- How to revert if issues arise -->

---

**Definition of Done:** All checkboxes complete, artifacts attached, owner approval received.
