# Translation System Documentation

This folder contains documentation and artifacts related to Fixzit's bilingual translation system (English & Arabic).

## Files

### Documentation

- **[TRANSLATION_AUDIT_REPORT.md](TRANSLATION_AUDIT_REPORT.md)** - Comprehensive report of translation system architecture, coverage, and maintenance procedures

### Audit Artifacts

- **translation-audit.json** - Machine-readable audit results with detailed file mappings
- **translation-audit.csv** - Spreadsheet-format audit results for analysis

## Quick Reference

### Translation System Overview

- **Primary Source**: `contexts/TranslationContext.tsx` (1,927 keys in EN & AR)
- **Secondary Source**: `i18n/*.json` files (403 keys in EN & AR)
- **Status**: ✅ 100% parity achieved (0 missing keys)

### Running Translation Audit

```bash
node scripts/audit-translations.mjs
```

### Adding New Translations

1. Add to both EN and AR in `contexts/TranslationContext.tsx`:

```typescript
ar: {
  'module.category.key': 'النص العربي',
},
en: {
  'module.category.key': 'English text',
}
```

2. Run audit to verify:

```bash
node scripts/audit-translations.mjs
```

3. Commit changes (pre-commit hook will validate)

### Key Naming Conventions

- **Use namespaced keys**: `module.category.key` (e.g., `finance.payment.bankName`)
- **Avoid unnamespaced keys**: Don't use `"Bank Name"` directly as a key
- **Consistent prefixes**: All keys in a module should start with same prefix

### Translation Tests

- **Test Suite**: `tests/unit/contexts/TranslationContext.test.tsx`
- **Coverage**: All modules, language switching, RTL/LTR, persistence
- **Run Tests**: `pnpm test tests/unit/contexts/TranslationContext.test.tsx`

## Maintenance

### Pre-commit Hook

Translation audit runs automatically before every commit. To install:

```bash
bash scripts/setup-git-hooks.sh
```

### Fixing Translation Gaps

If audit finds missing keys:

```bash
node scripts/audit-translations.mjs --fix
```

Then review and commit the auto-generated translations.

## Related Documentation

- [Agent Instructions](../../.github/copilot-instructions.md) - Translation guidelines for agents
- [Contributing Guide](../../CONTRIBUTING.md) - Team workflow and standards

---

**Last Updated**: November 9, 2025  
**Maintained By**: Engineering Team
