/**
 * System Status Bar Component
 * Displays real-time API latency, database health, and version at bottom of screen
 * Polls /api/health endpoint every 30 seconds for live status
 */
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Database, Info, AlertTriangle } from '@/components/ui/icons';

type DbStatus = 'connected' | 'degraded' | 'error' | 'checking';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected' | 'error' | 'timeout';
  timestamp: string;
}

export const SystemStatusBar: React.FC = () => {
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    const startTime = performance.now();
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
      });
      const latency = Math.round(performance.now() - startTime);
      setApiLatency(latency);
      
      if (!response.ok) {
        setDbStatus('error');
        return;
      }
      
      const data: HealthResponse = await response.json();
      setLastChecked(new Date());
      
      // Map health response to status
      if (data.database === 'connected') {
        setDbStatus('connected');
      } else if (data.database === 'timeout') {
        setDbStatus('degraded');
      } else {
        setDbStatus('error');
      }
    } catch {
      // Network error - can't reach API
      setDbStatus('error');
      setApiLatency(null);
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();
    
    // Poll every 30 seconds
    const interval = setInterval(checkHealth, 30_000);
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  const statusColors = {
    connected: 'text-green-500',
    degraded: 'text-yellow-500',
    error: 'text-red-500',
    checking: 'text-gray-400',
  };

  const statusLabels = {
    connected: 'Connected',
    degraded: 'Degraded',
    error: 'Disconnected',
    checking: 'Checking...',
  };

  const systemLabels = {
    connected: 'Operational',
    degraded: 'Degraded',
    error: 'Error',
    checking: 'Checking...',
  };

  return (
    <div className="fixed bottom-0 inset-x-0 h-7 bg-gray-900/95 dark:bg-gray-950/95 border-t border-gray-800 dark:border-gray-700 backdrop-blur-sm z-50">
      <div className="h-full px-4 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              dbStatus === 'connected' ? 'bg-green-500' : 
              dbStatus === 'degraded' ? 'bg-yellow-500' : 
              dbStatus === 'error' ? 'bg-red-500' : 
              'bg-gray-500'
            } ${dbStatus === 'checking' ? 'animate-pulse' : ''}`} />
            <span className="font-medium">System Status:</span>
            <span className={statusColors[dbStatus]}>{systemLabels[dbStatus]}</span>
            {dbStatus === 'error' && <AlertTriangle className="w-3 h-3 text-red-500" />}
          </div>
          
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3" />
            <span>API Latency:</span>
            <span className={`font-mono font-medium ${
              apiLatency === null ? 'text-gray-500' :
              apiLatency < 100 ? 'text-green-400' :
              apiLatency < 300 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {apiLatency === null ? '--' : `${apiLatency}ms`}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3" />
            <span>Database:</span>
            <span className={statusColors[dbStatus]}>{statusLabels[dbStatus]}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {lastChecked && (
            <span className="text-gray-500">
              Last check: {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3" />
            <span>Version:</span>
            <span className="font-mono font-medium text-gray-300">v2.1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
