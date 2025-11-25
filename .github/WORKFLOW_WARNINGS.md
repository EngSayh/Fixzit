# GitHub Actions Workflow Warnings - VSCode Suppression Guide

This file documents expected warnings that appear in VSCode's Problems tab when editing GitHub Actions workflow files. These warnings are **safe to ignore** during local development.

## Why These Warnings Appear

VSCode's GitHub Actions extension validates workflow files and shows warnings for potentially missing secrets. However, these secrets are:
- Only required in production CI/CD environments (GitHub Actions)
- Not needed for local development
- Handled gracefully with fallbacks in the workflows

See `.github/WORKFLOW_SECRETS.md` for complete secrets documentation.

---

## Expected Warnings (Safe to Ignore)

### Sentry Integration (Optional)

**Warning:** `Context access might be invalid: SENTRY_AUTH_TOKEN`
- **File:** `.github/workflows/build-sourcemaps.yml`
- **Reason:** Optional secret for production error tracking. Workflow continues without it.
- **Severity:** Informational (not an error)

**Warning:** `Context access might be invalid: SENTRY_ORG`
- **File:** `.github/workflows/build-sourcemaps.yml`
- **Reason:** Optional secret for Sentry organization. Workflow continues without it.
- **Severity:** Informational (not an error)

**Warning:** `Context access might be invalid: SENTRY_PROJECT`
- **File:** `.github/workflows/build-sourcemaps.yml`
- **Reason:** Optional secret for Sentry project. Workflow continues without it.
- **Severity:** Informational (not an error)

### Authentication Variables

**Warning:** `Context access might be invalid: NEXTAUTH_URL`
- **File:** `.github/workflows/agent-governor.yml`
- **Reason:** Has fallback value (`http://localhost:3000`). Only needed in production.
- **Severity:** Informational (not an error)

### AI/ML Integrations (Optional)

**Warning:** `Context access might be invalid: OPENAI_API_KEY`
- **File:** `.github/workflows/pr_agent.yml`
- **Reason:** Only required when PR Agent workflow runs on GitHub. Not needed locally.
- **Severity:** Informational (not an error)

### OAuth Integrations (Optional)

**Warning:** `Context access might be invalid: GOOGLE_OAUTH_CLIENT_SECRET`
- **File:** `.github/workflows/e2e-tests.yml`
- **Reason:** Optional for E2E OAuth tests. Tests skip OAuth flows if not configured.
- **Severity:** Informational (not an error)

**Warning:** `Context access might be invalid: GOOGLE_CLIENT_ID`
- **File:** `.github/workflows/e2e-tests.yml`
- **Reason:** Optional for E2E OAuth tests. Tests skip OAuth flows if not configured.
- **Severity:** Informational (not an error)

---

## Development vs Production

### Development Environment (Local/VSCode)

**Secrets Required:** ❌ No  
**Warning Suppression:** ✅ Recommended

When developing locally, these secrets are **not needed** because:
- Workflows only run on GitHub Actions servers (not locally)
- Local builds use `.env.local` environment variables
- VSCode linting of YAML files will show warnings (this is expected and harmless)

### Production Environment (GitHub Actions CI/CD)

**Secrets Required:** ✅ Yes (but with fallbacks)  
**Warning Suppression:** ❌ No

In production GitHub Actions:
- Secrets are configured in **GitHub Settings** → **Secrets and variables** → **Actions**
- Workflows access secrets via `${{ secrets.SECRET_NAME }}`
- Missing secrets are handled gracefully with fallback values
- Non-critical steps use `continue-on-error: true` to prevent build failures

---

## How to Suppress Warnings in VSCode

### Method 1: Ignore in Problems Tab (Recommended)

These warnings are **informational only** and don't affect your work:
1. Open VSCode's **Problems** tab (View → Problems)
2. Right-click on workflow warnings
3. Select **"Collapse All"** or simply ignore them
4. They won't appear in your code editor, only in the Problems panel

### Method 2: Filter by Severity

Configure VSCode to hide informational warnings:
1. Open **Settings** (Cmd/Ctrl + ,)
2. Search for `problems.severity`
3. Set minimum severity to **Warning** or **Error** to hide info messages

### Method 3: Close Problems Tab

If warnings are distracting:
- Close the Problems tab entirely (it doesn't affect your code)
- Problems will still show inline in files with actual errors

### Method 4: Document Why They're Safe (Done!)

We've added clear comments in all workflow files explaining:
- Which secrets are optional
- Why VSCode warnings can be ignored
- Where to configure secrets for production

---

## Quick Reference

| Action | Solution |
|--------|----------|
| ❓ Should I worry about these warnings? | ❌ No - they're expected and safe to ignore |
| 🔧 Configure for production | GitHub Settings → Secrets and variables → Actions |
| 📚 View complete documentation | See `.github/WORKFLOW_SECRETS.md` |
| 💻 Test locally | Use `.env.local` for environment variables |
| 🤐 Silence warnings in VSCode | Use Methods 1-3 above |

---

## Summary

✅ **These warnings are normal and expected**  
✅ **Workflows are designed to handle missing secrets gracefully**  
✅ **Local development doesn't need these secrets**  
✅ **Production secrets are configured in GitHub Settings**  
✅ **You can safely ignore or hide these warnings in VSCode**

For detailed information about each secret, see **`.github/WORKFLOW_SECRETS.md`**

---

**Last Updated:** November 25, 2025  
**Maintained By:** DevOps Team
