# GitHub Actions Workflow Warnings

All workflow secrets are now provisioned in GitHub/Vercel, and the workflows reference them directly (no more fallback placeholders). The VSCode “Context access might be invalid” hints should no longer appear. If you still see them:

- Make sure you are signed into GitHub in VSCode so the Actions language service can read repository metadata.
- Ensure the GitHub Actions extension is up to date.
- Reload the window after pulling the latest workflow changes.

For the current list of required secrets, see `.github/WORKFLOW_SECRETS_DOCUMENTATION.md`.

---

## Troubleshooting checklist

1) Pull the latest main branch (workflows now expect real secrets).  
2) In VSCode, run “Developer: Reload Window”.  
3) If warnings persist, verify the GitHub Actions extension is enabled and authenticated.  
4) Still noisy? Open an issue with a screenshot so we can repro.

---

**Last Updated:** November 29, 2025  
**Maintained By:** DevOps Team
