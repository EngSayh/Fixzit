'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/skeletons';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Plug, Check, X, Settings } from 'lucide-react';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import { useEffect } from 'react';

interface RemoteIntegration {
  id: string;
  status: string;
  [key: string]: unknown;
}

const INTEGRATIONS = [
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email delivery service for notifications',
    status: 'connected',
    icon: '📧',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS and WhatsApp messaging',
    status: 'connected',
    icon: '💬',
  },
  {
    id: 'paytabs',
    name: 'PayTabs',
    description: 'Payment gateway for online transactions',
    status: 'connected',
    icon: '💳',
  },
  {
    id: 'aws-s3',
    name: 'AWS S3',
    description: 'Cloud storage for documents and media',
    status: 'connected',
    icon: '☁️',
  },
  {
    id: 'google-maps',
    name: 'Google Maps',
    description: 'Location services and geocoding',
    status: 'disconnected',
    icon: '🗺️',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team collaboration and alerts',
    status: 'disconnected',
    icon: '💼',
  },
];

export default function IntegrationsPage() {
  const auto = useAutoTranslator('fm.system.integrations');
  const { data: session } = useSession();
  const { hasOrgContext, guard, supportOrg } = useFmOrgGuard({ moduleId: 'system' });
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchIntegrations = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/fm/system/integrations'); // optional future endpoint to list
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data)) {
            const remoteIntegrations = json.data as RemoteIntegration[];
            setIntegrations((prev) =>
              prev.map((int) => {
                const remote = remoteIntegrations.find((x) => x.id === int.id);
                return remote ? { ...int, status: remote.status } : int;
              })
            );
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchIntegrations();
  }, []);

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  if (!hasOrgContext) {
    return guard;
  }

  const handleToggle = async (integrationId: string, currentStatus: string) => {
    const action = currentStatus === 'connected' ? 'disconnect' : 'connect';
    const toastId = toast.loading(
      auto(`${action === 'connect' ? 'Connecting' : 'Disconnecting'}...`, `toast.${action}Loading`)
    );

    try {
      const res = await fetch(`/api/fm/system/integrations/${integrationId}/toggle`, {
        method: 'POST',
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to toggle integration');
      }
      const json = await res.json();
      const newStatus = json?.data?.status ?? (action === 'connect' ? 'connected' : 'disconnected');

      setIntegrations((prev) =>
        prev.map((int) => (int.id === integrationId ? { ...int, status: newStatus } : int))
      );

      toast.success(
        auto(
          newStatus === 'connected' ? 'Connected successfully' : 'Disconnected successfully',
          `toast.${newStatus === 'connected' ? 'connectSuccess' : 'disconnectSuccess'}`
        ),
        { id: toastId }
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Integrations] Toggle failed:', error);
      }
      toast.error(auto('Operation failed', 'toast.error'), { id: toastId });
    }
  };

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="system" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {auto('Support context: {{name}}', 'support.activeOrg', { name: supportOrg.name })}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Plug className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {auto('Integrations', 'header.title')}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {auto('Manage third-party service connections', 'header.subtitle')}
          </p>
        </div>
        <div className="text-end">
          <p className="text-2xl font-bold">{connectedCount}/{integrations.length}</p>
          <p className="text-sm text-muted-foreground">{auto('Connected', 'stats.connected')}</p>
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{integration.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <Badge
                          variant={integration.status === 'connected' ? 'default' : 'secondary'}
                          className="mt-1"
                        >
                          {integration.status === 'connected' ? (
                            <Check className="w-3 h-3 me-1" />
                          ) : (
                            <X className="w-3 h-3 me-1" />
                          )}
                          {auto(integration.status, `status.${integration.status}`)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={integration.status === 'connected' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleToggle(integration.id, integration.status)}
                      className="flex-1"
                    >
                      {integration.status === 'connected'
                        ? auto('Disconnect', 'actions.disconnect')
                        : auto('Connect', 'actions.connect')}
                    </Button>
                    {integration.status === 'connected' && (
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="p-6 border border-dashed border-border rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              {auto('Integration data will be managed via /api/fm/system/integrations', 'info.apiEndpoint')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
