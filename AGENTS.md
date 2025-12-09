# AI Agents Documentation

This document provides guidelines for AI agents (GitHub Copilot, Claude, etc.) working on the Fixzit codebase.

## Quick Start

1. **Read the rules**: See `.github/copilot-instructions.md` for comprehensive guidelines
2. **Check memory**: Review `ai-memory/master-index.json` for established patterns
3. **Create branch**: Never work on main/master directly
4. **Verify changes**: Run typecheck, lint, and tests before committing

## Memory-First Workflow

Before starting any complex task:

```bash
# Check memory system health
node tools/memory-selfcheck.js

# Review existing patterns
cat ai-memory/master-index.json | jq '.entries[] | select(.type == "pattern")'

# Search for relevant conventions
grep -r "keyword" ai-memory/
```

## File Organization

```
Fixzit/
├── ai-memory/              # AI memory system
│   ├── master-index.json   # Consolidated knowledge base
│   ├── batches/            # Source code batches for processing
│   ├── outputs/            # AI-generated extractions
│   └── backups/            # Auto-backups of master index
├── tools/
│   ├── smart-chunker.js    # Create batches from repo
│   ├── merge-memory.js     # Merge outputs into index
│   └── memory-selfcheck.js # Validate memory system
├── lib/
│   ├── sms-providers/      # SMS integration (Taqnyat only)
│   └── ...
└── .github/
    └── copilot-instructions.md  # Comprehensive AI rules
```

## Key Conventions

### SMS Integration
- **Only Taqnyat** is supported as SMS provider
- No Twilio, Unifonic, Nexmo, or AWS SNS
- See `lib/sms-providers/taqnyat.ts` for implementation

### Translation Keys
- Format: `module.category.key`
- Example: `finance.payment.bankName`
- Always add to both EN and AR catalogs

### Git Workflow
- Branch naming: `feat/<task>`, `fix/<issue>`, `agent/<timestamp>`
- Commit format: `<type>(<scope>): <subject>`
- Always open PR, never push to main

### Verification Gates
```bash
pnpm typecheck  # Must pass with 0 errors
pnpm lint       # Must pass with 0 errors
pnpm test       # All tests must pass
```

## Memory Pipeline Commands

### Generate Batches
```bash
node tools/smart-chunker.js
# Creates ai-memory/batches/batch-XXX.txt
```

### Merge Outputs
```bash
node tools/merge-memory.js
# Merges ai-memory/outputs/*.json into master-index.json
```

### Validate System
```bash
node tools/memory-selfcheck.js      # Check only
node tools/memory-selfcheck.js --fix # Auto-fix issues
```

## VS Code Tasks

Access via Command Palette (Cmd+Shift+P) > Tasks: Run Task:

- `AI Memory: Chunk Repository`
- `AI Memory: Merge Outputs`
- `AI Memory: Selfcheck`
- `AI Memory: Selfcheck (Fix)`
- `Build: Typecheck`
- `Build: Lint`
- `Test: Unit Tests`

## Error Handling

If you encounter issues:

1. **TypeScript errors**: Fix all, never use `// @ts-ignore`
2. **Lint errors**: Fix all, document warnings if acceptable
3. **Test failures**: Fix tests, don't skip without justification
4. **Memory corruption**: Restore from `ai-memory/backups/`

## Contact

For questions about AI integration, see the Engineering Team.

---

**Last Updated**: 2025-01-01
**Version**: 1.0
