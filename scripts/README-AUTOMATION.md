# Automation Scripts

This directory contains automation scripts for maintaining code quality and organization.

## Scripts Overview

### 1. 🗑️ Backup Cleanup (`cleanup-backups.sh`)

**Purpose:** Implement backup retention policy - keep only the 2 most recent backups.

**Usage:**
```bash
./scripts/cleanup-backups.sh
```

**What it does:**
- Scans `i18n/dictionaries/backup` and `.archive` directories
- Identifies backup files (*.backup*, *.bak, *.old, *.orig)
- Keeps only the 2 most recent backups per directory
- Deletes older backups to save space
- Reports space savings

**Recommended schedule:** Monthly or after major updates

---

### 2. 📋 Documentation Review (`review-docs.sh`)

**Purpose:** Monthly review of current documentation for outdated content.

**Usage:**
```bash
./scripts/review-docs.sh
```

**What it does:**
- Scans `docs/current/` for markdown files
- Checks file age (flags files older than 90 days)
- Reports modification dates and file sizes
- Suggests archiving outdated files
- Shows archive statistics

**Recommended schedule:** Monthly (1st of each month)

---

### 3. 📦 Milestone Archiver (`archive-milestone.sh`)

**Purpose:** Archive completion reports after each major milestone.

**Usage:**
```bash
# Interactive mode
./scripts/archive-milestone.sh "Phase 2 Complete"

# Auto mode (skip confirmations)
./scripts/archive-milestone.sh "Phase 2 Complete" -y
```

**What it does:**
- Creates timestamped milestone directory
- Searches for completion reports (*COMPLETE*.md, *REPORT*.md, etc.)
- Checks `docs/current/` for completed items
- Archives files to `docs/archived/milestones/`
- Creates milestone summary document
- Provides git commit commands

**Recommended schedule:** After each major milestone or sprint

---

### 4. 🔍 Duplicate Detection (`detect-duplicates.sh`)

**Purpose:** Detect duplicate files for CI/CD integration.

**Usage:**
```bash
# Report only mode
./scripts/detect-duplicates.sh

# Strict mode (fail if duplicates exceed threshold)
./scripts/detect-duplicates.sh --fail-on-duplicates
```

**What it does:**
- Scans entire codebase for duplicate files
- Uses MD5 hashing for exact match detection
- Calculates wasted space
- Generates JSON report for CI/CD
- Fails build if duplicates exceed 1MB threshold (configurable)

**Environment variables:**
- `THRESHOLD_MB`: Fail threshold in MB (default: 1)

**Recommended schedule:** 
- Weekly via GitHub Actions
- On every PR
- Before releases

---

## CI/CD Integration

### GitHub Actions Workflows

#### Duplicate Detection Workflow

Located: `.github/workflows/duplicate-detection.yml`

**Triggers:**
- Push to main/develop branches
- Pull requests
- Weekly schedule (Monday 9 AM UTC)
- Manual dispatch

**Features:**
- Runs duplicate detection with 5MB threshold
- Uploads detection report as artifact
- Comments on PRs if duplicates found
- Fails build if threshold exceeded

---

#### Monthly Documentation Review Workflow

Located: `.github/workflows/monthly-documentation-review.yml`

**Triggers:**
- Monthly schedule (1st of month, 9 AM UTC)
- Manual dispatch

**Features:**
- Runs documentation review
- Creates GitHub issue if docs need review
- Runs backup cleanup automatically
- Uploads review report as artifact

---

## Setup Instructions

### Local Setup

1. **Make scripts executable:**
```bash
chmod +x scripts/*.sh
```

2. **Test each script:**
```bash
./scripts/cleanup-backups.sh
./scripts/review-docs.sh
./scripts/detect-duplicates.sh
./scripts/archive-milestone.sh "Test Milestone" -y
```

### Cron Setup (Optional)

Add to crontab (`crontab -e`):

