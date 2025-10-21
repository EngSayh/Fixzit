'use client';

import { useEffect, useState } from 'react';
import { useFormState } from '@/contexts/FormStateContext';

export default function ExampleForm() {
  const { setHasUnsavedChanges, registerSaveHandler, unregisterSaveHandler } = useFormState();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [pristine, setPristine] = useState(true);

  // Register save handler on mount
  useEffect(() => {
    const handleSave = async () => {
      try {
        const response = await fetch('/api/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Save failed: ${response.status} ${errorText}`);
        }

        // Optionally handle successful save
        const data = await response.json();
        console.log('Save successful:', data);
      } catch (error) {
        console.error('Error saving form:', error);
        // Optionally show user-facing error state
        // You could add state like setErrorMessage(error.message);
      throw error; // Re-throw to let FormStateContext handle it if needed
    }
  };

  registerSaveHandler('exampleForm', handleSave);
  return () => unregisterSaveHandler('exampleForm');
}, [formData, registerSaveHandler, unregisterSaveHandler]);  // Track changes
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (pristine) {
      setPristine(false);
      setHasUnsavedChanges(true);
    }
  };

  return (
    <form>
      <input
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
      />
      {/* ...existing code... */}
    </form>
  );
}