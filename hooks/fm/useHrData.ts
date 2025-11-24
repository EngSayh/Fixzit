"use client";

import useSWR from "swr";

type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type LeaveRequest = {
  _id: string;
  employeeId: {
    _id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
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
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(
      (await res.json().catch(() => ({})))?.error ?? "Request failed",
    );
  }
  return res.json();
};

export function useHrLeaveRequests(
  status?: LeaveRequestStatus,
  orgId?: string | null,
) {
  const query = status ? `?status=${status}` : "";
  const shouldFetch = Boolean(orgId);
  const { data, error, isLoading, mutate } = useSWR<{
    requests: LeaveRequest[];
  }>(shouldFetch ? `/api/hr/leaves${query}` : null, fetcher);

  return {
    requests: data?.requests ?? [],
    isLoading: shouldFetch ? isLoading : false,
    error: shouldFetch ? error : undefined,
    refresh: mutate,
  };
}

export function useHrPayrollRuns(status?: string, orgId?: string | null) {
  const query = status ? `?status=${status}` : "";
  const shouldFetch = Boolean(orgId);
  const { data, error, isLoading, mutate } = useSWR<{ runs: PayrollRun[] }>(
    shouldFetch ? `/api/hr/payroll/runs${query}` : null,
    fetcher,
  );

  return {
    runs: data?.runs ?? [],
    isLoading: shouldFetch ? isLoading : false,
    error: shouldFetch ? error : undefined,
    refresh: mutate,
  };
}
