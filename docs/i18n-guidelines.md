# i18n Translation Guidelines

**Last Updated**: 2025-11-10  
**Maintained By**: Engineering Team  
**Version**: 1.0

---

## Overview

Fixzit uses a dual-catalog system for internationalization:

- **Primary Source**: `contexts/TranslationContext.tsx` (hardcoded key-value pairs)
- **Secondary Source**: `i18n/en.json` and `i18n/ar.json` (JSON catalogs)

**Supported Languages**:

- English (EN) - Left-to-Right (LTR)
- Arabic (AR) - Right-to-Left (RTL)

**Translation Parity**: 100% (1986 keys in both EN and AR as of 2025-11-10)

---

## Translation Key Structure

### Namespacing Convention

Keys follow a hierarchical dot notation:

```
<module>.<category>.<specific>
```

**Examples**:

```typescript
"nav.dashboard"; // Navigation item
"common.save"; // Common action
"finance.invoice.create"; // Module-specific action
"errors.validation.required"; // Error message
"time.justNow"; // Time formatting
```

### Namespace Guidelines

| Namespace   | Purpose            | Examples                                            |
| ----------- | ------------------ | --------------------------------------------------- |
| `nav.*`     | Navigation items   | `nav.dashboard`, `nav.settings`                     |
| `common.*`  | Shared UI elements | `common.save`, `common.cancel`, `common.loading`    |
| `sidebar.*` | Sidebar-specific   | `sidebar.modules`, `sidebar.account`                |
| `finance.*` | Finance module     | `finance.invoice.total`, `finance.payment.received` |
| `hr.*`      | HR module          | `hr.employee.name`, `hr.payroll.process`            |
| `errors.*`  | Error messages     | `errors.network`, `errors.validation.email`         |
| `time.*`    | Time formatting    | `time.justNow`, `time.mAgo`, `time.hAgo`            |
| `auth.*`    | Authentication     | `auth.login.title`, `auth.signup.submit`            |

---

## Safe Translation Patterns

### ✅ Pattern 1: Static Keys (RECOMMENDED)

**Always use static keys when possible:**

```typescript
// ✅ GOOD - Static key
const title = t("finance.invoice.create");

// ✅ GOOD - Static key with fallback
const label = t("common.save", "Save");
```

**Why**: Statically analyzable by audit tools, no runtime errors.

---

### ✅ Pattern 2: Dynamic Keys with Fallback (ACCEPTABLE)

**When iterating over known enums, use fallback pattern:**

```typescript
// ✅ ACCEPTABLE - Dynamic key with fallback
const getCategoryName = (category: string) =>
  t(`sidebar.category.${category}`, CATEGORY_FALLBACKS[category] || category);

// ✅ ACCEPTABLE - Iterating over known set
modules.map((m) => t(`support.modules.${m}`, m));
```

**Requirements**:

1. Variable must be from a **known, typed enum** or finite set
2. Always provide a **meaningful fallback** value
3. Fallback should be the English translation or the variable itself

**Why Acceptable**:

- Graceful degradation if key is missing
- Type-safe if using TypeScript enums
- Audit tool will flag as UNSAFE_DYNAMIC but it's a false positive

**Examples in Codebase**:

```typescript
// components/Sidebar.tsx - Line 64
t(`sidebar.category.${category}`, CATEGORY_FALLBACKS[category] || category);

// components/SupportPopup.tsx - Lines 266, 285, 300, 319, 334
t(`support.modules.${m}`, m);
t(`support.categories.${c}`, c);
t(`support.types.${t_val}`, t_val);

// app/finance/expenses/new/page.tsx - Line 894
t(`finance.category.${budget.category.toLowerCase()}`, budget.category);
```

---

### ❌ Pattern 3: Dynamic Keys WITHOUT Fallback (UNSAFE)

**Never use dynamic keys without fallback:**

```typescript
// ❌ BAD - No fallback, will return key string if missing
const label = t(`user.role.${userRole}`);

// ❌ BAD - User input in key (security risk)
const message = t(`errors.${userInput}`);
```

**Why Unsafe**:

- Returns key string if translation is missing (e.g., "user.role.ADMIN")
- User input could inject malicious keys
- No type safety or compile-time checks

**Fix**:

