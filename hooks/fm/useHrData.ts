'use client';

import useSWR from 'swr';

type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type LeaveRequest = {
  _id: string;
  employeeId: { _id: string; employeeCode: string; firstName: string; lastName: string };
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: LeaveRequestStatus;
  reason?: string;
  approvalDate?: string;
  updatedAt?: string;
};

export type PayrollRun = {
  _id: string;
  name: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  netAmount?: number;
  variance?: number;
};

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error((await res.json().catch(() => ({})))?.error ?? 'Request failed');
  }
  return res.json();
};

export function useHrLeaveRequests(status?: LeaveRequestStatus) {
  const query = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR<{ requests: LeaveRequest[] }>(
    `/api/hr/leaves${query}`,
    fetcher
  );

  return {
    requests: data?.requests ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useHrPayrollRuns(status?: string) {
  const query = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR<{ runs: PayrollRun[] }>(
    `/api/hr/payroll/runs${query}`,
    fetcher
  );

  return {
    runs: data?.runs ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
