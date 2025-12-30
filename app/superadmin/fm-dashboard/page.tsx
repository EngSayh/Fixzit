"use client";

/**
 * Superadmin FM Dashboard
 * 
 * World-Class FM Command Center integrated into Superadmin panel:
 * - Compliance status (ZATCA, NCA, PDPL)
 * - AI Analytics (Anomalies, Churn, Asset Health)
 * - Security posture
 * - Provider network
 * 
 * @route /superadmin/fm-dashboard
 */

import React, { useEffect, useState, useCallback } from "react";
import { 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
  Brain, 
  Users, 
  TrendingUp, 
  Activity,
  FileText,
  Zap,
  RefreshCw
} from "lucide-react";

// Types matching actual API response shapes
interface ComplianceDashboard {
  zatca: {
    phase: number;
    status: string;
    invoice_count_30d: number;
    clearance_rate: number;
  };
  nca: {
    overall_score: number;
    risk_level: string;
    domains: Array<{
      name: string;
      score: number;
    }>;
  };
  pdpl: {
    consent_rate: number;
    dsar_requests: number;
    breach_incidents: number;
  };
}

interface AIAnalytics {
  anomalies: {
    active_count: number;
    items: Array<{
      id: string;
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
    }>;
  };
  churn: {
    at_risk_tenants: number;
    predictions: Array<{
      tenant_id?: string;
      tenant_name: string;
      probability: number;
      primary_factor: string;
    }>;
  };
  asset_health: {
    critical: number;
    items: Array<{
      asset_name: string;
      health_score: number;
      predicted_failure: string | null;
    }>;
  };
}

interface SecurityDashboard {
  zero_trust: {
    score: number;
    mode: string;
  };
  authentication: {
    mfa_enrollment_rate: number;
    webauthn_enrolled_users: number;
  };
  threats: {
    severity_high: number;
    severity_medium: number;
  };
}

interface ProviderNetwork {
  statistics: {
    total_providers: number;
    verified_providers: number;
    avg_rating: number;
  };
  active_bids: {
    total: number;
    pending_review: number;
  };
}

export default function SuperadminFMDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Dashboard data
  const [compliance, setCompliance] = useState<ComplianceDashboard | null>(null);
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [security, setSecurity] = useState<SecurityDashboard | null>(null);
  const [providers, setProviders] = useState<ProviderNetwork | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [complianceRes, analyticsRes, securityRes, providersRes] = await Promise.all([
        fetch("/api/compliance/dashboard", { credentials: "include" }),
        fetch("/api/ai/analytics", { credentials: "include" }),
        fetch("/api/security/enterprise", { credentials: "include" }),
        fetch("/api/fm/providers", { credentials: "include" }),
      ]);
      
      const failures: string[] = [];
      
      if (complianceRes.ok) {
        setCompliance(await complianceRes.json());
      } else {
        failures.push(`compliance (${complianceRes.status})`);
      }
      
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      } else {
        failures.push(`analytics (${analyticsRes.status})`);
      }
      
      if (securityRes.ok) {
        setSecurity(await securityRes.json());
      } else {
        failures.push(`security (${securityRes.status})`);
      }
      
      if (providersRes.ok) {
        setProviders(await providersRes.json());
      } else {
        failures.push(`providers (${providersRes.status})`);
      }
      
      if (failures.length > 0) {
        setError(`Failed to load: ${failures.join(", ")}`);
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      setError("Failed to load dashboard data");
      // eslint-disable-next-line no-console -- Client-side error logging
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading FM Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            FM Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            World-Class Facility Management Dashboard
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Score */}
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {compliance?.nca?.overall_score ?? "--"}%
              </p>
            </div>
            <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {compliance?.nca?.domains?.length ?? 0} NCA domains tracked
          </p>
        </div>

        {/* AI Alerts */}
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">AI Alerts</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {analytics?.anomalies?.active_count ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Brain className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {analytics?.anomalies?.items?.filter(i => i.severity === "high" || i.severity === "critical").length ?? 0} high severity
          </p>
        </div>

        {/* Security Score */}
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Security Score</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {security?.zero_trust?.score ?? "--"}
              </p>
            </div>
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {security?.authentication?.mfa_enrollment_rate ?? 0}% MFA enrolled
          </p>
        </div>

        {/* Provider Network */}
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Provider Network</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {providers?.statistics?.total_providers ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {providers?.active_bids?.total ?? 0} active bids
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Saudi Compliance Status
          </h2>
          <div className="space-y-3">
            {/* ZATCA */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">ZATCA Phase 2</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  compliance?.zatca?.status === "compliant" 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>
                  {compliance?.zatca?.status ?? "Loading..."}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span>{compliance?.zatca?.invoice_count_30d ?? 0} invoices (30d)</span>
                <span>{((compliance?.zatca?.clearance_rate ?? 0) * 100).toFixed(0)}% clearance</span>
              </div>
            </div>
            
            {/* NCA */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">NCA ECC-2:2024</span>
                <span className="text-sm font-semibold text-blue-600">
                  {compliance?.nca?.overall_score ?? 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${compliance?.nca?.overall_score ?? 0}%` }}
                />
              </div>
            </div>
            
            {/* PDPL */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">PDPL Compliance</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {compliance?.pdpl?.consent_rate ?? 0}% consent rate
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-yellow-600 dark:text-yellow-400">
                  {compliance?.pdpl?.dsar_requests ?? 0} DSAR requests
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {compliance?.pdpl?.breach_incidents ?? 0} breaches
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
          </h2>
          <div className="space-y-3">
            {/* Anomalies */}
            {analytics?.anomalies?.items?.map((anomaly) => (
              <div key={anomaly.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                  anomaly.severity === "critical" ? "text-pink-600" :
                  anomaly.severity === "high" ? "text-red-500" : 
                  anomaly.severity === "medium" ? "text-yellow-500" : "text-blue-500"
                }`} />
                <div>
                  <p className="font-medium text-sm">{anomaly.type}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{anomaly.description}</p>
                </div>
              </div>
            ))}
            
            {/* Churn Risk - use churn.predictions to match API */}
            {analytics?.churn?.predictions?.slice(0, 2).map((tenant, index) => (
              <div key={tenant.tenant_id ?? `${tenant.tenant_name}-${index}`} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm">{tenant.tenant_name}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  tenant.probability > 0.7 
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>
                  {Math.round(tenant.probability * 100)}% risk
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Posture
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">
                {security?.zero_trust?.score ?? 0}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Zero Trust Score</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {security?.authentication?.mfa_enrollment_rate ?? 0}%
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">MFA Enrolled</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {security?.authentication?.webauthn_enrolled_users ?? 0}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">WebAuthn Users</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {security?.threats?.severity_high ?? 0}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">High Threats</p>
            </div>
          </div>
        </div>

        {/* Provider Network */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Provider Network
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Total Providers</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {providers?.statistics?.total_providers ?? 0}
                </p>
              </div>
              <div className="text-end">
                <p className="text-xs text-gray-600 dark:text-gray-400">Verified</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {providers?.statistics?.verified_providers ?? 0}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-sm">Active Bids</span>
              </div>
              <div className="text-end">
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {providers?.active_bids?.total ?? 0}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {providers?.active_bids?.pending_review ?? 0} pending review
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="font-medium text-sm">Avg Rating</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {providers?.statistics?.avg_rating ?? 0}
                </span>
                <span className="text-yellow-500">★</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
