'use client';

import { useState, useEffect } from 'react';
import { autoFixManager } from '@/lib/AutoFixManager';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Activity, Database, Network, Shield, Zap } from 'lucide-react';

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  fixes: string[];
  lastCheck: string;
}

export default function SystemVerifier() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const runVerification = async () => {
    setIsLoading(true);
    try {
      const result = await autoFixManager.verifySystemHealth();
      setStatus({
        ...result,
        lastCheck: new Date().toISOString()
      });
    } catch (error) {
      console.error('Verification failed:', error);
      setStatus({
        overall: 'critical',
        issues: ['Verification process failed'],
        fixes: [],
        lastCheck: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    autoFixManager.startAutoMonitoring(1); // Check every minute
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    autoFixManager.stopAutoMonitoring();
  };

  const getStatusColor = (overall: string) => {
    switch (overall) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (overall: string) => {
    switch (overall) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <XCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  useEffect(() => {
    runVerification();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Verification</h2>
          <p className="text-gray-600">Monitor and verify system health with auto-fix capabilities</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={startMonitoring}
            disabled={isMonitoring}
            className="px-4 py-2 bg-[var(--fixzit-primary)] text-white rounded-lg hover:bg-[var(--fixzit-primary-dark)] disabled:opacity-50"
          >
            {isMonitoring ? 'Monitoring...' : 'Start Monitoring'}
          </button>
          <button
            onClick={stopMonitoring}
            disabled={!isMonitoring}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Stop Monitoring
          </button>
          <button
            onClick={runVerification}
            disabled={isLoading}
            className="px-4 py-2 bg-[var(--fixzit-success)] text-white rounded-lg hover:bg-[var(--fixzit-success-dark)] disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Checking...' : 'Verify Now'}
          </button>
        </div>
      </div>

      {/* System Status */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(status.overall)}
              <div>
                <h3 className="font-semibold text-gray-900">Overall Status</h3>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.overall)}`}>
                  {getStatusIcon(status.overall)}
                  {status.overall.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Issues Count */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-[var(--fixzit-danger)]" />
              <div>
                <h3 className="font-semibold text-gray-900">Issues Found</h3>
                <div className="text-2xl font-bold text-[var(--fixzit-danger)]">{status.issues.length}</div>
              </div>
            </div>
          </div>

          {/* Fixes Applied */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-[var(--fixzit-success)]" />
              <div>
                <h3 className="font-semibold text-gray-900">Fixes Applied</h3>
                <div className="text-2xl font-bold text-[var(--fixzit-success)]">{status.fixes.length}</div>
              </div>
            </div>
          </div>

          {/* Last Check */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-[var(--fixzit-primary)]" />
              <div>
                <h3 className="font-semibold text-gray-900">Last Check</h3>
                <div className="text-sm text-gray-600">
                  {new Date(status.lastCheck).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issues & Fixes */}
      {status && (status.issues.length > 0 || status.fixes.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issues */}
          {status.issues.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-[var(--fixzit-danger)]" />
                Issues Detected
              </h3>
              <div className="space-y-2">
                {status.issues.map((issue, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-[var(--fixzit-danger-lightest)] rounded-lg">
                    <XCircle className="w-4 h-4 text-[var(--fixzit-danger)] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[var(--fixzit-danger-darker)]">{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixes */}
          {status.fixes.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[var(--fixzit-success)]" />
                Fixes Applied
              </h3>
              <div className="space-y-2">
                {status.fixes.map((fix, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-[var(--fixzit-success-lightest)] rounded-lg">
                    <CheckCircle className="w-4 h-4 text-[var(--fixzit-success)] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[var(--fixzit-success-darker)]">{fix}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Components Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--fixzit-primary)]" />
          System Components
        </h3>

        {/* TODO: Make dynamic - currently shows static "healthy" indicators
            Should be updated to reflect actual component status from autoFixManager.verifySystemHealth() */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Database className="w-5 h-5 text-[var(--fixzit-primary)]" />
            <div>
              <div className="font-medium text-gray-900">Database</div>
              <div className="text-sm text-gray-600">MongoDB Connection</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-[var(--fixzit-success-light)] rounded-full"></div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Network className="w-5 h-5 text-[var(--fixzit-success)]" />
            <div>
              <div className="font-medium text-gray-900">Network</div>
              <div className="text-sm text-gray-600">API Connectivity</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-[var(--fixzit-success-light)] rounded-full"></div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Zap className="w-5 h-5 text-[var(--fixzit-accent)]" />
            <div>
              <div className="font-medium text-gray-900">Performance</div>
              <div className="text-sm text-gray-600">System Health</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-[var(--fixzit-success-light)] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Fix Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[var(--fixzit-secondary)]" />
          Auto-Fix System
        </h3>

        {/* Note: Error Boundary and Auto Recovery statuses are partially static
            Only Health Monitoring status is dynamically updated based on isMonitoring state */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[var(--fixzit-primary-lightest)] rounded-lg">
            <div>
              <div className="font-medium text-[var(--fixzit-primary-darkest)]">Error Boundary</div>
              <div className="text-sm text-[var(--fixzit-primary-dark)]">Automatic error detection and recovery</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[var(--fixzit-success-light)] rounded-full"></div>
              <span className="text-sm text-[var(--fixzit-primary-dark)]">Active</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--fixzit-success-lightest)] rounded-lg">
            <div>
              <div className="font-medium text-green-900">Health Monitoring</div>
              <div className="text-sm text-[var(--fixzit-success-dark)]">Continuous system health checks</div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className={`text-sm ${isMonitoring ? 'text-green-700' : 'text-gray-600'}`}>
                {isMonitoring ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--fixzit-secondary-lightest)] rounded-lg">
            <div>
              <div className="font-medium text-purple-900">Auto Recovery</div>
              <div className="text-sm text-purple-700">Automatic error fixing and recovery</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[var(--fixzit-success-light)] rounded-full"></div>
              <span className="text-sm text-purple-700">Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Actions</h3>

        <div className="flex gap-3">
          <button
            onClick={() => autoFixManager.emergencyRecovery()}
            className="px-4 py-2 bg-[var(--fixzit-danger)] text-white rounded-lg hover:bg-[var(--fixzit-danger-dark)]"
          >
            🚨 Emergency Recovery
          </button>

          <button
            onClick={() => {
              if (window.confirm('⚠️ WARNING: This will clear ALL local data and reload the page.\n\nAre you sure you want to perform a full reset? This action cannot be undone.')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            🔄 Full Reset
          </button>

          <button
            onClick={() => window.open('/help', '_blank')}
            className="px-4 py-2 bg-[var(--fixzit-primary)] text-white rounded-lg hover:bg-[var(--fixzit-primary-dark)]"
          >
            📚 Get Help
          </button>
        </div>
      </div>
    </div>
  );
}