```cron
# Monthly backup cleanup (1st of month, 2 AM)
0 2 1 * * cd /path/to/fixzit && ./scripts/cleanup-backups.sh

# Monthly doc review (1st of month, 3 AM)
0 3 1 * * cd /path/to/fixzit && ./scripts/review-docs.sh

# Weekly duplicate detection (Monday, 9 AM)
0 9 * * 1 cd /path/to/fixzit && ./scripts/detect-duplicates.sh
```

### GitHub Actions Setup

The workflows are already configured in `.github/workflows/`. They will run automatically based on their schedules.

To test manually:
1. Go to Actions tab in GitHub
2. Select the workflow
3. Click "Run workflow"

---

## Configuration

### Backup Retention Policy

Edit `scripts/cleanup-backups.sh`:
```bash
# Change retention count (default: 2)
# Keep only last N backups
```

### Documentation Review Age

Edit `scripts/review-docs.sh`:
```bash
REVIEW_AGE_DAYS=90  # Change to desired age threshold
```

### Duplicate Detection Threshold

Edit `.github/workflows/duplicate-detection.yml`:
```yaml
env:
  THRESHOLD_MB: 5  # Change threshold in MB
```

Or set environment variable:
```bash
export THRESHOLD_MB=10
./scripts/detect-duplicates.sh --fail-on-duplicates
```

---

## Output Examples

### Cleanup Backups
```
=== Backup Retention Policy ===
Keeping only the 2 most recent backups in each directory

Checking: i18n/dictionaries/backup
  Total backups: 5
  Deleting 3 old backups...
    Removing: ar.ts.backup.1763449004383 (1.1M)
    Removing: en.ts.backup.1763449004383 (866K)
    Removing: en.ts.old (848K)
  ✓ Cleanup complete

=== Summary ===
Space saved: 2.8M
```

### Documentation Review
```
=== Documentation Review Report ===

✓ TECHNICAL_DEBT_BACKLOG.md
   Size: 16K | Age: 5 days | Modified: 2025-11-15
   
⚠️  OLD_FEATURE_PLAN.md
   Size: 24K | Age: 125 days | Modified: 2025-07-18
   
=== Review Summary ===
⚠️ 1 file(s) older than 90 days:
  - OLD_FEATURE_PLAN.md (125 days old)
```

### Duplicate Detection
```
⚠️ Found 2 groups of duplicate files

Duplicate Group (Hash: 0858b020...)
  Size: 1,138,364 bytes each
  Count: 3 copies
  Waste: 2,276,728 bytes (2.17 MB)
    - ./i18n/dictionaries/ar.ts.old
    - ./i18n/dictionaries/backup/ar.ts.backup.1
    - ./i18n/dictionaries/backup/ar.ts.backup.2

Total wasted space: 2.17 MB
```

---

## Troubleshooting

### Script Permission Denied

```bash
chmod +x scripts/cleanup-backups.sh
```

### Python Not Found

Ensure Python 3 is installed:
```bash
python3 --version
```

### BC Command Not Found (macOS)

```bash
brew install bc
```

### Script Fails in CI

Check workflow logs in GitHub Actions:
- Actions tab > Select workflow > View run details

---

## Maintenance

### Monthly Tasks

1. Run backup cleanup: `./scripts/cleanup-backups.sh`
2. Review documentation: `./scripts/review-docs.sh`
3. Check for duplicates: `./scripts/detect-duplicates.sh`

### After Major Milestones

1. Archive completion reports: `./scripts/archive-milestone.sh "Milestone Name"`
2. Update TECHNICAL_DEBT_BACKLOG.md
3. Commit and push changes

---

## Best Practices

1. **Always backup before cleanup** - Scripts create safety backups automatically
2. **Review before archiving** - Check files before moving to archives
3. **Monitor CI/CD** - Check GitHub Actions for automated runs
4. **Regular maintenance** - Run scripts monthly for optimal organization
5. **Update thresholds** - Adjust based on project growth

---

## Related Documentation

- [Technical Debt Backlog](../docs/current/TECHNICAL_DEBT_BACKLOG.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

---

**Last Updated:** November 20, 2025  
**Maintained by:** System Automation Team
