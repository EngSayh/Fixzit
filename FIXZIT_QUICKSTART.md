# Fixzit Governance System - Quick Start

## Commands

```bash
# Build review packs
npm run fixzit:pack:landing

# Scan for duplicates
npm run fixzit:dedupe:scan
cat .fixzit/dedupe-report.md

# Apply de-dupe (after review)
npm run fixzit:dedupe:apply

# Migrate MongoDB imports
npm run fixzit:mongo:migrate

# Run verification gates
npm run fixzit:verify
```

## Workflow

1. **Scan duplicates**: `npm run fixzit:dedupe:scan`
2. **Build pack**: `npm run fixzit:pack:landing`
3. **Claude review**: Drag `.fixzit/packs/landing-hydration/` into Claude
4. **Verify**: `npm run fixzit:verify`
5. **Commit with artifacts**: `git add .fixzit/artifacts/`

## Documentation

- `GOVERNANCE.md` - Non-negotiable rules
- `CLAUDE_PROMPTS.md` - Prompt templates
- `fixzit.pack.yaml` - Pack configurations
