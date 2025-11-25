# Form Save Events Documentation

## Overview

The Fixzit application uses a custom event-based system to handle form saving when users attempt to navigate away with unsaved changes. This document explains how to implement this pattern in your form components.

## Event Flow

1. **User attempts navigation** with unsaved changes
2. **TopBar** intercepts and shows "Unsaved Changes" dialog
3. **User clicks "Save & Continue"**
4. **TopBar** dispatches `fixzit:save-forms` event
5. **Form components** listen for this event and trigger save operations
6. **Form components** dispatch success/error events when save completes
7. **TopBar** waits for confirmation (max 5 seconds timeout)
8. **TopBar** proceeds with navigation on success or shows error

## Event Types

### 1. Save Request Event: `fixzit:save-forms`

Dispatched by TopBar when user clicks "Save & Continue".

```typescript
window.dispatchEvent(
  new CustomEvent("fixzit:save-forms", {
    detail: { timestamp: Date.now() },
  }),
);
```

### 2. Save Success Event: `fixzit:forms-saved`

Your form should dispatch this after successfully saving.

```typescript
window.dispatchEvent(new CustomEvent("fixzit:forms-saved"));
```

### 3. Save Error Event: `fixzit:forms-save-error`

Your form should dispatch this if save fails.

```typescript
window.dispatchEvent(
  new CustomEvent("fixzit:forms-save-error", {
    detail: { error: "Failed to save work order: Network error" },
  }),
);
```

## Implementation Example

### Basic Form Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useFormState } from '@/contexts/FormStateContext';

export default function WorkOrderForm() {
  const [formData, setFormData] = useState({ /* ... */ });
  const { setUnsavedChanges, clearUnsavedChanges } = useFormState();
  const [hasChanges, setHasChanges] = useState(false);

  // Track form changes
  useEffect(() => {
    if (hasChanges) {
      setUnsavedChanges('work-order-form');
    } else {
      clearUnsavedChanges('work-order-form');
    }
  }, [hasChanges, setUnsavedChanges, clearUnsavedChanges]);

  // Listen for save event from TopBar
  useEffect(() => {
    const handleSaveRequest = async (event: Event) => {
      try {
        // Perform your save operation
        const response = await fetch('/api/work-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error('Failed to save work order');
        }

        // Clear unsaved changes flag
        setHasChanges(false);
        clearUnsavedChanges('work-order-form');

        // Notify TopBar of success
        window.dispatchEvent(new CustomEvent('fixzit:forms-saved'));

      } catch (error) {
        // Notify TopBar of error
        window.dispatchEvent(new CustomEvent('fixzit:forms-save-error', {
          detail: {
            error: error instanceof Error
              ? error.message
              : 'Failed to save work order'
          }
        }));
      }
    };

    window.addEventListener('fixzit:save-forms', handleSaveRequest);
    return () => window.removeEventListener('fixzit:save-forms', handleSaveRequest);
  }, [formData, clearUnsavedChanges]);

  return (
    <form>
      {/* Your form fields */}
    </form>
  );
}
```

### React Hook Form Example

```typescript
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useFormState } from '@/contexts/FormStateContext';

