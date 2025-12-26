/**
 * System Status Bar Component
 * Displays API latency, system health, and version at bottom of screen
 */
"use client";

import React, { useState, useEffect } from 'react';
import { Activity, Database, Info } from '@/components/ui/icons';

export const SystemStatusBar: React.FC = () => {
  const [apiLatency, setApiLatency] = useState(24);
  const [dbStatus, _setDbStatus] = useState<'connected' | 'degraded' | 'error'>('connected');

  useEffect(() => {
    // Simulate latency monitoring
    const interval = setInterval(() => {
      setApiLatency(Math.floor(Math.random() * 50) + 10);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    connected: 'text-green-500',
    degraded: 'text-yellow-500',
    error: 'text-red-500',
  };

  return (
    <div className="fixed bottom-0 inset-x-0 h-7 bg-gray-900/95 dark:bg-gray-950/95 border-t border-gray-800 dark:border-gray-700 backdrop-blur-sm z-50">
      <div className="h-full px-4 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
            <span className="font-medium">System Status:</span>
            <span className={statusColors[dbStatus]}>Operational</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3" />
            <span>API Latency:</span>
            <span className="font-mono font-medium text-blue-400">{apiLatency}ms</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3" />
            <span>Database:</span>
            <span className={statusColors[dbStatus]}>Connected</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Info className="w-3 h-3" />
          <span>Version:</span>
          <span className="font-mono font-medium text-gray-300">v2.1.0</span>
        </div>
      </div>
    </div>
  );
};
