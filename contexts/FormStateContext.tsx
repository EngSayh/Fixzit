'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FormStateContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  setUnsavedChanges: (value: boolean) => void;
  registerSaveHandler: (id: string, handler: () => Promise<void>) => void;
  unregisterSaveHandler: (id: string) => void;
  saveAll: () => Promise<void>;
}

const FormStateContext = createContext<FormStateContextType | undefined>(undefined);

export function FormStateProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveHandlers, setSaveHandlers] = useState<Map<string, () => Promise<void>>>(new Map());

  const registerSaveHandler = useCallback((id: string, handler: () => Promise<void>) => {
    setSaveHandlers(prev => {
      const newMap = new Map(prev);
      newMap.set(id, handler);
      return newMap;
    });
  }, []);

  const unregisterSaveHandler = useCallback((id: string) => {
    setSaveHandlers(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const saveAll = useCallback(async () => {
    const handlers = Array.from(saveHandlers.values());
    await Promise.all(handlers.map(handler => handler()));
    setHasUnsavedChanges(false);
  }, [saveHandlers]);

  const setUnsavedChanges = useCallback((value: boolean) => {
    setHasUnsavedChanges(value);
  }, []);

  return (
    <FormStateContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        setUnsavedChanges,
        registerSaveHandler,
        unregisterSaveHandler,
        saveAll,
      }}
    >
      {children}
    </FormStateContext.Provider>
  );
}

export function useFormState() {
  const context = useContext(FormStateContext);
  if (!context) {
    throw new Error('useFormState must be used within FormStateProvider');
  }
  return context;
}
