'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

const QA_FLAG_KEY = 'fxz.qa-tools';
const ROLE_KEY = 'fixzit-role';
const QA_PRIVILEGED_ROLES = ['SUPER_ADMIN', 'QA', 'DEVELOPER', 'ADMIN'] as const;

const isQaPrivilegedRole = (
  role: string
): role is (typeof QA_PRIVILEGED_ROLES)[number] =>
  QA_PRIVILEGED_ROLES.includes(role as (typeof QA_PRIVILEGED_ROLES)[number]);

export default function ErrorTest() {
  const [showTest, setShowTest] = useState(false);
  const [qaEnabled, setQaEnabled] = useState(false);
  const { t, isRTL } = useTranslation();
  const floatingPositionClass = isRTL ? 'left-6' : 'right-6';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (process.env.NEXT_PUBLIC_ENABLE_QA_TOOLS !== 'true') {
      return;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const qaParam = params.get('qa');

      if (qaParam === '0') {
        localStorage.removeItem(QA_FLAG_KEY);
        setQaEnabled(false);
        setShowTest(false);
        return;
      }

      if (qaParam === '1') {
        localStorage.setItem(QA_FLAG_KEY, 'enabled');
        setQaEnabled(true);
      }

      let enabled =
        qaParam === '1' || localStorage.getItem(QA_FLAG_KEY) === 'enabled';

      if (enabled && process.env.NODE_ENV !== 'development') {
        const storedRole = (localStorage.getItem(ROLE_KEY) ?? 'guest').toUpperCase();
        if (!isQaPrivilegedRole(storedRole)) {
          enabled = false;
          localStorage.removeItem(QA_FLAG_KEY);
        }
      }

      setQaEnabled(enabled);
      if (!enabled) {
        setShowTest(false);
      }
    } catch (error) {
      console.warn('Unable to initialize QA error test tools:', error);
    }
  }, []);

  if (!qaEnabled) {
    return null;
  }

  const triggerError = () => {
    // This will trigger the error boundary
    throw new Error('Test error triggered by user for error boundary testing');
  };

  const triggerAsyncError = async () => {
    // Simulate an async error
    await new Promise(resolve => setTimeout(resolve, 1000));
    throw new Error('Async test error triggered by user');
  };

  const triggerJSONError = () => {
    // Simulate JSON parsing error
    JSON.parse('{invalid json}');
  };

  const triggerNetworkError = () => {
    // Simulate network error
    fetch('https://invalid-url-that-does-not-exist.com/api/test');
  };

  if (!showTest) {
    return (
      <button
        onClick={() => setShowTest(true)}
        className={`fixed bottom-20 ${floatingPositionClass} bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 z-50`}
        aria-label={t('qa.testErrorBoundary', 'Test Error Boundary')}
      >
        🧪 {t('qa.testErrorBoundary', 'Test Error Boundary')}
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-20 ${floatingPositionClass} bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-w-sm ${isRTL ? 'text-right' : ''}`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">🧪 {t('qa.panelTitle', 'Error Testing')}</h3>
        <button
          onClick={() => setShowTest(false)}
          className="text-gray-400 hover:text-gray-600"
          aria-label={t('a11y.close', 'Close')}
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={triggerError}
          className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
        >
          🔴 {t('qa.runtimeError', 'Runtime Error')}
        </button>

        <button
          onClick={triggerAsyncError}
          className="w-full bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700"
        >
          🟠 {t('qa.asyncError', 'Async Error')}
        </button>

        <button
          onClick={triggerJSONError}
          className="w-full bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700"
        >
          🟡 {t('qa.jsonError', 'JSON Parse Error')}
        </button>

        <button
          onClick={triggerNetworkError}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
        >
          🔵 {t('qa.networkError', 'Network Error')}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        <p>Click any button above to test the enhanced error boundary with:</p>
        <ul className="mt-1 space-y-1">
          <li>• Error ID generation</li>
          <li>• Copy to clipboard functionality</li>
          <li>• Automatic support ticket creation</li>
          <li>• Welcome email for guests</li>
        </ul>
      </div>
    </div>
  );
}
