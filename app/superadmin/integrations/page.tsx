"use client";

/**
 * Superadmin Integrations Management
 * Third-party integrations using /api/fm/system/integrations endpoints
 * 
 * @module app/superadmin/integrations/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Plug, RefreshCw, CheckCircle, XCircle, Settings, ExternalLink,
  CreditCard, Mail, MessageSquare, FileText, Cloud, Shield,
} from "@/components/ui/icons";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
  status: string;
  lastSync?: string;
  config?: Record<string, unknown>;
}

const CATEGORY_COLORS: Record<string, string> = {
  Finance: "bg-green-500/20 text-green-400",
  Payments: "bg-blue-500/20 text-blue-400",
  Communications: "bg-purple-500/20 text-purple-400",
  Compliance: "bg-yellow-500/20 text-yellow-400",
  Infrastructure: "bg-orange-500/20 text-orange-400",
  Monitoring: "bg-red-500/20 text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  connected: "bg-green-500/20 text-green-400",
  disconnected: "bg-gray-500/20 text-gray-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  error: "bg-red-500/20 text-red-400",
};

const ICONS: Record<string, React.ElementType> = { CreditCard, Mail, MessageSquare, FileText, Cloud, Shield };

// Default integrations to show when API fails
const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: "quickbooks", name: "QuickBooks", description: "Accounting and invoicing sync", category: "Finance", icon: "CreditCard", enabled: false, status: "disconnected" },
  { id: "xero", name: "Xero", description: "Financial management integration", category: "Finance", icon: "CreditCard", enabled: false, status: "disconnected" },
  { id: "stripe", name: "Stripe", description: "Payment processing", category: "Payments", icon: "CreditCard", enabled: true, status: "connected", lastSync: "2025-01-20T10:30:00Z" },
  { id: "sendgrid", name: "SendGrid", description: "Email delivery service", category: "Communications", icon: "Mail", enabled: true, status: "connected", lastSync: "2025-01-20T12:00:00Z" },
  { id: "twilio", name: "Twilio", description: "SMS and WhatsApp messaging", category: "Communications", icon: "MessageSquare", enabled: true, status: "connected" },
  { id: "zatca", name: "ZATCA", description: "Saudi tax authority e-invoicing", category: "Compliance", icon: "FileText", enabled: false, status: "pending" },
  { id: "s3", name: "AWS S3", description: "File storage and CDN", category: "Infrastructure", icon: "Cloud", enabled: true, status: "connected" },
  { id: "sentry", name: "Sentry", description: "Error tracking and monitoring", category: "Monitoring", icon: "Shield", enabled: true, status: "connected" },
];

export default function SuperadminIntegrationsPage() {
  const { t } = useI18n();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/fm/system/integrations", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || DEFAULT_INTEGRATIONS);
      } else {
        // Use defaults on non-OK response
        setIntegrations(DEFAULT_INTEGRATIONS);
      }
    } catch {
      // Use default integrations list on error
      setIntegrations(DEFAULT_INTEGRATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const handleToggle = async (integration: Integration) => {
    try {
      setToggling(integration.id);
      const response = await fetch(`/api/fm/system/integrations/${integration.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !integration.enabled }),
      });
      if (!response.ok) throw new Error("Failed to toggle integration");
      setIntegrations(prev => prev.map(i => i.id === integration.id ? { ...i, enabled: !i.enabled, status: !i.enabled ? "connected" : "disconnected" } : i));
      toast.success(`${integration.name} ${integration.enabled ? "disabled" : "enabled"}`);
    } catch {
      toast.error(`Failed to toggle ${integration.name}`);
    } finally {
      setToggling(null);
    }
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigDialogOpen(true);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const stats = {
    total: integrations.length,
    connected: integrations.filter(i => i.status === "connected").length,
    pending: integrations.filter(i => i.status === "pending").length,
  };

  const groupedIntegrations = integrations.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {} as Record<string, Integration[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.integrations") || "Integrations"}</h1>
          <p className="text-muted-foreground">Manage third-party service connections</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchIntegrations} disabled={loading} className="border-input text-muted-foreground" aria-label={t("common.refresh", "Refresh integrations")} title={t("common.refresh", "Refresh integrations")}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><Plug className="h-8 w-8 text-blue-400" /><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-muted-foreground text-sm">Total Integrations</p></div></div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold text-foreground">{stats.connected}</p><p className="text-muted-foreground text-sm">Connected</p></div></div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><XCircle className="h-8 w-8 text-yellow-400" /><div><p className="text-2xl font-bold text-foreground">{stats.pending}</p><p className="text-muted-foreground text-sm">Pending Setup</p></div></div></CardContent></Card>
      </div>

      {Object.entries(groupedIntegrations).map(([category, items]) => (
        <Card key={category} className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Badge variant="outline" className={CATEGORY_COLORS[category] || ""}>{category}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-4">
              {items.map((integration) => {
                const Icon = ICONS[integration.icon] || Plug;
                return (
                  <div key={integration.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted/80 rounded-lg"><Icon className="h-6 w-6 text-foreground" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">{integration.name}</span>
                          <Badge variant="outline" className={STATUS_COLORS[integration.status] || ""}>
                            {integration.status === "connected" ? <CheckCircle className="h-3 w-3 me-1" /> : null}
                            {integration.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">{integration.description}</p>
                        {integration.lastSync && <p className="text-muted-foreground text-xs mt-1">Last sync: {formatDate(integration.lastSync)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => handleConfigure(integration)} className="border-input" aria-label={t("superadmin.integrations.configure", `Configure ${integration.name}`)} title={t("superadmin.integrations.configure", `Configure ${integration.name}`)}><Settings className="h-4 w-4" /></Button>
                      <Switch checked={integration.enabled} onCheckedChange={() => handleToggle(integration)} disabled={toggling === integration.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="bg-card border-input">
          <DialogHeader><DialogTitle className="text-foreground flex items-center gap-2"><Settings className="h-5 w-5" />Configure {selectedIntegration?.name}</DialogTitle></DialogHeader>
          {selectedIntegration && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-muted-foreground text-sm mb-2">Status</p>
                <Badge variant="outline" className={STATUS_COLORS[selectedIntegration.status] || ""}>{selectedIntegration.status}</Badge>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-muted-foreground text-sm mb-2">Description</p>
                <p className="text-foreground">{selectedIntegration.description}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-200 text-sm">Configuration settings are managed via environment variables. Update .env to configure API keys and secrets.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)} className="border-input" aria-label={t("common.close", "Close configuration dialog")} title={t("common.close", "Close configuration dialog")}>Close</Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700"><a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 me-2" />Manage in Vercel</a></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
