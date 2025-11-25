# File Organization Plan - Phase 1 URGENT

## Current Issues

- 150+ markdown files cluttering root directory
- Multiple duplicate/similar scripts scattered
- Test files mixed with production code
- Configuration files inconsistent locations

## Organization Structure (To Be Implemented)

```
/workspaces/Fixzit/
├── docs/                          # ALL documentation HERE
│   ├── reports/                   # All *_REPORT.md files
│   ├── progress/                  # All PROGRESS_*.md, SESSION_*.md
│   ├── analysis/                  # ANALYSIS_*.md, AUDIT_*.md
│   ├── guides/                    # GUIDE.md, INSTRUCTIONS.md
│   └── archive/                   # Completed/old docs
├── scripts/                       # Production scripts only
│   ├── deployment/
│   ├── database/
│   ├── testing/
│   └── analysis/
├── tools/                         # Development tools
│   ├── analyzers/
│   ├── fixers/
│   └── generators/
├── .github/workflows/             # CI/CD only
└── [rest of standard Next.js structure]
```

## Execution Plan (IMMEDIATE - Next 30 minutes)

### Step 1: Create Directory Structure (2 min)

```bash
mkdir -p docs/{reports,progress,analysis,guides,archive}
mkdir -p scripts/{deployment,database,testing,analysis}
mkdir -p tools/{analyzers,fixers,generators}
```

### Step 2: Move Documentation Files (10 min)

- Move all \*\_REPORT.md → docs/reports/
- Move all _\_PROGRESS_.md, SESSION*\*.md, DAILY*\*.md → docs/progress/
- Move all _\_ANALYSIS_.md, AUDIT*\*.md, COMPREHENSIVE*\*.md → docs/analysis/
- Move all _\_GUIDE.md,_\_INSTRUCTIONS.md, QUICKSTART.md → docs/guides/
- Move README files specific to features → their respective directories

### Step 3: Organize Scripts (10 min)

- Move fix-_.sh, fix-_.ps1, fix-\*.py → tools/fixers/
- Move test-_.js, test-_.mjs, verify-\*.sh → scripts/testing/
- Move analyze-_.js, scan-_.sh → tools/analyzers/
- Move setup-_.sh, deploy-_.sh → scripts/deployment/
- Move seed-_.ts, migrate-_.ts → scripts/database/

### Step 4: Clean Up Root (5 min)

- Remove duplicate/obsolete files
- Keep only: package.json, tsconfig.json, next.config.js, .env.example, README.md, GOVERNANCE.md
- Update .gitignore to prevent future clutter

### Step 5: Update Import Paths (3 min)

- Check for any hardcoded paths to moved files
- Update if necessary

## Files to Move (Prioritized)

### HIGH PRIORITY - Documentation (Move First)

```
docs/reports/
- *_COMPLETE.md (50+ files)
- *_STATUS.md (30+ files)
- *_SUMMARY.md (20+ files)
- *_VERIFICATION*.md (15+ files)
- *_FIXES*.md (15+ files)
-ERROR_ANALYSIS_PROGRESS_TRACKER.md
- COMPREHENSIVE_ERROR_ANALYSIS_SUMMARY.md
- SYSTEM_ERRORS_DETAILED_REPORT.md
- DUPLICATE_CODE_ANALYSIS_REPORT.md
- DEAD_CODE_ANALYSIS_REPORT.md

docs/progress/
- DAILY_PROGRESS_REPORT_*.md
- SESSION_*.md
- PROGRESS_*.md
- *_PROGRESS.md

docs/analysis/
- *_ANALYSIS*.md
- *_AUDIT*.md
- COMPREHENSIVE_*.md
- CRITICAL_*.md

docs/guides/
- *_GUIDE.md
- *_INSTRUCTIONS.md
- *_README.md (feature-specific)
- FIXZIT_QUICKSTART.md
- HOW_TO_*.md
```

### MEDIUM PRIORITY - Scripts

```
tools/fixers/
- fix-*.sh, fix-*.ps1, fix-*.py, fix-*.js

tools/analyzers/
- analyze-*.js
- check-*.sh
- diagnose-*.sh

scripts/testing/
- test-*.js, test-*.mjs, test-*.html
- verify-*.sh, verify-*.ps1

scripts/deployment/
- setup-*.sh
- deploy-*.sh
- pre-deployment-*.sh

scripts/database/
- seed-*.ts, seed-*.mjs
- migrate-*.sh
- update_db_*.sh
```

### LOW PRIORITY - Archives/Cleanup

```
docs/archive/
- Obsolete reports
- Old session summaries
- Duplicate documentation

TO DELETE:
- test-tool*.sh (debugging scripts - obsolete)
- *-debug.* (temporary debug files)
- Duplicate merge scripts
```

## Validation After Move

1. ✅ localhost:3000 still runs
2. ✅ pnpm dev works
3. ✅ pnpm typecheck passes
4. ✅ pnpm lint passes
5. ✅ All imports still resolve
6. ✅ Git tracks moves correctly

## START EXECUTION NOW
