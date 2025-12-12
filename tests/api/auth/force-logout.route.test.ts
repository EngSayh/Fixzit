import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/force-logout/route";

describe("auth/force-logout route", () => {
  it("expires all auth cookies for current host", async () => {
    const req = new NextRequest("https://example.com/api/auth/force-logout", {
      method: "POST",
    });

    const res = await POST(req);
    const cookies = res.cookies.getAll();
    const accessCookie = cookies.find((c) => c.name === "fxz.access");
    const refreshCookie = cookies.find((c) => c.name === "fxz.refresh");

    expect(res.status).toBe(200);
    expect(accessCookie?.expires?.getTime()).toBe(0);
    expect(refreshCookie?.expires?.getTime()).toBe(0);
  });
});
