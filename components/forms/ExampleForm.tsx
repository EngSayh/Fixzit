'use client';
"use client";

import { useEffect, useState } from "react";
import { useFormState } from "@/contexts/FormStateContext";
import { logger } from "@/lib/logger";

export default function ExampleForm() {
  const { markFormDirty, markFormClean, onSaveRequest } = useFormState();
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [pristine, setPristine] = useState(true);
  const formId = "exampleForm";

  // Register save handler on mount
  useEffect(() => {
    const handleSave = async () => {
      try {
        const response = await fetch("/api/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Save failed: ${response.status} ${errorText}`);
        }

        // Mark form as clean after successful save
        markFormClean(formId);

        // Success handled silently - form state cleared
        await response.json();
      } catch (error) {
        logger.error("Error saving form:", { error });
        // Optionally show user-facing error state
        // You could add state like setErrorMessage(error.message);
        throw error; // Re-throw to let FormStateContext handle it if needed
      }
    };

    const dispose = onSaveRequest(formId, handleSave);
    return dispose;
  }, [formData, onSaveRequest, formId, markFormClean]);

  // Track changes
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (pristine) {
      setPristine(false);
      markFormDirty(formId);
    }
  };

  return (
    <form>
      <input
        value={formData.name}
        onChange={(e) => handleChange("name", e.target.value)}
      />
      {/* ...existing code... */}
    </form>
  );
}
