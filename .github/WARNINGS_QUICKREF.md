# 🚨 VSCode Workflow Warnings - Quick Reference

## TL;DR
✅ **All workflow warnings in VSCode Problems tab are SAFE TO IGNORE**  
✅ **They're expected for local development**  
✅ **Your code is fine - these are infrastructure checks**

---

## Current Warnings (As of Nov 25, 2025)

| Warning | File | Status |
|---------|------|--------|
| `Context access might be invalid: SENTRY_AUTH_TOKEN` | build-sourcemaps.yml | ✅ Safe (optional) |
| `Context access might be invalid: SENTRY_ORG` | build-sourcemaps.yml | ✅ Safe (optional) |
| `Context access might be invalid: SENTRY_PROJECT` | build-sourcemaps.yml | ✅ Safe (optional) |
| `Context access might be invalid: NEXTAUTH_URL` | agent-governor.yml | ✅ Safe (has fallback) |
| `Context access might be invalid: OPENAI_API_KEY` | pr_agent.yml | ✅ Safe (production only) |
| `Context access might be invalid: GOOGLE_OAUTH_CLIENT_SECRET` | e2e-tests.yml | ✅ Safe (optional) |

---

## Why These Are Safe

1. **Workflows only run on GitHub Actions** (not locally)
2. **All have fallback values** or `continue-on-error: true`
3. **Local development uses `.env.local`** (not these secrets)
4. **VSCode validates YAML** but can't access GitHub secrets

---

## How to Handle Warnings

### Option 1: Ignore Them (Recommended)
- They don't affect your code
- They don't block commits
- They don't cause build failures

### Option 2: Hide in VSCode
```
View → Problems → Right-click → "Collapse All"
```

### Option 3: Filter by Severity
```
Settings → Search "problems.severity" → Set to "Warning" or "Error"
```

---

## When to Configure Secrets

### ❌ DON'T configure for:
- Local development
- VSCode editing
- Testing locally

### ✅ DO configure for:
- Production GitHub Actions
- Enabling optional features (Sentry, PR Agent)
- Full E2E test coverage

**Where:** GitHub Settings → Secrets and variables → Actions

---

## Full Documentation

- **Secrets Guide:** [.github/WORKFLOW_SECRETS.md](.github/WORKFLOW_SECRETS.md)
- **Warnings Guide:** [.github/WORKFLOW_WARNINGS.md](.github/WORKFLOW_WARNINGS.md)
- **GitHub Actions Overview:** [.github/README.md](.github/README.md)

---

**Last Updated:** November 25, 2025  
**Status:** ✅ All warnings documented and safe to ignore
