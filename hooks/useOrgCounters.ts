import useSWR from "swr";
import { useSession } from "next-auth/react";
import { fetchOrgCounters, type CounterPayload } from "@/lib/counters";

export function useOrgCounters() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const isReady = status === "authenticated" && !!orgId;

  const { data, error, isLoading, mutate } = useSWR<CounterPayload>(
    isReady && orgId ? ["counters", orgId] : null,
    (_key: [string, string]) => fetchOrgCounters(_key[1]),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    },
  );

  return {
    counters: data,
    error,
    isLoading,
    refresh: mutate,
    orgId,
  };
}
