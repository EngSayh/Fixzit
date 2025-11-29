# GitHub Actions Configuration

This directory contains GitHub Actions workflow files and related documentation.

## 📁 Directory Structure

```
.github/
├── workflows/           # GitHub Actions workflow definitions
│   ├── agent-governor.yml       # CI pipeline (lint, typecheck, build)
│   ├── build-sourcemaps.yml     # Production sourcemap generation
│   ├── e2e-tests.yml            # End-to-end testing with Playwright
│   └── pr_agent.yml             # AI-powered code review
├── WORKFLOW_SECRETS.md          # Secret configuration guide
└── WORKFLOW_WARNINGS.md         # VSCode warning suppression guide
```

## 🚨 VSCode Warnings - Read This First!

Secrets are now fully configured in GitHub/Vercel and referenced directly in the workflows. The prior “Context access might be invalid” hints should be gone after you reload VSCode.

👉 If you still see them, check [WORKFLOW_WARNINGS.md](./WORKFLOW_WARNINGS.md) for the quick reload/auth steps.

## 🔐 Secrets Configuration

To configure secrets for production CI/CD:

1. Navigate to **GitHub Settings** → **Secrets and variables** → **Actions**
2. Add the required secrets listed in [WORKFLOW_SECRETS.md](./WORKFLOW_SECRETS.md)
3. Most secrets are optional and have fallback values

👉 **See [WORKFLOW_SECRETS.md](./WORKFLOW_SECRETS.md) for complete secret documentation.**

## 🔄 Workflows Overview

### Agent Governor CI (`agent-governor.yml`)
- **Triggers:** Push to main/feature branches, pull requests
- **Purpose:** Quality gates (lint, typecheck, build)
- **Secrets:** Optional (uses fallbacks)

### Build Sourcemaps (`build-sourcemaps.yml`)
- **Triggers:** Push to main/develop, manual dispatch
- **Purpose:** Generate and upload sourcemaps to Sentry
- **Secrets:** Optional (Sentry integration)

### E2E Tests (`e2e-tests.yml`)
- **Triggers:** Pull requests, manual dispatch
- **Purpose:** End-to-end testing with Playwright
- **Secrets:** Required for full testing, fallbacks for forked PRs

### PR Agent (`pr_agent.yml`)
- **Triggers:** Pull request opened/reopened
- **Purpose:** AI-powered code review
- **Secrets:** Required (OpenAI API key)

## 📝 Local Development

For local development, you **do not need** any of these secrets:
- Workflows only run on GitHub Actions servers
- Use `.env.local` for local environment variables
- VSCode warnings about secrets can be ignored

## 🆘 Troubleshooting

### Workflow fails with "missing secret" error
1. Check if secret is configured in GitHub Settings → Secrets
2. Verify secret name matches exactly (case-sensitive)
3. For forked PRs, secrets are unavailable by design (security)

### VSCode shows warnings in Problems tab
1. These are expected and safe to ignore
2. See [WORKFLOW_WARNINGS.md](./WORKFLOW_WARNINGS.md) for suppression methods
3. Warnings don't affect your code or builds

### Sentry upload fails
- Workflow continues - this is non-critical
- Sourcemaps are archived as artifacts
- Configure `SENTRY_AUTH_TOKEN` for full functionality

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Guide](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Playwright Testing](https://playwright.dev/)
- [Sentry Sourcemaps](https://docs.sentry.io/platforms/javascript/sourcemaps/)

## 🤝 Contributing

When modifying workflows:
1. Test locally with [act](https://github.com/nektos/act) if possible
2. Add clear comments explaining secret requirements
3. Update documentation in this README
4. Use `continue-on-error: true` for non-critical steps
5. Provide fallback values for optional secrets

---

**Questions?** Contact the DevOps team or refer to the documentation files in this directory.
