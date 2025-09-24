// src/examples/error-handling-example.tsx - Example of how to use the error handling system
'use client';
import { useState } from 'react';
import { useErrorReporter } from '@/src/hooks/useErrorReporter';
import { useError } from '@/src/contexts/ErrorContext';
import { createProblemDetails } from '@/src/errors/problem';

export default function ErrorHandlingExample() {
  const [loading, setLoading] = useState(false);
  const reporter = useErrorReporter();
  const { notify } = useError();

  // Example 1: Simple error notification
  const handleSimpleError = async () => {
    await notify('UI-RENDER-FAIL-001', {
      message: 'Failed to load user data'
    });
  };

  // Example 2: API error with Problem Details
  const handleApiError = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ /* invalid data */ })
      });

      if (!response.ok) {
        // Parse Problem Details from response
        const problem = await response.json();
        
        // Send error report
        const incidentId = await reporter.send(problem, {
          category: 'API',
          autoTicket: true
        });

        // Show notification
        await notify(problem.code || 'WO-API-SAVE-002', {
          incidentId,
          message: problem.title,
          severity: 'P2'
        });
      }
    } catch (error) {
      // Network or other errors
      await reporter.send(error as Error, {
        category: 'NETWORK'
      });
    } finally {
      setLoading(false);
    }
  };

  // Example 3: Multiple validation errors
  const handleValidationErrors = async () => {
    const problemDetails = createProblemDetails({
      type: 'https://docs.fixzit.com/errors/validation',
      title: 'Validation failed',
      status: 400,
      code: 'WO-API-VAL-001',
      errors: [
        { path: 'title', message: 'Title is required' },
        { path: 'priority', message: 'Invalid priority value' },
        { path: 'dueDate', message: 'Due date must be in the future' }
      ]
    });

    const incidentId = await reporter.send(problemDetails);
    
    // Show dialog directly for validation errors
    const { showDialog } = useError();
    showDialog(incidentId);
  };

  // Example 4: Critical system error
  const handleCriticalError = async () => {
    try {
      // Simulate critical error
      throw new Error('Database connection lost');
    } catch (error) {
      // For critical errors, auto-send ticket
      await reporter.send(error as Error, {
        category: 'DATABASE',
        autoTicket: true
      });
      
      // Show error popup immediately
      window.dispatchEvent(new CustomEvent('fixzit:error', {
        detail: { 
          error: error as Error, 
          autoSend: true 
        }
      }));
    }
  };

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-xl font-semibold">Error Handling Examples</h2>
      
      <div className="space-y-3">
        <button
          onClick={handleSimpleError}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Trigger Simple Error (Toast)
        </button>

        <button
          onClick={handleApiError}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Trigger API Error'}
        </button>

        <button
          onClick={handleValidationErrors}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Trigger Validation Errors
        </button>

        <button
          onClick={handleCriticalError}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Trigger Critical Error
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h3 className="font-medium mb-2">Integration Notes:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Error toasts appear automatically and are non-blocking</li>
          <li>Users can click "View details" to see full error information</li>
          <li>Critical errors (P0/P1) create support tickets automatically</li>
          <li>Guest users are prompted for contact info when sending reports</li>
          <li>All errors are indexed with unique incident IDs</li>
          <li>Copy functionality works with one click</li>
        </ul>
      </div>
    </div>
  );
}
