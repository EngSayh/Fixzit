'use client';
import { useState } from 'react';
import ErrorTestSuite from '@/src/components/ErrorTestSuite';

export default function ErrorSystemTestPage() {
  const [activeTab, setActiveTab] = useState('test-suite');

  const tabs = [
    { id: 'test-suite', name: 'Test Suite', component: <ErrorTestSuite /> },
    { id: 'documentation', name: 'Documentation', component: <DocumentationTab /> },
    { id: 'dashboard', name: 'Error Dashboard', component: <DashboardTab /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Fixzit Error Handling System
          </h1>
          <p className="text-gray-600">
            Comprehensive error handling, reporting, and management system
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );
}

function DocumentationTab() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Handling Documentation</h2>
      
      <div className="prose max-w-none">
        <h3>System Overview</h3>
        <p>
          The Fixzit Error Handling System provides comprehensive error management across all modules
          with Apple/Microsoft-style user experience and detailed technical diagnostics.
        </p>

        <h3>Key Features</h3>
        <ul>
          <li><strong>Non-blocking UX:</strong> Errors never interrupt user workflows</li>
          <li><strong>One-click reporting:</strong> Users can report errors with a single click</li>
          <li><strong>Automatic categorization:</strong> Errors are automatically classified and routed</li>
          <li><strong>Real-time aggregation:</strong> Related errors are grouped into incidents</li>
          <li><strong>RFC 9457 compliance:</strong> Standardized API error responses</li>
          <li><strong>Comprehensive logging:</strong> Full context capture for debugging</li>
        </ul>

        <h3>Error Code Registry</h3>
        <p>
          All errors use a standardized code format: <code>{MODULE}-{LAYER}-{CATEGORY}-{NNN}</code>
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4>Example Codes:</h4>
          <ul className="font-mono text-sm">
            <li>WO-API-SAVE-001: Work order save failed</li>
            <li>FIN-API-PAY-002: Payment processing error</li>
            <li>PROP-UI-LOAD-003: Properties list failed to load</li>
            <li>SYS-UI-RENDER-004: Page rendering error</li>
          </ul>
        </div>

        <h3>User Experience</h3>
        <p>
          Error messages follow a clear structure: What happened, why it matters, what to do next.
          All messages are available in both English and Arabic with proper RTL support.
        </p>

        <h3>Technical Implementation</h3>
        <p>
          The system uses React Context for global error management, MongoDB for persistence,
          and follows RFC 9457 Problem Details for API responses.
        </p>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Quick Start</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Use the Test Suite to verify error handling works</li>
            <li>2. Check the Error Dashboard for aggregated error data</li>
            <li>3. Review the comprehensive documentation in /docs/ERROR_HANDLING_STANDARDS.md</li>
            <li>4. Integrate error handling in your components using useError() hook</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Dashboard</h2>
      
      <div className="mb-6">
        <a
          href="/admin/errors"
          className="inline-flex items-center px-4 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#005299] transition-colors"
        >
          Open Error Dashboard
          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Real-time Monitoring</h3>
          <p className="text-sm text-gray-600">
            Monitor error rates, severity distribution, and user impact across all modules.
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Error Aggregation</h3>
          <p className="text-sm text-gray-600">
            View grouped errors by code, module, and category with occurrence counts.
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Support Integration</h3>
          <p className="text-sm text-gray-600">
            Automatic ticket creation and direct links to support management.
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">Access Requirements</h4>
        <p className="text-sm text-yellow-700">
          The Error Dashboard requires admin or support role permissions. 
          Contact your system administrator if you cannot access the dashboard.
        </p>
      </div>
    </div>
  );
}