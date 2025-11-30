import { describe, expect, it } from "vitest";

import {
  sanitizeError,
  sanitizeLogParams,
  sanitizeValue,
} from "@/lib/security/log-sanitizer";

describe("log-sanitizer", () => {
  it("redacts known sensitive keys (including nested and camel/snake variants)", () => {
    const input = {
      email: "user@example.com",
      nested: {
        phone_number: "+966500000000",
      },
      identifier: "demo-user",
    };

    const result = sanitizeLogParams(input);

    expect(result.email).toBe("[REDACTED]");
    expect(
      (result.nested as Record<string, unknown>).phone_number,
    ).toBe("[REDACTED]");
    expect(result.identifier).toBe("[REDACTED]");
  });

  it("redacts PII-looking values inside arrays and free-form strings", () => {
    const input = {
      values: ["user@example.com", "safe-value"],
      attendees: [{ phone: "+1234567890" }, { name: "ok" }],
    };

    const result = sanitizeLogParams(input);

    expect((result.values as unknown[])[0]).toBe("[REDACTED]");
    expect((result.values as unknown[])[1]).toBe("safe-value");
    const attendees = result.attendees as Record<string, unknown>[];
    expect(attendees[0].phone).toBe("[REDACTED]");
    expect(attendees[1].name).toBe("ok");
  });

  it("preserves primitives and serializes Date while sanitizing errors", () => {
    const now = new Date("2024-01-02T03:04:05.000Z");
    const error = new Error("boom");

    const result = sanitizeLogParams({
      date: now,
      count: 5,
      ok: true,
      error,
    });

    expect(result.date).toBe(now.toISOString());
    expect(result.count).toBe(5);
    expect(result.ok).toBe(true);
    expect((result.error as Record<string, unknown>).message).toBe("boom");
    expect((result.error as Record<string, unknown>).name).toBe("Error");
  });

  it("limits recursion depth to avoid runaway sanitization", () => {
    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let i = 0; i < 12; i++) {
      const next: Record<string, unknown> = {};
      cursor[`level${i}`] = next;
      cursor = next;
    }

    const result = sanitizeLogParams(deep);

    // The deepest leaf should be truncated once depth exceeds MAX_DEPTH
    expect(JSON.stringify(result)).toContain("Max depth exceeded");
  });

  it("sanitizes individual values", () => {
    expect(sanitizeValue("user@example.com", "email")).toBe("[REDACTED]");
    expect(sanitizeValue("plain", "note")).toBe("plain");
  });

  it("sanitizes standalone errors", () => {
    const err = sanitizeError(new Error("boom"));
    expect(err.message).toBe("boom");
    expect(err.name).toBe("Error");
  });
});
