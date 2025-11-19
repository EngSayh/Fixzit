# 📁 Fixzit Workspace Organization Guide

## 🎯 Purpose
This document explains the organized structure of the Fixzit workspace and where to find (or place) different types of files.

## 📂 Directory Structure

```
/workspaces/Fixzit/
├── 📱 app/                    # Next.js app router pages & API routes
├── 🎨 components/             # React components
├── 🔧 lib/                    # Utility libraries & configurations
├── 🛡️ server/                 # Server-side code (models, security, utils)
├── 🧪 tests/                  # Test files (unit, integration, e2e)
├── 📜 scripts/                # Build, deployment, and utility scripts
├── 📚 docs/                   # ALL documentation (see structure below)
├── 🔑 config/                 # Configuration files
├── 🌐 public/                 # Static assets
└── 📦 [config files]          # Root-level configs (package.json, etc.)
```

## 📚 Documentation Structure

```
docs/
├── 📖 guides/                      # How-to guides & tutorials
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   ├── SENDGRID_PRODUCTION_GUIDE.md
│   └── SENDGRID_SETUP_CHECKLIST.md
│
├── 📊 reports/                     # System reports & analysis
│   ├── GITHUB_SECRETS_SETUP.md
│   ├── PRODUCTION_READY_FINAL_VERIFICATION.md
│   └── archive/                    # Historical reports
│       ├── ALL_FIXES_COMPLETE_REPORT.md
│       ├── CRITICAL_IP_SPOOFING_FIX.md
│       └── [other archived reports]
│
├── 🔒 security/                    # Security audits & fixes
│   ├── SECURITY_AUDIT_2025_10_20.md
│   ├── NEXTAUTH_VERSION_ANALYSIS.md
│   └── SECURITY_FIXES_COMPLETE_2025_10_19.md
│
├── 🔀 pull-requests/               # PR documentation & reviews
│   ├── PR137_CRITICAL_FIXES_COMPLETE.md
│   ├── PR_COMMENTS_CHECKLIST.md
│   └── .pr131_reviews_full.json
│
├── 📅 sessions/                    # Development session summaries
│   ├── SESSION_SUMMARY_2025-10-24.md
│   ├── COMPLETE_TASK_SUMMARY.md
│   └── FIX_SUMMARY_2025_10_19.md
│
├── 📈 progress/                    # Daily progress reports
│   └── DAILY_PROGRESS_REPORT_*.md
│
├── 🏗️ architecture/                # System architecture docs
│   └── ARCHITECTURE_OVERVIEW.md
│
└── 📖 api/                         # API documentation
    └── API_REFERENCE.md
```

## 🗂️ File Location Guidelines

### ✅ Keep in Root Directory
- `README.md` - Main project documentation
- `package.json` - Project dependencies
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules
- Other configuration files (`.eslintrc`, `tailwind.config.js`, etc.)

### ❌ Don't Keep in Root
- Session reports → `docs/sessions/`
- Security audits → `docs/security/`
- PR documentation → `docs/pull-requests/`
- Completion reports → `docs/reports/`
- Test scripts → `tests/`
- Temporary files → `.archive/` (not committed)

## 🧹 Organizing Your Workspace

### Automatic Organization
Run the organization script:
```bash
bash scripts/organize-workspace.sh
```

This will automatically move files to their proper locations.

### Manual Organization Rules

1. **Documentation Files** (`*.md`)
   - Guides & tutorials → `docs/guides/`
   - System reports → `docs/reports/`
   - Security-related → `docs/security/`
   - PR-related → `docs/pull-requests/`
   - Session summaries → `docs/sessions/`
   - Old/archived → `docs/reports/archive/`

2. **Test Files** (`*.test.ts`, `*.spec.ts`)
   - Always go in `tests/` directory
   - Match the structure of what they test

3. **Scripts** (`*.sh`, `*.js` for automation)
   - Build/deploy scripts → `scripts/`
   - Database scripts → `scripts/db/`
   - Utility scripts → `scripts/utils/`

4. **Configuration Files**
   - Global config → Root directory
   - Module-specific → Within module directory
   - Environment-specific → `config/` directory

## 🚀 Dev Server Auto-Start

### The Problem
The dev server doesn't stay alive because Next.js dev servers don't auto-start by default.

### The Solution
We've configured VS Code to auto-start the dev server when you open the workspace.

**Auto-start on folder open**: ✅ Enabled  
**Location**: `.vscode/tasks.json`  
**Task**: "Dev Server: Start"

### Manual Start Options

If auto-start doesn't work:

1. **Via VS Code Tasks**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Run Task"
   - Select "Dev Server: Start"

2. **Via Terminal**:
   ```bash
   pnpm dev
   ```

3. **With Keep-Alive** (auto-restart on crash):
   ```bash
   bash scripts/dev-server-keepalive.sh
   ```

### Troubleshooting
See `.vscode/DEV_SERVER_GUIDE.md` for detailed troubleshooting.

## 📋 Maintenance Tasks

### Weekly
```bash
# Run the organization script
bash scripts/organize-workspace.sh

# Clean up node_modules if needed
rm -rf node_modules && pnpm install
```

### Monthly
```bash
# Archive old reports
mv docs/sessions/SESSION_SUMMARY_2025-09-*.md docs/sessions/archive/

# Clean up build artifacts
rm -rf .next dist out
```

### Before Committing
```bash
# Check what's being committed
git status

# Ensure no temp files in root
ls -la *.md | grep -v README.md

# If found, run organization
bash scripts/organize-workspace.sh
```

## 🎯 Best Practices

### ✅ Do
- Keep root directory clean (only config files)
- Use the organization script regularly
- Put new docs in the correct `docs/` subdirectory
- Archive old reports instead of deleting
- Use descriptive filenames with dates

### ❌ Don't
- Create reports in root directory
- Keep temp/test files in root
- Commit `.env` or `.env.local` files
- Mix documentation types in same folder
- Keep outdated reports in active directories

## 🔄 Migration Checklist

If you're organizing an existing messy workspace:

- [ ] Run `bash scripts/organize-workspace.sh`
- [ ] Review moved files in new locations
- [ ] Update any hardcoded paths in code
- [ ] Delete `.archive/` if you don't need old files
- [ ] Commit changes: `git add -A && git commit -m "chore: organize workspace"`
- [ ] Update team on new structure

## 📞 Questions?

If you're unsure where a file should go:
1. Check this guide first
2. Look at similar existing files
3. When in doubt, use `docs/reports/` for documentation
4. Run the organization script - it knows the rules!

---

**Last Updated**: October 24, 2025  
**Maintained By**: Fixzit Development Team
