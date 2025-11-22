'use client';
/* eslint-disable react-hooks/rules-of-hooks */

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

type ReportJob = {
  id: string;
  name: string;
  type: string;
  format: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  updatedAt?: string;
  fileKey?: string;
  createdAt?: string;
  notes?: string;
  clean?: boolean;
};

export default function ReportsPage() {
  const auto = useAutoTranslator('fm.reports');
  const { hasOrgContext, guard, orgId, supportBanner } = useFmOrgGuard({ moduleId: 'finance' });
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fm/reports');
      const data = await res.json();
      if (res.ok && data?.success) {
        setJobs(data.data || []);
      }
    } catch (error) {
      logger.error('Failed to load report jobs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const handleDownload = async (id: string) => {
    try {
      setDownloadingId(id);
      const res = await fetch(`/api/fm/reports/${id}/download`);
      const data = await res.json();
      if (!res.ok || !data?.success || !data.downloadUrl) {
        throw new Error(data?.error || 'Download unavailable');
      }
      window.open(data.downloadUrl, '_blank');
    } catch (error) {
      const message = error instanceof Error ? error.message : auto('Download failed', 'errors.downloadFailed');
      toast.error(message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="reports" />
      {supportBanner}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Reports', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Analytics and reporting dashboard', 'header.subtitle')}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {auto('Reports & Analytics', 'card.title')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto('Reports interface loads here.', 'card.description')}
        </p>
        <p className="text-sm text-muted-foreground">
          {auto('Connected to Reports API endpoints.', 'card.footer')}
        </p>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {auto('Recent report jobs', 'list.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {auto('Latest requests with download links when ready', 'list.subtitle')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadJobs} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {auto('Refresh', 'actions.refresh')}
          </Button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{auto('No report jobs yet.', 'list.empty')}</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-semibold">{job.name}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {job.type} · {job.format.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {auto('Status', 'fields.status')}: {job.status}
                    {job.updatedAt ? ` · ${new Date(job.updatedAt).toLocaleString()}` : ''}
                    {job.clean === false ? ` · ${auto('Failed scan', 'status.scanFailed')}` : ''}
                  </p>
                  {job.notes && (
                    <p className="text-[11px] text-muted-foreground">{job.notes}</p>
                  )}
                </div>
                {job.status === 'ready' && job.fileKey ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleDownload(job.id)}
                    disabled={downloadingId === job.id}
                  >
                    {downloadingId === job.id && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    <ExternalLink className="w-4 h-4 me-2" />
                    {auto('Download', 'actions.download')}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {job.status === 'failed'
                      ? auto('Failed (scan or generation)', 'status.failed')
                      : auto('Processing', 'status.processing')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
