import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

let capturedKey = "";

vi.mock("swr", () => ({
  default: (key: string) => {
    capturedKey = key;
    return {
      data: { items: [], page: 1, limit: 20, total: 0 },
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    };
  },
}));

vi.mock("@/hooks/useTableQueryState", () => ({
  useTableQueryState: () => ({
    state: {
      page: 2,
      pageSize: 10,
      q: "user",
      filters: {
        role: "ORG_ADMIN",
        status: "LOCKED",
        department: "Engineering",
        inactiveDays: 30,
        lastLoginFrom: "2024-01-01",
        lastLoginTo: "2024-01-31",
      },
    },
    updateState: vi.fn(),
    resetState: vi.fn(),
  }),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || "" }),
}));

import { UsersList } from "@/components/administration/UsersList";

describe("UsersList query params", () => {
  it("includes filters in the SWR key", () => {
    capturedKey = "";
    render(<UsersList orgId="org-1" />);

    expect(capturedKey.startsWith("/api/users?")).toBe(true);
    const url = new URL(capturedKey, "http://localhost");
    const params = url.searchParams;

    expect(params.get("org")).toBe("org-1");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("10");
    expect(params.get("q")).toBe("user");
    expect(params.get("role")).toBe("ORG_ADMIN");
    expect(params.get("status")).toBe("LOCKED");
    expect(params.get("department")).toBe("Engineering");
    expect(params.get("inactiveDays")).toBe("30");
    expect(params.get("lastLoginFrom")).toBe("2024-01-01");
    expect(params.get("lastLoginTo")).toBe("2024-01-31");
  });
});
