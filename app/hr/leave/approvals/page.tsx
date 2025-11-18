'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Users, ShieldCheck, Clock8, AlertTriangle, Check, X } from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ClientDate from '@/components/ClientDate';
import { logger } from '@/lib/logger';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

type LeaveRequest = {
  _id: string;
  employeeId: {
    _id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department?: string;
  };
  leaveTypeId: {
    _id: string;
    name: string;
    code: string;
    isPaid?: boolean;
  };
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: LeaveStatus;
  reason?: string;
};

const statusBadgeClasses: Record<LeaveStatus, string> = {
  PENDING: 'bg-warning/10 border-warning/20 text-warning',
  APPROVED: 'bg-success/10 border-success/30 text-success',
  REJECTED: 'bg-destructive/10 border-destructive/30 text-destructive',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
};

export default function LeaveApprovalsPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPendingRequests = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await fetch('/api/hr/leaves?status=PENDING', { signal });
        if (!response.ok) {
          throw new Error(`Failed to load approvals (${response.status})`);
        }
        const data = await response.json();
        if (!signal?.aborted) {
          setRequests(Array.isArray(data.requests) ? data.requests : []);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        logger.error('Error loading leave approvals', { error });
        toast.error(
          t('hr.leave.approvals.loadError', 'Unable to load pending leave approvals. Please retry.')
        );
      } finally {
        if (!signal || !signal.aborted) {
          setLoading(false);
        }
      }
    },
    [t]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchPendingRequests(controller.signal);
    return () => controller.abort();
  }, [fetchPendingRequests]);

  const stats = useMemo(() => {
    if (!requests.length) {
      return { total: 0, urgent: 0, avgDuration: 0 };
    }
    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayMs = 1000 * 60 * 60 * 24;
    const urgent = requests.filter((req) => {
      const start = new Date(req.startDate);
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const diffDays = (startDay.getTime() - normalizedToday.getTime()) / dayMs;
      return diffDays >= 0 && diffDays <= 7;
    }).length;
    const avgDuration =
      requests.reduce((acc, req) => acc + (req.numberOfDays || 0), 0) / requests.length;
    return {
      total: requests.length,
      urgent,
      avgDuration: Number.isFinite(avgDuration) ? avgDuration : 0,
    };
  }, [requests]);

  const handleDecision = async (
    requestId: string,
    status: Extract<LeaveStatus, 'APPROVED' | 'REJECTED'>
  ) => {
    setProcessing(`${requestId}-${status}`);
    const note = decisionNotes[requestId]?.trim();

    try {
      const response = await fetch('/api/hr/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveRequestId: requestId, status, note }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update leave (#${response.status})`);
      }

      toast.success(
        status === 'APPROVED'
          ? t('hr.leave.approvals.approved', 'Leave approved')
          : t('hr.leave.approvals.rejected', 'Leave rejected')
      );
      setDecisionNotes((prev) => ({ ...prev, [requestId]: '' }));
      await fetchPendingRequests();
    } catch (error) {
      logger.error('Failed to update leave status from approvals page', { error });
      toast.error(t('hr.leave.approvals.updateError', 'Unable to update leave request.'));
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {t('hr.leave.approvals.title', 'Leave Approvals')}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {t(
            'hr.leave.approvals.subtitle',
            'Review pending requests, capture decision notes, and keep employees informed.'
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<Users className="w-4 h-4 text-primary" />}
          label={t('hr.leave.approvals.cards.pending', 'Pending approvals')}
          value={stats.total.toString()}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
          label={t('hr.leave.approvals.cards.urgent', 'Starting within 7 days')}
          value={stats.urgent.toString()}
        />
        <SummaryCard
          icon={<Clock8 className="w-4 h-4 text-muted-foreground" />}
          label={t('hr.leave.approvals.cards.avgDuration', 'Average request length')}
          value={`${stats.avgDuration.toFixed(1)} ${t('hr.leave.approvals.cards.days', 'days')}`}
        />
      </div>

      {requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <ShieldCheck className="mx-auto w-10 h-10 text-muted-foreground" />
            <p className="text-base text-muted-foreground">
              {t('hr.leave.approvals.empty', 'No pending approvals. Enjoy the calm!')}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                void fetchPendingRequests();
              }}
            >
              {t('hr.leave.approvals.refresh', 'Refresh')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const isProcessingApprove = processing === `${request._id}-APPROVED`;
            const isProcessingReject = processing === `${request._id}-REJECTED`;
            const isProcessingRequest = isProcessingApprove || isProcessingReject;
            return (
              <Card key={request._id} className="border-border">
                <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {request.employeeId.firstName} {request.employeeId.lastName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {request.employeeId.employeeCode}
                      {request.employeeId.department ? ` · ${request.employeeId.department}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusBadgeClasses[request.status]}>
                    {request.leaveTypeId?.name || t('hr.leave.approvals.leave', 'Leave')}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t('hr.leave.approvals.dates', 'Dates')}
                      </p>
                      <p className="font-medium flex items-center gap-1">
                        <ClientDate date={request.startDate} format="date-only" />
                        <span>→</span>
                        <ClientDate date={request.endDate} format="date-only" />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.numberOfDays}{' '}
                        {t('hr.leave.approvals.days', 'days')} ·{' '}
                        {request.leaveTypeId?.isPaid
                          ? t('hr.leave.approvals.paid', 'Paid')
                          : t('hr.leave.approvals.unpaid', 'Unpaid')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t('hr.leave.approvals.reason', 'Reason')}
                      </p>
                      <p className="text-sm text-foreground">
                        {request.reason || t('hr.leave.approvals.noReason', 'No reason provided')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t('hr.leave.approvals.notes', 'Decision notes')}
                      </p>
                      <Textarea
                        placeholder={t(
                          'hr.leave.approvals.notesPlaceholder',
                          'Add context for the employee (optional)'
                        )}
                        value={decisionNotes[request._id] ?? ''}
                        onChange={(event) =>
                          setDecisionNotes((prev) => ({
                            ...prev,
                            [request._id]: event.target.value,
                          }))
                        }
                        className="min-h-[90px]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-end">
                    <Button
                      variant="outline"
                      disabled={isProcessingRequest}
                      onClick={() => handleDecision(request._id, 'REJECTED')}
                    >
                      {isProcessingReject ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4 me-2" />
                      )}
                      {t('hr.leave.approvals.reject', 'Reject')}
                    </Button>
                    <Button
                      disabled={isProcessingRequest}
                      onClick={() => handleDecision(request._id, 'APPROVED')}
                    >
                      {isProcessingApprove ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 me-2" />
                      )}
                      {t('hr.leave.approvals.approve', 'Approve')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
