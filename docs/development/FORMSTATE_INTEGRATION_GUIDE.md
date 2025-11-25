# FormStateContext Integration Guide

## Production-Ready Unsaved Changes Tracking

This guide shows how to integrate the `useFormTracking` hook with your forms to enable automatic unsaved changes detection and save coordination.

## Quick Start

### 1. Basic Form Integration

```tsx
"use client";

import { useState } from "react";
import { useFormTracking } from "@/hooks/useFormTracking";

function MyForm() {
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [originalData] = useState({ name: "", email: "" });

  // Track if form has unsaved changes
  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Register with FormStateContext
  const { handleSubmit } = useFormTracking({
    formId: "my-form",
    isDirty,
    onBeforeSave: async () => {
      const response = await fetch("/api/save", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Save failed");
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <button type="submit">Save</button>
    </form>
  );
}
```

### 2. Real-World Example: Aqar Listing Form

```tsx
"use client";

import { useState, useEffect } from "react";
import { useFormTracking } from "@/hooks/useFormTracking";
import { useRouter } from "next/navigation";

interface ListingFormData {
  title: string;
  description: string;
  price: number;
  propertyType: string;
  // ... other fields
}

function CreateListingForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<ListingFormData>({
    title: "",
    description: "",
    price: 0,
    propertyType: "APARTMENT",
  });

  const [originalData] = useState(formData);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Calculate dirty state
  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Integrate with FormStateContext
  const { handleSubmit } = useFormTracking({
    formId: "create-listing-form",
    isDirty,
    onBeforeSave: async () => {
      setSaveStatus("saving");

      try {
        const response = await fetch("/api/aqar/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error("Failed to create listing");
        }

        const { listing } = await response.json();
        setSaveStatus("saved");

        // Navigate after successful save
        router.push(`/aqar/listings/${listing._id}`);
      } catch (error) {
        setSaveStatus("error");
        throw error;
      }
    },
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
      <input
        type="text"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Property Title"
        required
      />

      <textarea
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="Description"
        required
      />

      <input
        type="number"
        value={formData.price}
        onChange={(e) =>
          setFormData({ ...formData, price: Number(e.target.value) })
        }
        placeholder="Price"
        required
        min="0"
      />

      {/* Save button with loading state */}
      <button
        type="submit"
        disabled={saveStatus === "saving"}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {saveStatus === "saving" ? "Saving..." : "Create Listing"}
      </button>

      {saveStatus === "error" && (
        <div className="text-red-600">Failed to save. Please try again.</div>
      )}
    </form>
  );
}

export default CreateListingForm;
```

## Forms That Need Integration

### High Priority (Aqar Module)

1. ✅ **`app/aqar/listings/create/page.tsx`** - Create Listing Form
2. ✅ **`app/aqar/listings/[id]/edit/page.tsx`** - Edit Listing Form
3. ✅ **`app/aqar/leads/create/page.tsx`** - Lead Form
4. ✅ **`app/aqar/projects/create/page.tsx`** - Project Form

### Medium Priority (FM Module)

5. ⏳ **`app/fm/properties/page.tsx`** - CreatePropertyForm
6. ⏳ **`app/fm/projects/page.tsx`** - CreateProjectForm
7. ⏳ **`app/fm/vendors/page.tsx`** - CreateVendorForm
8. ⏳ **`app/fm/tenants/page.tsx`** - CreateTenantForm

### Low Priority

9. ⏳ **`app/marketplace/vendor/products/upload/page.tsx`** - Product Upload
10. ⏳ **`components/forms/ExampleForm.tsx`** - Example/Demo Forms

## Testing Navigation Warning

After integration, test the following scenarios:

### 1. Browser Back Button

1. Fill out form with changes
2. Click browser back button
3. **Expected**: Confirmation dialog appears

### 2. Link Navigation

1. Fill out form with changes
2. Click navigation link (e.g., TopBar menu item)
3. **Expected**: Confirmation dialog appears

### 3. Form Submission

1. Fill out form
2. Click "Save" button
3. **Expected**: No warning, form saves and navigates

### 4. Tab Close/Refresh

1. Fill out form with changes
2. Close browser tab OR refresh page
3. **Expected**: Browser native "Leave site?" dialog

## Best Practices

### 1. Use Unique Form IDs

```tsx
// ❌ Bad - generic ID
formId: "form";

// ✅ Good - specific ID
formId: "aqar-listing-create-form";
```

### 2. Deep Comparison for Complex Objects

```tsx
import isEqual from "lodash/isEqual";

const isDirty = !isEqual(formData, originalData);
```

### 3. Handle Save Errors Properly

```tsx
onBeforeSave: async () => {
  try {
    await saveData();
  } catch (error) {
    // Log error and re-throw to prevent form from being marked clean
    console.error("Save failed:", error);
    throw error;
  }
};
```

### 4. Reset originalData After Save

```tsx
const [originalData, setOriginalData] = useState(initialData);

onBeforeSave: async () => {
  await saveData();
  // Update original data so form is no longer dirty
  setOriginalData(formData);
};
```

## Migration Checklist

For each form:

- [ ] Import `useFormTracking` hook
- [ ] Track `isDirty` state (compare current vs original data)
- [ ] Call `useFormTracking()` with unique `formId`
- [ ] Implement `onBeforeSave` callback
- [ ] Replace `onSubmit` with `handleSubmit` from hook
- [ ] Test navigation warning works
- [ ] Test successful save clears warning
- [ ] Test error handling doesn't clear warning

## Estimated Time

- **Per Form**: 10-15 minutes
- **Total (10 forms)**: ~2-3 hours
- **Testing**: 30 minutes

## Status: READY FOR PRODUCTION ✅

The `useFormTracking` hook is production-ready and can be integrated into all forms following the examples above.