export default function PropertyForm() {
  const { register, handleSubmit, formState: { isDirty } } = useForm();
  const { setUnsavedChanges, clearUnsavedChanges } = useFormState();

  // Track form dirty state
  useEffect(() => {
    if (isDirty) {
      setUnsavedChanges('property-form');
    } else {
      clearUnsavedChanges('property-form');
    }
  }, [isDirty, setUnsavedChanges, clearUnsavedChanges]);

  // Listen for save event
  useEffect(() => {
    const handleSaveRequest = async () => {
      try {
        // Use handleSubmit to validate and save
        await handleSubmit(async (data) => {
          const response = await fetch('/api/properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (!response.ok) throw new Error('Save failed');

          clearUnsavedChanges('property-form');
          window.dispatchEvent(new CustomEvent('fixzit:forms-saved'));
        })();
      } catch (error) {
        window.dispatchEvent(new CustomEvent('fixzit:forms-save-error', {
          detail: { error: 'Failed to save property' }
        }));
      }
    };

    window.addEventListener('fixzit:save-forms', handleSaveRequest);
    return () => window.removeEventListener('fixzit:save-forms', handleSaveRequest);
  }, [handleSubmit, clearUnsavedChanges]);

  return <form>{/* ... */}</form>;
}
```

## Best Practices

### 1. Always Clean Up Event Listeners

Use the cleanup function in `useEffect` to prevent memory leaks:

```typescript
useEffect(() => {
  const handler = async () => {
    /* ... */
  };
  window.addEventListener("fixzit:save-forms", handler);
  return () => window.removeEventListener("fixzit:save-forms", handler);
}, [dependencies]);
```

### 2. Handle Errors Gracefully

Always dispatch either success or error event - never leave TopBar waiting:

```typescript
try {
  await saveData();
  window.dispatchEvent(new CustomEvent("fixzit:forms-saved"));
} catch (error) {
  window.dispatchEvent(
    new CustomEvent("fixzit:forms-save-error", {
      detail: { error: "Descriptive error message" },
    }),
  );
}
```

### 3. Provide Descriptive Error Messages

Include context in error messages to help users understand what failed:

```typescript
detail: {
  error: `Failed to save ${formType}: ${error.message}`;
}
```

### 4. Update FormStateContext

Always clear unsaved changes after successful save:

```typescript
const { clearUnsavedChanges } = useFormState();

// After successful save:
clearUnsavedChanges("your-form-id");
window.dispatchEvent(new CustomEvent("fixzit:forms-saved"));
```

### 5. Consider Multiple Forms on One Page

If you have multiple forms on a page, coordinate their saves:

```typescript
const handleSaveRequest = async () => {
  try {
    // Save all forms
    await Promise.all([saveForm1(), saveForm2(), saveForm3()]);

    // Clear all unsaved changes
    clearUnsavedChanges("form-1");
    clearUnsavedChanges("form-2");
    clearUnsavedChanges("form-3");

    window.dispatchEvent(new CustomEvent("fixzit:forms-saved"));
  } catch (error) {
    window.dispatchEvent(
      new CustomEvent("fixzit:forms-save-error", {
        detail: { error: "Failed to save one or more forms" },
      }),
    );
  }
};
```

## Timeout Behavior

The TopBar will wait **5 seconds** for a response event. If no event is received:

- An error is displayed: "Save operation timed out after 5 seconds"
- The dialog remains open
- User can retry or choose to discard changes

Ensure your save operations complete within this timeframe or dispatch an error event explaining the delay.

## Testing

Test your implementation by:

1. Making changes in your form
2. Clicking the logo or attempting navigation
3. Verifying the unsaved changes dialog appears
4. Clicking "Save & Continue"
5. Confirming either:
   - Form saves and navigation proceeds (success)
   - Error message appears (failure)
   - Timeout error after 5 seconds (no event dispatched)

## Migration Guide

If you have existing forms using the old pattern, update them:

**Before:**

```typescript
// Forms didn't respond to save events
// TopBar just waited 300ms
```

**After:**

```typescript
useEffect(
  () => {
    const handleSaveRequest = async () => {
      try {
        await saveYourForm();
        window.dispatchEvent(new CustomEvent("fixzit:forms-saved"));
      } catch (error) {
        window.dispatchEvent(
          new CustomEvent("fixzit:forms-save-error", {
            detail: { error: error.message },
          }),
        );
      }
    };

    window.addEventListener("fixzit:save-forms", handleSaveRequest);
    return () =>
      window.removeEventListener("fixzit:save-forms", handleSaveRequest);
  },
  [
    /* dependencies */
  ],
);
```

## Related Documentation

- [FormStateContext Documentation](./FORM_STATE_CONTEXT.md)
- [Navigation Pattern Guide](./NAVIGATION_PATTERNS.md)
- [TopBar Component](../components/TopBar.tsx)
