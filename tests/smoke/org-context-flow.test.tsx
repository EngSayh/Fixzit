import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

  SupportOrgProvider,
  useSupportOrg,
} from "@/contexts/SupportOrgContext";

const mockSession = {
  user: {
    isSuperAdmin: true,
    orgId: null,
  },
};

const sessionResponse = {
  data: mockSession,
  status: "authenticated",
};

vi.mock("next-auth/react", () => ({
  useSession: () => sessionResponse,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <SupportOrgProvider>{children}</SupportOrgProvider>;
}

type FetchResponse = {
  ok?: boolean;
  body?: unknown;
};

function mockFetchSequence(responses: FetchResponse[]) {
  const fetchMock = vi.fn();
  responses.forEach((res) => {
    fetchMock.mockResolvedValueOnce({
      ok: res.ok !== false,
      json: async () => res.body ?? {},
    } as Response);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("SupportOrgProvider smoke test", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("hydrates the support organization from the impersonation endpoint", async () => {
    const fetchMock = mockFetchSequence([
      { body: { organization: { orgId: "org_seed", name: "Seed Org" } } },
    ]);

    const { result } = renderHook(() => useSupportOrg(), { wrapper });

    await waitFor(() =>
      expect(result.current.supportOrg?.orgId).toBe("org_seed"),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/support/impersonation",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("selects an organization via selectOrgById", async () => {
    const fetchMock = mockFetchSequence([
      { body: { organization: null } },
      {
        body: { organization: { orgId: "org_selected", name: "Selected Org" } },
      },
    ]);

    const { result } = renderHook(() => useSupportOrg(), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      const ok = await result.current.selectOrgById("org_selected");
      expect(ok).toBe(true);
    });

    await waitFor(() =>
      expect(result.current.supportOrg?.orgId).toBe("org_selected"),
    );
    const [, postInit] = fetchMock.mock.calls;
    expect(postInit?.[0]).toBe("/api/support/impersonation");
    expect(postInit?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ orgId: "org_selected" }),
    });
  });

  it("clears impersonation session via clearSupportOrg", async () => {
    const fetchMock = mockFetchSequence([
      {
        body: { organization: { orgId: "org_existing", name: "Existing Org" } },
      },
      { body: {} },
    ]);

    const { result } = renderHook(() => useSupportOrg(), { wrapper });
    await waitFor(() =>
      expect(result.current.supportOrg?.orgId).toBe("org_existing"),
    );

    await act(async () => {
      await result.current.clearSupportOrg();
    });

    expect(result.current.supportOrg).toBeNull();
    const lastCall = fetchMock.mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ method: "DELETE" });
  });
});