```typescript
// ✅ GOOD - Add fallback
const label = t(`user.role.${userRole}`, userRole.replace(/_/g, " "));

// ✅ BETTER - Use mapping object
const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: t("user.role.admin"),
  USER: t("user.role.user"),
  VIEWER: t("user.role.viewer"),
};
const label = ROLE_LABELS[userRole] || userRole;
```

---

### ❌ Pattern 4: User Input in Keys (DANGEROUS)

**Never use user input directly in translation keys:**

```typescript
// ❌ DANGEROUS - User input injection
const msg = t(`errors.${formErrors[field]}`);

// ❌ DANGEROUS - Untrusted data
const category = t(`category.${req.query.cat}`);
```

**Why Dangerous**:

- Potential security vulnerability (key injection)
- Unpredictable runtime behavior
- Cannot be audited statically

**Fix**:

```typescript
// ✅ SAFE - Validate and map user input
const ERROR_MESSAGES: Record<string, string> = {
  required: t("errors.validation.required"),
  email: t("errors.validation.email"),
  minLength: t("errors.validation.minLength"),
};
const msg = ERROR_MESSAGES[formErrors[field]] || t("errors.generic");
```

---

## Translation Audit Tool

### Running the Audit

```bash
# Check translation coverage
node scripts/audit-translations.mjs

# Auto-fix missing keys (prompts for translations)
node scripts/audit-translations.mjs --fix
```

### Audit Output

```
📦 Catalog stats
  EN keys: 1986
  AR keys: 1986
  Gap    : 0

📊 Summary
  Files scanned: 379
  Keys used    : 1555
  Missing (catalog parity): 0
  Missing (used in code)  : 0

⚠️  UNSAFE_DYNAMIC: Found template-literal t(`...`) usages
    Files: components/Sidebar.tsx, components/SupportPopup.tsx, ...

✅ Translation audit passed!
```

### Understanding UNSAFE_DYNAMIC Warnings

**What it means**: The audit tool found template literals in `t()` calls that it cannot statically analyze.

**Not necessarily a problem if**:

1. Dynamic part is from a known enum or finite set
2. Fallback value is provided
3. No user input is involved

**Action Required**:

- Review each flagged file
- Verify fallback is present
- Document as safe pattern OR refactor if truly unsafe

---

## Adding New Translations

### Step 1: Add to TranslationContext.tsx

```typescript
// contexts/TranslationContext.tsx

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // ... existing keys
    "myModule.newKey": "النص العربي",
  },
  en: {
    // ... existing keys
    "myModule.newKey": "English text",
  },
};
```

### Step 2: Add to JSON Catalogs (Optional, for consistency)

```json
// i18n/en.json
{
  "myModule": {
    "newKey": "English text"
  }
}

// i18n/ar.json
{
  "myModule": {
    "newKey": "النص العربي"
  }
}
```

### Step 3: Use in Code

```typescript
import { useTranslation } from '@/contexts/TranslationContext';

function MyComponent() {
  const { t } = useTranslation();
  return <div>{t('myModule.newKey')}</div>;
}
```

### Step 4: Verify

```bash
# Run audit to ensure no missing keys
node scripts/audit-translations.mjs

# Check TypeScript compiles
pnpm typecheck
```

---

## RTL (Right-to-Left) Support

### Using isRTL Flag

```typescript
import { useTranslation } from '@/contexts/TranslationContext';

function MyComponent() {
  const { t, isRTL } = useTranslation();

  return (
    <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
      {t('common.welcome')}
    </div>
  );
}
```

### Flexbox Direction

```typescript
// Automatic flex direction reversal for RTL
<div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
  <Icon />
  <span>{t('nav.home')}</span>
</div>
```

### Conditional Positioning

```typescript
// Position elements based on text direction
<div className={`absolute ${isRTL ? 'right-0' : 'left-0'}`}>
  {t('common.menu')}
</div>
```

---

## Best Practices

### 1. Always Provide Context

```typescript
// ❌ BAD - Ambiguous key
t("name");

// ✅ GOOD - Clear namespace
t("user.profile.name");
t("property.address.name");
```

### 2. Use Semantic Fallbacks

```typescript
// ❌ BAD - Meaningless fallback
t("finance.status.pending", "KEY_MISSING");

// ✅ GOOD - Readable fallback
t("finance.status.pending", "Pending");
```

### 3. Keep Keys Lowercase with Dots

