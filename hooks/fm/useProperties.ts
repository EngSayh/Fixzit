'use client';

import useSWR from 'swr';

export type PropertyRecord = {
  _id: string;
  name: string;
  code?: string;
  type?: string;
  subtype?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
  };
  ownership?: {
    type?: string;
  };
  vendors?: Array<{
    _id?: string;
    vendorId?: string;
    name?: string;
  }>;
  units?: Array<{
    name?: string;
    status?: string;
  }>;
  createdAt?: string;
};

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error ?? 'Request failed');
  }
  return res.json();
};

export function useProperties(params?: string) {
  const url = params ? `/api/properties${params}` : '/api/properties';
  const { data, error, isLoading, mutate } = useSWR<{ items: PropertyRecord[] }>(
    url,
    fetcher
  );

  return {
    properties: data?.items ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
