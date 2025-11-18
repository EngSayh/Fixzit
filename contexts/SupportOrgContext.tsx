'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

type SupportOrgSummary = {
  orgId: string;
  name: string;
  code?: string | null;
  registrationNumber?: string | null;
  subscriptionPlan?: string | null;
};

type SupportOrgContextValue = {
  effectiveOrgId: string | null;
  supportOrg: SupportOrgSummary | null;
  loading: boolean;
  canImpersonate: boolean;
  selectOrgById: (_orgId: string) => Promise<boolean>;
  clearSupportOrg: () => Promise<void>;
  refreshSupportOrg: () => Promise<void>;
};

const SupportOrgContext = createContext<SupportOrgContextValue | undefined>(undefined);

const IMPERSONATION_ENDPOINT = '/api/support/impersonation';

export function SupportOrgProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [supportOrg, setSupportOrg] = useState<SupportOrgSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = Boolean((session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin);
  const sessionOrgId = (session?.user as { orgId?: string | null })?.orgId ?? null;

  const refreshSupportOrg = useCallback(async () => {
    if (!isSuperAdmin) {
      setSupportOrg(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(IMPERSONATION_ENDPOINT, { credentials: 'include' });
      if (!res.ok) {
        setSupportOrg(null);
        return;
      }
      const data = (await res.json()) as { organization?: SupportOrgSummary | null };
      setSupportOrg(data.organization ?? null);
    } catch {
      setSupportOrg(null);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setSupportOrg(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(IMPERSONATION_ENDPOINT, { credentials: 'include' });
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as { organization?: SupportOrgSummary | null };
        if (!cancelled) {
          setSupportOrg(data.organization ?? null);
        }
      } catch {
        if (!cancelled) {
          setSupportOrg(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const selectOrgById = useCallback(
    async (orgId: string) => {
      if (!isSuperAdmin || !orgId) {
        return false;
      }
      setLoading(true);
      try {
        const res = await fetch(IMPERSONATION_ENDPOINT, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orgId }),
        });
        if (!res.ok) {
          return false;
        }
        const data = (await res.json()) as { organization?: SupportOrgSummary | null };
        setSupportOrg(data.organization ?? null);
        return Boolean(data.organization);
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [isSuperAdmin]
  );

  const clearSupportOrg = useCallback(async () => {
    if (!isSuperAdmin) {
      return;
    }
    setLoading(true);
    try {
      await fetch(IMPERSONATION_ENDPOINT, {
        method: 'DELETE',
        credentials: 'include',
      });
      setSupportOrg(null);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const effectiveOrgId = supportOrg?.orgId ?? sessionOrgId ?? null;

  const value = useMemo<SupportOrgContextValue>(
    () => ({
      effectiveOrgId,
      supportOrg,
      loading,
      canImpersonate: isSuperAdmin,
      selectOrgById,
      clearSupportOrg,
      refreshSupportOrg,
    }),
    [effectiveOrgId, supportOrg, loading, isSuperAdmin, selectOrgById, clearSupportOrg, refreshSupportOrg]
  );

  return <SupportOrgContext.Provider value={value}>{children}</SupportOrgContext.Provider>;
}

export function useSupportOrg() {
  const ctx = useContext(SupportOrgContext);
  if (!ctx) {
    throw new Error('useSupportOrg must be used within SupportOrgProvider');
  }
  return ctx;
}
