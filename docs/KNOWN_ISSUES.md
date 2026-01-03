# Known Development Issues - Fixzit

This document tracks recurring development issues and their solutions. **AGENTS.md read. Agent Token: [AGENT-001-A]**

## 🔴 Mongoose Connection Issues (Local Testing)

### Issue
Tests fail with `ECONNREFUSED` or connection timeout errors when running `pnpm vitest run` locally.

### Root Cause
MongoMemoryServer requires MongoDB binary to be downloaded and running. The in-memory server can have startup timeout issues, especially on slow machines or first run.

### Solution

1. **First Run - Binary Download**
   ```bash
   # Ensure the MongoDB binary is downloaded (happens automatically on first run)
   # Set generous timeouts in your environment
   export MONGOMS_TIMEOUT=60000
   export MONGOMS_DOWNLOAD_TIMEOUT=60000
   export MONGOMS_START_TIMEOUT=60000
   ```

2. **Environment Variables (vitest.setup.ts already sets these)**
   - `MONGO_MEMORY_LAUNCH_TIMEOUT=60000` - Increases startup timeout
   - `MONGOMS_TIMEOUT=60000` - MongoMemoryServer general timeout
   - `SKIP_GLOBAL_MONGO=true` - Skips MongoDB for pure domain tests

3. **If Tests Still Fail**
   ```bash
   # Clear MongoDB memory server cache
   rm -rf ~/.cache/mongodb-binaries
   
   # Re-run tests with verbose logging
   DEBUG=mongodb* pnpm vitest run --reporter=verbose
   ```

4. **Check vitest.setup.ts**
   The setup file at `vitest.setup.ts` contains:
   - MongoMemoryServer timeout configuration (lines 21-32)
   - Mongoose disconnect suppression (lines 105-127)
   - Proper polyfills for Node worker threads

### Prevention
- Tests should use `beforeAll` hooks with proper connection waiting
- Always use the vitest.setup.ts configuration
- Never call `mongoose.disconnect()` directly in tests (it's suppressed)

---

## 🔴 TopBar Visibility / Color Alignment

### Issue
TopBar text is hard to read due to color contrast issues.

### Root Cause
Missing explicit text color in `.fxz-topbar` CSS class, especially in dark mode.

### Solution
The `.fxz-topbar` class in `app/globals.css` should use the Ejar.sa design:
- **Green background (#25935F)** with **white text**
- NOT white background with dark text

```css
.fxz-topbar {
  background: var(--color-brand-primary, #25935F);
  color: #ffffff;
  border-bottom: 1px solid var(--color-primary-600, #188352);
}

/* Dark mode - same green, consistent with Ejar */
.dark .fxz-topbar {
  background: var(--color-brand-primary, #25935F);
  color: #ffffff;
}
```

### Ejar.sa Design System Colors
| Token | Value | Usage |
|-------|-------|-------|
| Primary | #25935F | Buttons, links, accents |
| Primary Hover | #188352 | Hover states |
| Primary Active | #166A45 | Active/pressed states |
| Secondary (Gold) | #F5BD02 | Accent, warnings |
| Neutral-950 | #0D121C | Sidebar, dark text |
| Text Primary | #0D121C | Main text color |

---

## 🔴 SSOT Tracking - Missing Issue Logs

### Issue
Fixes are made without logging to the MongoDB Issue Tracker (SSOT), making it impossible to track what was changed.

### Solution
**ALWAYS log issues to SSOT BEFORE fixing:**

1. Identify the issue clearly
2. Log to MongoDB Issue Tracker with:
   - Title and description
   - Affected files
   - Root cause
   - Agent Token `[AGENT-XXX-X]`
   - Priority (P0/P1/P2/P3)
3. Get Issue ID
4. Reference Issue ID in commit: `fix(component): description [AGENT-XXX-X] [ISSUE-XXX]`

---

## 🟡 Build Output in Terminal Exit Code 1

### Issue
`pnpm build` shows exit code 1 in terminal despite successful build completion.

### Root Cause
Pre-push hooks or linting can cause non-zero exit codes even when build succeeds.

### Solution
Check the actual output - if it shows "✓ Build completed" the build succeeded. The exit code may be from a subsequent lint step.

---

## 🟡 RTL Layout Direction Issues

### Issue
Layout elements misaligned in RTL (Arabic) mode.

### Solution
Use RTL-logical CSS classes only:
- ✅ `ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`, `text-start`, `text-end`
- ❌ `pl-*`, `pr-*`, `ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`, `text-right`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-03 | Initial document with Mongoose, TopBar, SSOT issues |
