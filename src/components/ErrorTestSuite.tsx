'use client';
import { useState } from 'react';
import { useError } from '@/src/contexts/ErrorContext';
import { useErrorHandler } from '@/src/hooks/useErrorHandler';

export default function ErrorTestSuite() {
  const { reportError } = useError();
  const { safeApiCall, safeFetch } = useErrorHandler();
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'running' | 'success' | 'error';
    result?: string;
  }>>([]);

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    setTestResults(prev => [...prev, { test: testName, status: 'running' }]);
    
    try {
      await testFn();
      setTestResults(prev => 
        prev.map(t => t.test === testName ? { ...t, status: 'success', result: 'Test completed successfully' } : t)
      );
    } catch (error) {
      setTestResults(prev => 
        prev.map(t => t.test === testName ? { ...t, status: 'error', result: String(error) } : t)
      );
    }
  };

  const tests = [
    {
      name: 'API Error - Work Orders',
      fn: async () => {
        await reportError('WO-API-SAVE-002', 'Test work order save failure', {
          category: 'API',
          severity: 'ERROR',
          module: 'Work Orders',
          autoTicket: true
        });
      }
    },
    {
      name: 'Validation Error - Finance',
      fn: async () => {
        await reportError('FIN-API-VAL-001', 'Test payment validation failure', {
          category: 'Validation',
          severity: 'ERROR',
          module: 'Finance',
          autoTicket: false
        });
      }
    },
    {
      name: 'UI Error - Properties',
      fn: async () => {
        await reportError('PROP-UI-LOAD-001', 'Test properties list load failure', {
          category: 'UI',
          severity: 'WARN',
          module: 'Properties',
          autoTicket: true
        });
      }
    },
    {
      name: 'Network Error - Marketplace',
      fn: async () => {
        await reportError('MKT-API-NET-001', 'Test marketplace network failure', {
          category: 'Network',
          severity: 'ERROR',
          module: 'Marketplace',
          autoTicket: true
        });
      }
    },
    {
      name: 'Critical System Error',
      fn: async () => {
        await reportError('SYS-API-DB-003', 'Test database connection failure', {
          category: 'Database',
          severity: 'CRITICAL',
          module: 'System',
          autoTicket: true
        });
      }
    },
    {
      name: 'Safe API Call Test',
      fn: async () => {
        const result = await safeApiCall(
          () => Promise.reject(new Error('Simulated API failure')),
          {
            module: 'Work Orders',
            operation: 'create',
            code: 'WO-API-CREATE-001'
          }
        );
        if (result !== null) {
          throw new Error('Expected null result from failed API call');
        }
      }
    },
    {
      name: 'Safe Fetch Test',
      fn: async () => {
        try {
          await safeFetch('/api/nonexistent-endpoint', {}, {
            module: 'System',
            operation: 'test'
          });
        } catch (error) {
          // Expected to throw
        }
      }
    },
    {
      name: 'Multiple Error Aggregation',
      fn: async () => {
        // Simulate multiple related errors
        await Promise.all([
          reportError('WO-API-VAL-001', 'Missing title field', {
            category: 'Validation',
            severity: 'ERROR',
            module: 'Work Orders',
            autoTicket: false
          }),
          reportError('WO-API-VAL-002', 'Invalid priority value', {
            category: 'Validation',
            severity: 'ERROR',
            module: 'Work Orders',
            autoTicket: false
          }),
          reportError('WO-API-VAL-003', 'Missing property reference', {
            category: 'Validation',
            severity: 'ERROR',
            module: 'Work Orders',
            autoTicket: false
          })
        ]);
      }
    }
  ];

  const runAllTests = async () => {
    setTestResults([]);
    for (const test of tests) {
      await runTest(test.name, test.fn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏸️';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Handling Test Suite</h1>
          <p className="text-gray-600">
            Test the error handling system to ensure all components work correctly.
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#005299] transition-colors"
          >
            Run All Tests
          </button>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Clear Results
          </button>
        </div>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {getStatusIcon(testResults.find(t => t.test === test.name)?.status || 'pending')}
                </span>
                <span className="font-medium text-gray-900">{test.name}</span>
              </div>
              <button
                onClick={() => runTest(test.name, test.fn)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                disabled={testResults.find(t => t.test === test.name)?.status === 'running'}
              >
                {testResults.find(t => t.test === test.name)?.status === 'running' ? 'Running...' : 'Run Test'}
              </button>
            </div>
          ))}
        </div>

        {testResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${getStatusColor(result.status)}`}>
                      {getStatusIcon(result.status)} {result.test}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">{result.status}</span>
                  </div>
                  {result.result && (
                    <p className="mt-1 text-sm text-gray-600">{result.result}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">Test Instructions</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Each test will generate error reports and may create support tickets</li>
            <li>• Check the error dashboard to see aggregated results</li>
            <li>• Verify that toasts appear for user-facing errors</li>
            <li>• Confirm that auto-tickets are created for configured errors</li>
            <li>• Test the copy and report functionality in error dialogs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}