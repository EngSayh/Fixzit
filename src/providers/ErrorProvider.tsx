// src/providers/ErrorProvider.tsx - Error handling provider wrapper
'use client';
import { ErrorProvider } from '@/src/contexts/ErrorContext';
import ErrorListeners from '@/src/components/system/ErrorListeners';

export default function ErrorProviderWrapper({ children }: { children: React.ReactNode }) {
  // TODO: Replace with actual auth context when available
  const getUser = () => undefined;

  return (
    <ErrorProvider>
      {children}
      <ErrorListeners getUser={getUser} />
    </ErrorProvider>
  );
}
