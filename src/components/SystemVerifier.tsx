'use client';

import { useState, useEffect } from 'react';
import { getAutoFixManager, FixResult } from '@/src/lib/AutoFixManager';
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
      const autoFixManager = getAutoFixManager();
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
    const autoFixManager = getAutoFixManager();
    autoFixManager.startAutoMonitoring(1); // Check every minute
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    const autoFixManager = getAutoFixManager();
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
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
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Issues Found</h3>
                <div className="text-2xl font-bold text-red-600">{status.issues.length}</div>
              </div>
            </div>
          </div>

          {/* Fixes Applied */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Fixes Applied</h3>
                <div className="text-2xl font-bold text-green-600">{status.fixes.length}</div>
              </div>
            </div>
          </div>

          {/* Last Check */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
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
                <XCircle className="w-5 h-5 text-red-600" />
                Issues Detected
              </h3>
              <div className="space-y-2">
                {status.issues.map((issue, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-800">{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixes */}
          {status.fixes.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Fixes Applied
              </h3>
              <div className="space-y-2">
                {status.fixes.map((fix, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-green-800">{fix}</span>
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
          <Shield className="w-5 h-5 text-blue-600" />
          System Components
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Database className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium text-gray-900">Database</div>
              <div className="text-sm text-gray-600">MongoDB Connection</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Network className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium text-gray-900">Network</div>
              <div className="text-sm text-gray-600">API Connectivity</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Zap className="w-5 h-5 text-yellow-600" />
            <div>
              <div className="font-medium text-gray-900">Performance</div>
              <div className="text-sm text-gray-600">System Health</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Fix Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-purple-600" />
          Auto-Fix System
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <div className="font-medium text-blue-900">Error Boundary</div>
              <div className="text-sm text-blue-700">Automatic error detection and recovery</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-blue-700">Active</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <div className="font-medium text-green-900">Health Monitoring</div>
              <div className="text-sm text-green-700">Continuous system health checks</div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className={`text-sm ${isMonitoring ? 'text-green-700' : 'text-gray-600'}`}>
                {isMonitoring ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div>
              <div className="font-medium text-purple-900">Auto Recovery</div>
              <div className="text-sm text-purple-700">Automatic error fixing and recovery</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
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
            onClick={() => {
              const autoFixManager = getAutoFixManager();
              autoFixManager.emergencyRecovery();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            🚨 Emergency Recovery
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            🔄 Full Reset
          </button>

          <button
            onClick={() => window.open('/help', '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            📚 Get Help
          </button>
        </div>
      </div>
    </div>
  );
}
