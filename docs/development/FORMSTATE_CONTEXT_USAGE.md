# FormStateContext Usage Guide

## Overview

The `FormStateContext` provides a centralized way to track form state across the application, enabling features like:

- Unsaved changes detection in TopBar
- Coordinated form saving before navigation
- Multiple form management

## Quick Start

### 1. Wrap Your App with FormStateProvider

The provider is already set up in `providers/Providers.tsx`:

```tsx
<FormStateProvider>{/* Your app content */}</FormStateProvider>
```

### 2. Use in Form Components

```tsx
"use client";

import { useFormState } from "@/contexts/FormStateContext";
import { useEffect } from "react";

export default function MyForm() {
  const formState = useFormState();
  const formId = "my-unique-form-id";

  // Register form on mount
  useEffect(() => {
    // Register save callback
    const dispose = formState.onSaveRequest(formId, async () => {
      // Your save logic here
      await saveFormData();
      console.log("Form saved!");
    });

    // Cleanup on unmount
    return () => {
      dispose();
      formState.unregisterForm(formId);
    };
  }, [formState, formId]);

  // Mark form as dirty when fields change
  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update your local state
    setFieldValue(e.target.value);

    // Mark form as dirty
    formState.markFormDirty(formId);
  };

  // Mark form as clean after successful save
  const handleSave = async () => {
    try {
      await saveFormData();
      formState.markFormClean(formId);
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  return (
    <form>
      <input onChange={handleFieldChange} />
      <button onClick={handleSave}>Save</button>
    </form>
  );
}
```

## API Reference

### useFormState()

Returns the FormStateContext with these methods:

#### `hasUnsavedChanges: boolean`

- Whether any forms have unsaved changes

#### `onSaveRequest(formId: string, callback: () => Promise<void>): () => void`

- Register a save callback for a form
- **Returns:** Dispose function to unregister the callback
- **Example:**

  ```tsx
  const dispose = formState.onSaveRequest("myForm", async () => {
    await saveData();
  });
  ```

#### `markFormDirty(formId: string): void`

- Mark a form as having unsaved changes
- Call this when form fields are modified

#### `markFormClean(formId: string): void`

- Mark a form as having no unsaved changes
- Call this after successful save

#### `unregisterForm(formId: string): void`

- Remove form from tracking
- Call this on component unmount

#### `requestSave(): Promise<void>`

- Trigger save for all dirty forms
- Used by TopBar when user navigates with unsaved changes
- Throws error if any saves fail

## Complete Example

```tsx
"use client";

import { useState, useEffect } from "react";
import { useFormState } from "@/contexts/FormStateContext";
import { useRouter } from "next/navigation";

export default function PropertyEditForm({
  propertyId,
}: {
  propertyId: string;
}) {
  const formState = useFormState();
  const router = useRouter();
  const formId = `property-form-${propertyId}`;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  // Register form
  useEffect(() => {
    const saveData = async () => {
      setSaving(true);
      try {
        const response = await fetch(`/api/properties/${propertyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, address }),
        });

        if (!response.ok) throw new Error("Save failed");

        formState.markFormClean(formId);
      } finally {
        setSaving(false);
      }
    };

    const dispose = formState.onSaveRequest(formId, saveData);

    return () => {
      dispose();
      formState.unregisterForm(formId);
    };
  }, [formState, formId, name, address, propertyId]);

  // Mark dirty on field changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    formState.markFormDirty(formId);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    formState.markFormDirty(formId);
  };

  // Manual save
  const handleSave = async () => {
    try {
      await formState.requestSave();
      alert("Saved successfully!");
    } catch (error) {
      alert("Save failed. Please try again.");
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <input
        type="text"
        value={name}
        onChange={handleNameChange}
        placeholder="Property Name"
      />
      <input
        type="text"
        value={address}
        onChange={handleAddressChange}
        placeholder="Address"
      />
      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
      {formState.hasUnsavedChanges && (
        <p className="text-amber-600">You have unsaved changes</p>
      )}
    </form>
  );
}
```

## Integration with TopBar

The TopBar component automatically uses `formState.hasUnsavedChanges` to:

1. Show a warning icon when forms have unsaved changes
2. Display a confirmation dialog when user tries to navigate away
3. Call `formState.requestSave()` if user chooses "Save and Leave"

No additional configuration needed!

## Best Practices

1. **Unique Form IDs**: Use descriptive, unique IDs like `'property-form-123'` instead of generic names
2. **Cleanup**: Always return cleanup function from useEffect to dispose callbacks and unregister forms
3. **Save Callbacks**: Keep save callbacks simple and focused - they should only save data, not navigate
4. **Error Handling**: Wrap save logic in try/catch and handle errors appropriately
5. **Granular Marking**: Call `markFormDirty()` on specific field changes, not on every render

## Troubleshooting

### "Unsaved changes" warning not showing

- Ensure you're calling `markFormDirty(formId)` when fields change
- Check that `formId` matches between `onSaveRequest` and `markFormDirty`
- Verify FormStateProvider is wrapping your component tree

### Save callback not being called

- Ensure `onSaveRequest` is called before the form becomes dirty
- Check that the form is actually marked as dirty
- Verify the dispose function is not called prematurely

### Multiple forms saving when only one changed

- Use unique, specific form IDs
- Ensure `markFormClean` is called after successful saves
- Check that forms are properly unregistered on unmount
