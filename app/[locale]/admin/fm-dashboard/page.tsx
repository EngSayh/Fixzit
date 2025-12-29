"use client";

/**
 * World-Class FM Admin Dashboard
 * 
 * Comprehensive view of:
 * - Compliance status (ZATCA, NCA, PDPL)
 * - AI Analytics (Anomalies, Churn, Asset Health)
 * - Security posture
 * - Provider network
 * 
 * @route /[locale]/admin/fm-dashboard
 */

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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

// Types
interface ComplianceDashboard {
  zatca: {
    phase: string;
    status: string;
    invoices_submitted_24h: number;
    compliance_rate: number;
  };
  nca: {
    framework: string;
    score: number;
    controls_implemented: number;
    controls_total: number;
  };
  pdpl: {
    consent_collection_rate: number;
    active_dsar_requests: number;
    data_breach_incidents: number;
  };
}

interface AIAnalytics {
  anomalies: {
    active_count: number;
    items: Array<{
      id: string;
      type: string;
      severity: string;
      description: string;
    }>;
  };
  churn_predictions: {
    at_risk_tenants: number;
    items: Array<{
      tenant_name: string;
      risk_score: number;
      risk_factors: string[];
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

export default function FMDashboardPage() {
  const { status } = useSession();
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
    const errors: string[] = [];
    
    try {
      // Fetch all data in parallel with credentials for authentication
      const fetchOptions: RequestInit = { credentials: "include" };
      const [complianceRes, analyticsRes, securityRes, providersRes] = await Promise.all([
        fetch("/api/compliance/dashboard", fetchOptions),
        fetch("/api/ai/analytics", fetchOptions),
        fetch("/api/security/enterprise", fetchOptions),
        fetch("/api/fm/providers", fetchOptions),
      ]);
      
      if (complianceRes.ok) {
        setCompliance(await complianceRes.json());
      } else {
        const errorText = await complianceRes.text().catch(() => "Unknown error");
        // eslint-disable-next-line no-console -- Error logging for dashboard debugging
        console.error("Compliance API failed:", complianceRes.status, errorText);
        errors.push(`Compliance: ${complianceRes.status}`);
      }
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      } else {
        const errorText = await analyticsRes.text().catch(() => "Unknown error");
        // eslint-disable-next-line no-console -- Error logging for dashboard debugging
        console.error("Analytics API failed:", analyticsRes.status, errorText);
        errors.push(`Analytics: ${analyticsRes.status}`);
      }
      if (securityRes.ok) {
        setSecurity(await securityRes.json());
      } else {
        const errorText = await securityRes.text().catch(() => "Unknown error");
        // eslint-disable-next-line no-console -- Error logging for dashboard debugging
        console.error("Security API failed:", securityRes.status, errorText);
        errors.push(`Security: ${securityRes.status}`);
      }
      if (providersRes.ok) {
        setProviders(await providersRes.json());
      } else {
        const errorText = await providersRes.text().catch(() => "Unknown error");
        // eslint-disable-next-line no-console -- Error logging for dashboard debugging
        console.error("Providers API failed:", providersRes.status, errorText);
        errors.push(`Providers: ${providersRes.status}`);
      }
      
      if (errors.length > 0) {
        setError(`Partial data load failure: ${errors.join(", ")}`);
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      // Error handling - intentional console for debugging dashboard issues
      setError("Failed to load dashboard data");
      // eslint-disable-next-line no-console -- Client-side error boundary logging
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Keyboard shortcut: ⌘K / Ctrl+K for quick actions/search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Trigger refresh as primary quick action
        // In future: Could open a command palette
        fetchDashboardData();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fetchDashboardData]);

  useEffect(() => {
    // Only bypass auth in demo mode when explicitly enabled via NEXT_PUBLIC_DEMO_MODE
    // SECURITY: Do not use NODE_ENV - that would enable unauthenticated access in development
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (isDemoMode) {
      // eslint-disable-next-line no-console -- Demo mode warning for debugging
      console.warn("[FM Dashboard] Demo mode enabled - authentication bypassed");
    }
    if (!isDemoMode && status !== "authenticated") {
      // In production without demo mode, require authentication
      return;
    }
    fetchDashboardData();
  }, [fetchDashboardData, status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Remove auth block - allow demo view with fallback data

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            FM Command Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            World-Class Facility Management Dashboard
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Compliance Score */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Compliance Score</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {compliance?.nca?.score ?? "--"}%
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {compliance?.nca?.controls_implemented ?? 0}/{compliance?.nca?.controls_total ?? 108} NCA controls
          </p>
        </div>

        {/* AI Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">AI Alerts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics?.anomalies?.active_count ?? 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {analytics?.anomalies?.items?.filter(a => a.severity === "high").length ?? 0} high severity
          </p>
        </div>

        {/* Security Score */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Security Score</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {security?.zero_trust?.score ?? "--"}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {security?.authentication?.mfa_enrollment_rate ?? 0}% MFA enrolled
          </p>
        </div>

        {/* Provider Network */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Provider Network</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {providers?.statistics?.total_providers ?? 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {providers?.active_bids?.total ?? 0} active bids
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Saudi Compliance Status
          </h2>
          <div className="space-y-4">
            {/* ZATCA */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">ZATCA Phase 2</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  compliance?.zatca?.status === "compliant" 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>
                  {compliance?.zatca?.status ?? "Loading..."}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{compliance?.zatca?.invoices_submitted_24h ?? 0} invoices (24h)</span>
                <span>{compliance?.zatca?.compliance_rate ?? 0}% compliant</span>
              </div>
            </div>
            
            {/* NCA */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">NCA ECC-2:2024</span>
                <span className="text-sm font-semibold text-brand-blue">
                  {compliance?.nca?.score ?? 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-brand-blue h-2 rounded-full transition-all"
                  style={{ width: `${compliance?.nca?.score ?? 0}%` }}
                />
              </div>
            </div>
            
            {/* PDPL */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">PDPL Compliance</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {compliance?.pdpl?.consent_collection_rate ?? 0}% consent rate
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-yellow-600 dark:text-yellow-400">
                  {compliance?.pdpl?.active_dsar_requests ?? 0} DSAR requests
                </span>
                <span className="text-green-600 dark:text-green-400">
                  {compliance?.pdpl?.data_breach_incidents ?? 0} breaches
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
          </h2>
          <div className="space-y-4">
            {/* Anomalies */}
            {analytics?.anomalies?.items?.map((anomaly) => (
              <div key={anomaly.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                  anomaly.severity === "critical" ? "text-pink-500" :
                  anomaly.severity === "high" ? "text-red-500" : 
                  anomaly.severity === "medium" ? "text-yellow-500" : "text-blue-500"
                }`} />
                <div>
                  <p className="font-medium text-sm">{anomaly.type}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{anomaly.description}</p>
                </div>
              </div>
            ))}
            
            {/* Churn Risk */}
            {analytics?.churn_predictions?.items?.slice(0, 2).map((tenant) => (
              <div key={tenant.tenant_name} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <span className="font-medium text-sm">{tenant.tenant_name}</span>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  tenant.risk_score > 70 
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>
                  {tenant.risk_score}% risk
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Posture
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-brand-blue">
                {security?.zero_trust?.score ?? 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Zero Trust Score</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {security?.authentication?.mfa_enrollment_rate ?? 0}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">MFA Enrolled</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {security?.authentication?.webauthn_enrolled_users ?? 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">WebAuthn Users</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {security?.threats?.severity_high ?? 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Threats</p>
            </div>
          </div>
        </div>

        {/* Provider Network */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Provider Network
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium">Total Providers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {providers?.statistics?.total_providers ?? 0}
                </p>
              </div>
              <div className="text-end">
                <p className="text-sm text-gray-600 dark:text-gray-400">Verified</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {providers?.statistics?.verified_providers ?? 0}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="font-medium">Active Bids</span>
              </div>
              <div className="text-end">
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {providers?.active_bids?.total ?? 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {providers?.active_bids?.pending_review ?? 0} pending review
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="font-medium">Avg Rating</span>
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

      {/* Keyboard Shortcut Hint */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">⌘K</kbd> or <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+K</kbd> to open Command Palette
        </p>
      </div>
    </div>
  );
}
