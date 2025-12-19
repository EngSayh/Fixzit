/**
 * Vitest configuration guardrails
 *
 * The repo now ships 3 configs:
 * - vitest.config.ts            → client/server split
 * - vitest.config.api.ts        → ui/api split for API-centric suites
 * - vitest.config.models.ts     → isolated model tests (MongoMemoryServer)
 *
 * These assertions ensure each config keeps the expected include/exclude
 * patterns, aliases, and environments as we evolve the test matrix.
 */
import { describe, it, expect } from "vitest";
import {
  TextEncoder as NodeTextEncoder,
  TextDecoder as NodeTextDecoder,
} from "node:util";
import path from "node:path";
import baseConfig from "../vitest.config";
import apiConfig from "../vitest.config.api";
import modelsConfig from "../vitest.config.models";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


// Ensure esbuild invariants are satisfied in jsdom pools
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = NodeTextEncoder;
}
if (!globalThis.TextDecoder) {
  globalThis.TextDecoder =
    NodeTextDecoder as unknown as typeof globalThis.TextDecoder;
}

type AnyConfig = Record<string, any>;

const toArray = <T>(v: unknown): T[] => {
  if (v == null) return [];
  return Array.isArray(v) ? (v as T[]) : [v as T];
};

const normalizeAlias = (
  alias: unknown,
): Array<{ find: string; replacement: string }> => {
  if (!alias) return [];
  if (Array.isArray(alias)) {
    return alias.map((entry) => ({
      find: String((entry as { find: unknown }).find),
      replacement: String((entry as { replacement: unknown }).replacement),
    }));
  }
  if (typeof alias === "object") {
    return Object.entries(alias as Record<string, string>).map(
      ([find, replacement]) => ({
        find,
        replacement: String(replacement),
      }),
    );
  }
  return [];
};

const resolveSetup = (setups: unknown, alias: unknown): string[] => {
  const entries = normalizeAlias(alias);
  return toArray<string>(setups)
    .map((p) => {
      const match = entries.find((a) => p.startsWith(a.find));
      if (match) return path.resolve(p.replace(match.find, match.replacement));
      if (
        p.startsWith(".") ||
        p.startsWith("tests") ||
        p.startsWith("src") ||
        p.startsWith("/")
      ) {
        return path.resolve(process.cwd(), p);
      }
      return "";
    })
    .filter(Boolean);
};

const expectProjectNames = (cfg: AnyConfig, names: string[]) => {
  const projects = toArray<AnyConfig>(cfg?.test?.projects);
  expect(projects.map((p) => p?.test?.name)).toEqual(
    expect.arrayContaining(names),
  );
};

describe("vitest.config.ts (client/server)", () => {
  const projects = toArray<AnyConfig>(baseConfig?.test?.projects);

  it("defines client/server projects with aliases", () => {
    expectProjectNames(baseConfig, ["client", "server"]);
    projects.forEach((p) => {
      expect(
        normalizeAlias(p?.resolve?.alias || baseConfig?.resolve?.alias),
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ find: "@" })]),
      );
    });
  });

  it("uses jsdom for client and node for server with sensible globs", () => {
    const client = projects.find((p) => p?.test?.name === "client");
    const server = projects.find((p) => p?.test?.name === "server");

    expect(client?.test?.environment).toBe("jsdom");
    expect(toArray(client?.test?.include).join(" ")).toContain("test");
    expect(client?.test?.exclude).toEqual(
      expect.arrayContaining([
        expect.stringContaining("api"),
        expect.stringContaining("server"),
      ]),
    );

    expect(server?.test?.environment).toBe("node");
    expect(toArray(server?.test?.include).join(" ")).toContain("api");
    expect(server?.test?.exclude).toEqual(
      expect.arrayContaining([expect.stringContaining("node_modules")]),
    );
  });
});

describe("vitest.config.api.ts (ui/api split)", () => {
  const projects = toArray<AnyConfig>(apiConfig?.test?.projects);

  it("retains @ alias and split environments", () => {
    expectProjectNames(apiConfig, ["ui", "api"]);
    const aliases = normalizeAlias(apiConfig?.resolve?.alias);
    expect(aliases).toEqual(
      expect.arrayContaining([expect.objectContaining({ find: "@" })]),
    );

    const ui = projects.find((p) => p?.test?.name === "ui");
    const api = projects.find((p) => p?.test?.name === "api");
    expect(ui?.test?.environment).toBe("jsdom");
    expect(api?.test?.environment).toBe("node");
  });

  it("wires setup files to real paths", () => {
    const setups = projects.flatMap((p) =>
      resolveSetup(p?.test?.setupFiles, apiConfig?.resolve?.alias),
    );
    setups.forEach((p) => expect(p.startsWith(process.cwd())).toBe(true));
  });
});

describe("vitest.config.models.ts (model-only)", () => {
  it("runs in node with Mongo-focused setup and model glob", () => {
    expect(modelsConfig?.test?.environment).toBe("node");
    const include = toArray<string>(modelsConfig?.test?.include).join(",");
    expect(include).toContain("tests/unit/models");
    expect(modelsConfig?.test?.setupFiles).toEqual(
      expect.arrayContaining(["./vitest.setup.ts"]),
    );
    expect(
      resolveSetup(
        modelsConfig?.test?.setupFiles,
        modelsConfig?.resolve?.alias,
      )[0],
    ).toContain(path.join(process.cwd(), "vitest.setup.ts"));
  });

  it("exposes next/server alias override for stubs", () => {
    const aliases = normalizeAlias(modelsConfig?.resolve?.alias);
    expect(
      aliases.some(
        (a) =>
          a.find === "next/server" &&
          a.replacement.endsWith("tests/vitest-stubs/next-server.ts"),
      ),
    ).toBe(true);
  });
});
