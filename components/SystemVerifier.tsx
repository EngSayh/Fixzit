'use client';

import { useState, useEffect } from 'react';
import { autoFixManager } from '@/lib/AutoFixManager';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Activity, Database, Network, Shield, Zap } from 'lucide-react';
import ClientDate from '@/components/ClientDate';

// ✅ FIXED: Use standard components
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';

// ✅ FIXED: Add i18n support
import { useTranslation } from '@/contexts/TranslationContext';
import { logger } from '@/lib/logger';

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  fixes: string[];
  lastCheck: string;
}

/**
 * ✅ REFACTORED SystemVerifier Component
 * 
 * ARCHITECTURE IMPROVEMENTS:
 * 1. ✅ Standard Button/Card components (no hardcoded UI)
 * 2. ✅ Full i18n support (30+ strings now translatable)
 * 3. ✅ Semantic tokens (text-success, text-destructive, text-warning)
 * 4. ✅ Consistent rounded-2xl (16px border radius)
 * 5. ✅ ComponentStatus and SystemSetting helper components
 * 6. ✅ TODO markers for dynamic API integration
 */
export default function SystemVerifier() {
  const { t } = useTranslation();
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
      logger.error('Verification failed:', { error });
      setStatus({
        overall: 'critical',
        issues: [t('system.verification.failed', 'Verification process failed')],
        fixes: [],
        lastCheck: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    autoFixManager.startAutoMonitoring(1);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    autoFixManager.stopAutoMonitoring();
  };

  // ✅ FIXED: Semantic token colors
  const getStatusColor = (overall: string) => {
    switch (overall) {
      case 'healthy': return 'text-success bg-success/10';
      case 'degraded': return 'text-warning bg-warning/10';
      case 'critical': return 'text-destructive bg-destructive/10';
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
          <h2 className="text-2xl font-bold text-foreground">
            {t('system.verification.title', 'System Verification')}
          </h2>
          <p className="text-muted-foreground">
            {t('system.verification.description', 'Monitor and verify system health with auto-fix capabilities')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={startMonitoring}
            disabled={isMonitoring}
            variant="default"
          >
            {isMonitoring 
              ? t('system.monitoring.active', 'Monitoring...') 
              : t('system.monitoring.start', 'Start Monitoring')}
          </Button>
          <Button
            onClick={stopMonitoring}
            disabled={!isMonitoring}
            variant="secondary"
          >
            {t('system.monitoring.stop', 'Stop Monitoring')}
          </Button>
          <Button
            onClick={runVerification}
            disabled={isLoading}
            variant="success"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading 
              ? t('system.verification.checking', 'Checking...') 
              : t('system.verification.verify', 'Verify Now')}
          </Button>
        </div>
      </div>

      {/* System Status */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {getStatusIcon(status.overall)}
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('system.status.overall', 'Overall Status')}
                  </h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.overall)}`}>
                    {getStatusIcon(status.overall)}
                    {status.overall.toUpperCase()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues Count */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-destructive" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('system.issues.found', 'Issues Found')}
                  </h3>
                  <div className="text-2xl font-bold text-destructive">{status.issues.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fixes Applied */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-success" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('system.fixes.applied', 'Fixes Applied')}
                  </h3>
                  <div className="text-2xl font-bold text-success">{status.fixes.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last Check */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('system.lastCheck', 'Last Check')}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    <ClientDate date={status.lastCheck} format="time-only" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues & Fixes */}
      {status && (status.issues.length > 0 || status.fixes.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issues */}
          {status.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  {t('system.issues.detected', 'Issues Detected')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {status.issues.map((issue, index) => (
                    <ComponentStatus 
                      key={index}
                      icon={<XCircle className="w-4 h-4" />}
                      text={issue}
                      variant="destructive"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fixes */}
          {status.fixes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  {t('system.fixes.applied', 'Fixes Applied')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {status.fixes.map((fix, index) => (
                    <ComponentStatus 
                      key={index}
                      icon={<CheckCircle className="w-4 h-4" />}
                      text={fix}
                      variant="success"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* System Components Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {t('system.components.title', 'System Components')}
          </CardTitle>
          <CardDescription>
            {t('system.components.description', 'Real-time status of system components')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO: Make dynamic - fetch from autoFixManager.getComponentStatus() */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SystemSetting
              icon={<Database className="w-5 h-5 text-primary" />}
              title={t('system.component.database', 'Database')}
              description={t('system.component.database.desc', 'MongoDB Connection')}
              status="healthy"
            />
            <SystemSetting
              icon={<Network className="w-5 h-5 text-success" />}
              title={t('system.component.network', 'Network')}
              description={t('system.component.network.desc', 'API Connectivity')}
              status="healthy"
            />
            <SystemSetting
              icon={<Zap className="w-5 h-5 text-warning" />}
              title={t('system.component.performance', 'Performance')}
              description={t('system.component.performance.desc', 'System Health')}
              status="healthy"
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto-Fix Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            {t('system.autofix.title', 'Auto-Fix System')}
          </CardTitle>
          <CardDescription>
            {t('system.autofix.description', 'Automated error detection and recovery systems')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <SystemSetting
              icon={<Shield className="w-5 h-5" />}
              title={t('system.autofix.errorBoundary', 'Error Boundary')}
              description={t('system.autofix.errorBoundary.desc', 'Automatic error detection and recovery')}
              status="healthy"
              variant="brand"
            />
            <SystemSetting
              icon={<Activity className="w-5 h-5" />}
              title={t('system.autofix.healthMonitoring', 'Health Monitoring')}
              description={t('system.autofix.healthMonitoring.desc', 'Continuous system health checks')}
              status={isMonitoring ? 'healthy' : 'inactive'}
              statusText={isMonitoring 
                ? t('system.status.running', 'Running') 
                : t('system.status.stopped', 'Stopped')}
              variant="success"
            />
            <SystemSetting
              icon={<RefreshCw className="w-5 h-5" />}
              title={t('system.autofix.autoRecovery', 'Auto Recovery')}
              description={t('system.autofix.autoRecovery.desc', 'Automatic error fixing and recovery')}
              status="healthy"
              variant="purple"
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('system.emergency.title', 'Emergency Actions')}</CardTitle>
          <CardDescription>
            {t('system.emergency.description', 'Critical system recovery and reset options')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              onClick={() => autoFixManager.emergencyRecovery()}
              variant="destructive"
            >
              🚨 {t('system.emergency.recovery', 'Emergency Recovery')}
            </Button>

            <Button
              onClick={() => {
                if (window.confirm(t('system.reset.confirm', '⚠️ WARNING: This will clear ALL local data and reload the page.\n\nAre you sure you want to perform a full reset? This action cannot be undone.'))) {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }
              }}
              variant="destructive"
              className="bg-warning hover:bg-warning/90"
            >
              🔄 {t('system.reset.full', 'Full Reset')}
            </Button>

            <Button
              onClick={() => window.open('/help', '_blank')}
              variant="default"
            >
              📚 {t('system.help', 'Get Help')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * ✅ EXTRACTED: ComponentStatus Helper
 * Displays a status message with icon and semantic color
 */
interface ComponentStatusProps {
  icon: React.ReactNode;
  text: string;
  variant: 'success' | 'destructive' | 'warning';
}

function ComponentStatus({ icon, text, variant }: ComponentStatusProps) {
  const variantClasses = {
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning'
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-2xl ${variantClasses[variant]}`}>
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <span className="text-sm">{text}</span>
    </div>
  );
}

/**
 * ✅ EXTRACTED: SystemSetting Helper
 * Displays a system component setting with icon, title, description, and status
 */
interface SystemSettingProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'healthy' | 'inactive';
  statusText?: string;
  variant?: 'brand' | 'success' | 'purple';
}

function SystemSetting({ icon, title, description, status, statusText, variant = 'success' }: SystemSettingProps) {
  const variantClasses = {
    brand: 'bg-primary/10',
    success: 'bg-success/10',
    purple: 'bg-secondary/10'
  };

  const statusColor = status === 'healthy' ? 'bg-success' : 'bg-muted-foreground';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl ${variantClasses[variant]}`}>
      {icon}
      <div className="flex-1">
        <div className="font-medium text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
        {statusText && (
          <span className="text-sm text-muted-foreground">{statusText}</span>
        )}
      </div>
    </div>
  );
}
