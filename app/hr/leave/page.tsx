'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import ClientDate from '@/components/ClientDate';
import { logger } from '@/lib/logger';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface LeaveRequest {
  _id: string;
  employeeId: { _id: string; employeeCode: string; firstName: string; lastName: string };
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: LeaveStatus;
  reason?: string;
}

export default function LeavePage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | LeaveStatus>('ALL');

  useEffect(() => {
    void fetchRequests();
  }, []);

  const fetchRequests = async (status?: LeaveStatus) => {
    try {
      const query = status ? `?status=${status}` : '';
      const response = await fetch(`/api/hr/leaves${query}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      logger.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (value: 'ALL' | LeaveStatus) => {
    setFilter(value);
    setLoading(true);
    void fetchRequests(value === 'ALL' ? undefined : value);
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success/10 text-success border-success/30';
      case 'PENDING':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'REJECTED':
      case 'CANCELLED':
      default:
        return 'bg-muted text-foreground border-border';
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t('hr.leave.title', 'Leave Management')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('hr.leave.subtitle', 'Track and approve employee leave requests')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(status)}
            >
              {status === 'ALL'
                ? t('hr.leave.filter.all', 'All')
                : t(`hr.leave.status.${status.toLowerCase()}`, status)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              {t('hr.leave.empty', 'No leave requests found for this filter')}
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request._id}>
              <CardContent className="p-6 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{request.employeeId.employeeCode}</p>
                    <p className="text-lg font-semibold text-foreground">
                      {request.employeeId.firstName} {request.employeeId.lastName}
                    </p>
                  </div>
                  <Badge className={getStatusBadge(request.status)}>
                    {t(`hr.leave.status.${request.status.toLowerCase()}`, request.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('hr.leave.start', 'Start')}</p>
                    <p className="font-medium">
                      <ClientDate date={request.startDate} format="date-only" />
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('hr.leave.end', 'End')}</p>
                    <p className="font-medium">
                      <ClientDate date={request.endDate} format="date-only" />
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('hr.leave.days', 'Days')}</p>
                    <p className="font-medium">{request.numberOfDays}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('hr.leave.reason', 'Reason')}</p>
                    <p className="font-medium">{request.reason || t('common.notAvailable', 'N/A')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
