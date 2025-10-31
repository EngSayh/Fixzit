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
      default: return 'text-muted-foreground bg-muted';
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
          <h2 className="text-2xl font-bold text-foreground">System Verification</h2>
          <p className="text-muted-foreground">Monitor and verify system health with auto-fix capabilities</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={startMonitoring}
            disabled={isMonitoring}
            className="px-4 py-2 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 disabled:opacity-50"
          >
            {isMonitoring ? 'Monitoring...' : 'Start Monitoring'}
          </button>
          <button
            onClick={stopMonitoring}
            disabled={!isMonitoring}
            className="px-4 py-2 bg-muted text-foreground rounded-2xl hover:bg-muted/80 disabled:opacity-50"
          >
            Stop Monitoring
          </button>
          <button
            onClick={runVerification}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
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
          <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(status.overall)}
              <div>
                <h3 className="font-semibold text-foreground">Overall Status</h3>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.overall)}`}>
                  {getStatusIcon(status.overall)}
                  {status.overall.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Issues Count */}
          <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-foreground">Issues Found</h3>
                <div className="text-2xl font-bold text-red-600">{status.issues.length}</div>
              </div>
            </div>
          </div>

          {/* Fixes Applied */}
          <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-foreground">Fixes Applied</h3>
                <div className="text-2xl font-bold text-green-600">{status.fixes.length}</div>
              </div>
            </div>
          </div>

          {/* Last Check */}
          <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-brand-500" />
              <div>
                <h3 className="font-semibold text-foreground">Last Check</h3>
                <div className="text-sm text-muted-foreground">
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
            <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Issues Detected
              </h3>
              <div className="space-y-2">
                {status.issues.map((issue, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-2xl">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300">{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixes */}
          {status.fixes.length > 0 && (
            <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Fixes Applied
              </h3>
              <div className="space-y-2">
                {status.fixes.map((fix, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-2xl">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-green-700 dark:text-green-300">{fix}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Components Status */}
      <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-500" />
          System Components
        </h3>

        {/* TODO: Make dynamic - currently shows static "healthy" indicators
            Should be updated to reflect actual component status from autoFixManager.verifySystemHealth() */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-2xl">
            <Database className="w-5 h-5 text-brand-500" />
            <div>
              <div className="font-medium text-foreground">Database</div>
              <div className="text-sm text-muted-foreground">MongoDB Connection</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-2xl">
            <Network className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium text-foreground">Network</div>
              <div className="text-sm text-muted-foreground">API Connectivity</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-2xl">
            <Zap className="w-5 h-5 text-amber-500" />
            <div>
              <div className="font-medium text-foreground">Performance</div>
              <div className="text-sm text-muted-foreground">System Health</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Fix Status */}
      <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-500" />
          Auto-Fix System
        </h3>

        {/* Note: Error Boundary and Auto Recovery statuses are partially static
            Only Health Monitoring status is dynamically updated based on isMonitoring state */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-brand-50 dark:bg-brand-950 rounded-2xl">
            <div>
              <div className="font-medium text-brand-900 dark:text-brand-100">Error Boundary</div>
              <div className="text-sm text-brand-700 dark:text-brand-300">Automatic error detection and recovery</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-brand-700 dark:text-brand-300">Active</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-2xl">
            <div>
              <div className="font-medium text-green-900 dark:text-green-100">Health Monitoring</div>
              <div className="text-sm text-green-700 dark:text-green-300">Continuous system health checks</div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-muted-foreground'}`}></div>
              <span className={`text-sm ${isMonitoring ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground'}`}>
                {isMonitoring ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-2xl">
            <div>
              <div className="font-medium text-purple-900 dark:text-purple-100">Auto Recovery</div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Automatic error fixing and recovery</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-purple-700 dark:text-purple-300">Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Emergency Actions</h3>

        <div className="flex gap-3">
          <button
            onClick={() => autoFixManager.emergencyRecovery()}
            className="px-4 py-2 bg-red-600 text-white rounded-2xl hover:bg-red-700"
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
            className="px-4 py-2 bg-orange-600 text-white rounded-2xl hover:bg-orange-700"
          >
            🔄 Full Reset
          </button>

          <button
            onClick={() => window.open('/help', '_blank')}
            className="px-4 py-2 bg-brand-500 text-white rounded-2xl hover:bg-brand-600"
          >
            📚 Get Help
          </button>
        </div>
      </div>
    </div>
  );
}