```typescript
// ❌ BAD
t("Finance.Invoice.CreateNew");
t("finance_invoice_create");

// ✅ GOOD
t("finance.invoice.create");
```

### 4. Group Related Keys

```typescript
// ✅ GOOD - Grouped by feature
"finance.invoice.create";
"finance.invoice.edit";
"finance.invoice.delete";
"finance.invoice.total";
"finance.invoice.status.paid";
"finance.invoice.status.pending";
```

### 5. Avoid Duplication

```typescript
// ❌ BAD - Duplicate translations
'common.save': 'Save'
'form.save': 'Save'
'invoice.save': 'Save'

// ✅ GOOD - Reuse common key
'common.save': 'Save'
// Use t('common.save') everywhere
```

---

## Testing Translations

### Manual Testing

1. Switch language in UI (LanguageSelector component)
2. Verify all text updates correctly
3. Check RTL layout for Arabic
4. Test edge cases (long text, special characters)

### Automated Testing

```typescript
import { render, screen } from '@testing-library/react';
import { TranslationProvider } from '@/contexts/TranslationContext';

describe('MyComponent i18n', () => {
  it('renders in English', () => {
    render(
      <TranslationProvider initialLanguage="en">
        <MyComponent />
      </TranslationProvider>
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders in Arabic', () => {
    render(
      <TranslationProvider initialLanguage="ar">
        <MyComponent />
      </TranslationProvider>
    );
    expect(screen.getByText('حفظ')).toBeInTheDocument();
  });
});
```

---

## Common Issues & Solutions

### Issue 1: Missing Translation Key

**Symptom**: Key string displayed instead of translation (e.g., "finance.invoice.total")

**Solution**:

1. Check if key exists in TranslationContext.tsx
2. Verify spelling (keys are case-sensitive)
3. Add key to both EN and AR sections
4. Run `node scripts/audit-translations.mjs` to verify

### Issue 2: Translation Audit Fails

**Symptom**: Commit hook rejects due to missing keys

**Solution**:

```bash
# See which keys are missing
node scripts/audit-translations.mjs

# Add missing keys to TranslationContext.tsx
# Then commit again
```

### Issue 3: UNSAFE_DYNAMIC Warning

**Symptom**: Audit tool reports UNSAFE_DYNAMIC for template literals

**Solution**:

1. Check if fallback is present: `t(\`key.${var}\`, fallback)` ✅
2. If no fallback, add one or refactor to static keys
3. Document as safe pattern if intentional

### Issue 4: RTL Layout Issues

**Symptom**: Arabic text displays incorrectly or layout is broken

**Solution**:

1. Use `isRTL` flag for conditional styling
2. Use Flexbox with `flex-row-reverse` for RTL
3. Test with Arabic language enabled
4. Avoid hardcoded `left`/`right` positioning

---

## Migration from Old System

If you have old code using different translation patterns:

### Before (Old Pattern)

```typescript
// Old: Hardcoded strings
<Button>Save</Button>

// Old: English-only
<span>Invoice Total</span>
```

### After (New Pattern)

```typescript
// New: Internationalized
<Button>{t('common.save')}</Button>

// New: Supports EN/AR
<span>{t('finance.invoice.total')}</span>
```

---

## Checklist for Adding New Features

When adding a new feature with UI text:

- [ ] Identify all user-facing strings
- [ ] Create namespaced translation keys
- [ ] Add keys to both EN and AR in TranslationContext.tsx
- [ ] Use `t()` function for all strings (no hardcoded text)
- [ ] Add fallback values where appropriate
- [ ] Test in both English and Arabic
- [ ] Verify RTL layout works correctly
- [ ] Run `pnpm typecheck` (0 errors)
- [ ] Run `node scripts/audit-translations.mjs` (✅ Pass)
- [ ] Commit with translation keys included

---

## Resources

- **Translation Context**: `contexts/TranslationContext.tsx`
- **JSON Catalogs**: `i18n/en.json`, `i18n/ar.json`
- **Audit Script**: `scripts/audit-translations.mjs`
- **Language Selector**: `components/i18n/LanguageSelector.tsx`
- **Examples**: `components/TopBar.tsx`, `components/Sidebar.tsx`

---

## Questions?

Contact the engineering team or review existing components for examples of proper translation usage.

**Remember**: When in doubt, use a static key with a fallback value! 🌍
