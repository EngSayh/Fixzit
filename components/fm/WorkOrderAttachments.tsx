import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert, X } from 'lucide-react';

type ScanStatus = 'pending' | 'clean' | 'infected' | 'error';

export interface WorkOrderAttachment {
  key: string;
  url: string;
  name: string;
  size: number;
  type?: string;
  scanStatus: ScanStatus;
}

interface Props {
  workOrderId?: string;
  onChange?: (attachments: WorkOrderAttachment[]) => void;
}

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']);
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB (aligned with API guard)

export function WorkOrderAttachments({ workOrderId, onChange }: Props) {
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (!workOrderId) {
      setError('Save the work order first to enable attachments.');
      return;
    }

    const safeFiles = Array.from(fileList).filter((file) => {
      if (!ALLOWED_TYPES.has(file.type)) {
        setError(`Unsupported file type: ${file.type || 'unknown'} (PNG, JPG, PDF only)`);
        return false;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max 15 MB)`);
        return false;
      }
      return true;
    });

    if (safeFiles.length === 0) return;

    setUploading(true);
    setError(null);
    const next: WorkOrderAttachment[] = [];

    try {
      for (const file of safeFiles) {
        try {
          const presignRes = await fetch(`/api/work-orders/${workOrderId}/attachments/presign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream', size: file.size }),
          });
          if (!presignRes.ok) {
            throw new Error(await presignRes.text());
          }
          const presign = await presignRes.json();
          const headers: Record<string, string> = {
            ...(presign.headers || {}),
            'Content-Type': file.type || 'application/octet-stream',
          };

          const uploadRes = await fetch(presign.putUrl, { method: 'PUT', headers, body: file });
          if (!uploadRes.ok) {
            throw new Error('Upload failed');
          }

          const publicUrl = String(presign.putUrl).split('?')[0];
          let scanStatus: ScanStatus = 'pending';
          try {
            const scanRes = await fetch('/api/upload/scan-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: presign.key }),
            });
            if (scanRes.ok) {
              const scanJson = await scanRes.json().catch(() => ({}));
              if (typeof scanJson.clean === 'boolean') {
                scanStatus = scanJson.clean ? 'clean' : 'infected';
              }
            } else {
              scanStatus = 'error';
            }
          } catch (scanErr) {
            const msg = scanErr instanceof Error ? scanErr.message : 'Scan check failed';
            setError(msg);
            scanStatus = 'error';
          }

          next.push({
            key: presign.key,
            url: publicUrl,
            name: file.name,
            size: file.size,
            type: file.type,
            scanStatus,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to upload attachment');
        }
      }
    } finally {
      setUploading(false);
    }

    if (next.length) {
      const merged = [...attachments, ...next];
      setAttachments(merged);
      onChange?.(merged);
      if (workOrderId) {
        try {
          const saveRes = await fetch(`/api/work-orders/${workOrderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachments: merged }),
          });
          if (!saveRes.ok) {
            throw new Error('Failed to save attachments to work order');
          }
        } catch (persistErr) {
          setError(persistErr instanceof Error ? persistErr.message : 'Could not save attachments');
        }
      }
    }
  };

  const handleRemove = async (key: string) => {
    if (!workOrderId) return;
    if (!confirm('Remove this attachment?')) return;

    const updated = attachments.filter((att) => att.key !== key);
    setAttachments(updated);
    onChange?.(updated);

    try {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: updated }),
      });
      if (!res.ok) {
        throw new Error('Failed to remove attachment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove attachment');
      // Revert on error
      setAttachments(attachments);
      onChange?.(attachments);
    }
  };

  const statusBadge = (status: ScanStatus) => {
    const map: Record<ScanStatus, { label: string; className: string; icon: React.ReactNode }> = {
      pending: { label: 'Scan pending', className: 'bg-amber-50 text-amber-700', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
      clean: { label: 'Clean', className: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 className="h-4 w-4" /> },
      infected: { label: 'Infected', className: 'bg-red-50 text-red-700', icon: <ShieldAlert className="h-4 w-4" /> },
      error: { label: 'Scan error', className: 'bg-slate-100 text-slate-700', icon: <AlertCircle className="h-4 w-4" /> },
    };
    const meta = map[status];
    return (
      <Badge variant="outline" className={`gap-1 ${meta.className}`}>
        {meta.icon}
        {meta.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Attachments</Label>
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
        )}
        <Input
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || !workOrderId}
          className="max-w-xs"
        />
      </div>
      {error && (
        <div className="text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      <div className="space-y-2">
        {attachments.length === 0 && <p className="text-sm text-muted-foreground">No attachments uploaded yet.</p>}
        {attachments.map((att) => (
          <div key={att.key} className="flex items-center justify-between rounded border border-border p-2">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{att.name}</p>
              <p className="text-xs text-muted-foreground">{(att.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(att.scanStatus)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(att.key)}
                disabled={uploading}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
