# Migration Guide: Deprecated Hooks → useFormTracking

## 🎯 Overview

This document tracks the migration from deprecated hooks to the new consolidated `useFormTracking` hook.

**Related PR**: [#218 - Fix Security Vulnerabilities and Architectural Issues](https://github.com/EngSayh/Fixzit/pull/218)

---

## 📋 Migration Checklist

### ✅ ALL MIGRATIONS COMPLETE

- ✅ **app/fm/page.tsx** - Migrated to `useFormTracking` (PR #222)
  - Completed: 2025-11-05
  - Changed from manual markDirty/markClean to derived isDirty prop
  - Removed local dialog components (now managed by FormStateContext)

### ✅ Deprecated Files Deleted

- ✅ **hooks/\_deprecated_useFormDirtyState.ts** - DELETED
- ✅ **hooks/\_deprecated_useUnsavedChanges.tsx** - DELETED
- ✅ **hooks/**tests**/useUnsavedChanges.test.tsx** - DELETED

---

## 🔄 Migration Pattern

### Before (useUnsavedChanges):

```tsx
import { useUnsavedChanges, UnsavedChangesWarning, SaveConfirmation }
  from '@/hooks/useUnsavedChanges';

function MyComponent() {
  const {
    hasUnsavedChanges,
    showWarning,
    showSaveConfirm,
    markDirty,
    markClean,
    handleSave,
    handleDiscard,
    handleStay
  } = useUnsavedChanges({
    message: 'You have unsaved changes...',
    onSave: async () => {
      await saveData();
    }
  });

  // Manually call markDirty() when data changes
  const handleChange = (value) => {
    setValue(value);
    markDirty();
  };

  return (
    <>
      <input onChange={(e) => handleChange(e.target.value)} />
      <UnsavedChangesWarning isOpen={showWarning} ... />
    </>
  );
}
```

### After (useFormTracking):

```tsx
import { useFormTracking } from "@/hooks/useFormTracking";
import { UnsavedChangesWarning } from "@/components/common/UnsavedChangesWarning";
import { SaveConfirmation } from "@/components/common/SaveConfirmation";

function MyComponent() {
  const [formData, setFormData] = useState(initialData);
  const [originalData] = useState(initialData);

  // Derive isDirty from state comparison (component's responsibility)
  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

  const { handleSubmit } = useFormTracking({
    formId: "my-form",
    isDirty,
    onSave: async () => {
      await saveData(formData);
      setOriginalData(formData); // Reset baseline after save
    },
    unsavedMessage: "You have unsaved changes...", // Optional
  });

  // No need to call markDirty - state comparison handles it
  const handleChange = (value) => {
    setFormData({ ...formData, field: value });
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input onChange={(e) => handleChange(e.target.value)} />
        <button type="submit" disabled={!isDirty}>
          Save
        </button>
      </form>
      {/* UI components same as before */}
    </>
  );
}
```

---

## 🔑 Key Differences

| Aspect                | useUnsavedChanges (OLD)          | useFormTracking (NEW)               |
| --------------------- | -------------------------------- | ----------------------------------- |
| **Dirty Detection**   | Manual (`markDirty()`)           | Automatic (via `isDirty` prop)      |
| **Data Tracking**     | Internal refs + JSON.stringify   | Component's responsibility          |
| **UI Components**     | Exported from hook               | Separate components                 |
| **Form Registration** | ❌ No global context             | ✅ Registers with FormStateContext  |
| **Browser Guards**    | ✅ beforeunload                  | ✅ beforeunload (improved)          |
| **Save Handler**      | `handleSave()`                   | `handleSubmit()`                    |
| **Performance**       | ⚠️ JSON.stringify on every check | ✅ Efficient (component-controlled) |

---

## 🚀 Migration Steps for app/fm/page.tsx

### Step 1: Update imports

```tsx
// REMOVE
import { useUnsavedChanges } from "@/hooks/_deprecated_useUnsavedChanges";

// ADD
import { useFormTracking } from "@/hooks/useFormTracking";
// Note: UI components already migrated ✅
```

### Step 2: Add state management for form data

```tsx
// Track original state for comparison
const [originalSearchTerm, setOriginalSearchTerm] = useState("");
const [originalStatusFilter, setOriginalStatusFilter] = useState("all");

// Compute isDirty
const isDirty =
  searchTerm !== originalSearchTerm || statusFilter !== originalStatusFilter;
```

### Step 3: Replace hook usage

```tsx
// REPLACE
const { ... } = useUnsavedChanges({ ... });

// WITH
const { handleSubmit } = useFormTracking({
  formId: 'fm-filters',
  isDirty,
  onSave: async () => {
    // Save logic (simulate in this case)
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Reset baselines after successful save
    setOriginalSearchTerm(searchTerm);
    setOriginalStatusFilter(statusFilter);
  },
  unsavedMessage: t('unsaved.message', 'You have unsaved changes...')
});
```

### Step 4: Remove markDirty/markClean calls

```tsx
// REMOVE these calls
markDirty();
markClean();

// State comparison handles dirty detection automatically
```

### Step 5: Update save button

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleSubmit} // Changed from handleSave
  disabled={!isDirty}
  className="bg-success text-white hover:bg-success/90"
>
  {t("common.save", "Save")}
</Button>
```

---

## ⚠️ Common Pitfalls

### 1. **Forgetting to reset baseline after save**

```tsx
// ❌ WRONG - isDirty will stay true even after save
onSave: async () => {
  await saveData();
  // Missing: setOriginalData(currentData)
};

// ✅ CORRECT
onSave: async () => {
  await saveData();
  setOriginalData(currentData); // Reset baseline
};
```

### 2. **Using JSON.stringify for complex objects**

```tsx
// ⚠️ WORKS but can be slow for large objects
const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

// ✅ BETTER - Use shallow comparison or specific field checks
const isDirty =
  formData.name !== originalData.name || formData.email !== originalData.email;

// ✅ BEST - Use a library like lodash
import { isEqual } from "lodash";
const isDirty = !isEqual(formData, originalData);
```

### 3. **Not providing a unique formId**

```tsx
// ❌ WRONG - Multiple forms with same ID
useFormTracking({ formId: 'form', ... })
useFormTracking({ formId: 'form', ... }) // Collision!

// ✅ CORRECT
useFormTracking({ formId: 'user-profile-form', ... })
useFormTracking({ formId: 'settings-form', ... })
```

---

## 📊 Migration Progress

- **Total consumers**: 1 active file
- **Migrated**: 1 (100%) ✅
- **Remaining**: 0 (0%) ✅
- **Completed**: 2025-11-05

---

## ✅ MIGRATION COMPLETE

All deprecated hooks have been successfully migrated and cleaned up:

- ✅ All consumers migrated to `useFormTracking`
- ✅ Deprecated hook files deleted
- ✅ Test files removed
- ✅ No remaining references in codebase
- ✅ Migration guide updated

### Related PRs

- [#218](https://github.com/EngSayh/Fixzit/pull/218) - Security fixes and hook consolidation
- [#222](https://github.com/EngSayh/Fixzit/pull/222) - FM page migration

### Resolved Issues

- Closes #219 (Migration task)
- Closes #220 (Cleanup task)

---

## 📚 Reference

For future migrations or understanding the new pattern:

1. Review test files: `tests/hooks/useFormTracking.test.tsx`
2. Check implementation: `hooks/useFormTracking.ts`
3. See migration example: `app/fm/page.tsx` (git history)

---

**Migration Status**: ✅ COMPLETE  
**Last Updated**: 2025-11-05  
**Status**: 🟡 In Progress (0/1 files migrated)
