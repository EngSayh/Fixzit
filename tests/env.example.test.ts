import fs from "fs";
import path from "path";

type KeyRule = {
  required?: boolean;
  type?: "string" | "boolean" | "number" | "url";
  pattern?: RegExp;
  allowed?: string[];
  validate?: (value: string) => boolean;
  note?: string;
};

const CANDIDATE_PATHS = [
  ".env.example",
  "env.example",
  "example.env",
];

function loadEnvExample(): { path: string; content: string } {
  const repoRoot = process.cwd();
  for (const p of CANDIDATE_PATHS) {
    const full = path.join(repoRoot, p);
    if (fs.existsSync(full)) {
      return { path: full, content: fs.readFileSync(full, "utf8") };
    }
  }
  throw new Error(
    `env example file not found. Looked for: ${CANDIDATE_PATHS.join(", ")}`
  );
}

function parseEnv(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1); // preserve original (including spaces)
    // If duplicate keys appear, we keep the last but flag in tests
    map.set(key, value);
  }
  return map;
}

function collectDuplicates(content: string): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
  }
  return Array.from(dupes);
}

const REQUIRED_KEYS: Record<string, KeyRule> = {
  // Database
  MONGODB_URI: {
    required: true,
    type: "url",
    pattern: /^mongodb(?:\+srv)?:\/\//i,
    note: "Must start with mongodb:// or mongodb+srv://",
  },
  USE_MOCK_DB: {
    required: true,
    type: "boolean",
    allowed: ["true", "false"],
  },

  // JWT
  JWT_SECRET: {
    required: true,
    // Allow blank placeholder or a 64-hex string as suggested
    validate: (v) => v === "" || /^[a-fA-F0-9]{64}$/.test(v),
    note: "Empty or 64 hex characters as suggested by the comment",
  },

  // PayTabs
  PAYTABS_PROFILE_ID: { required: true, type: "string" },
  PAYTABS_SERVER_KEY: { required: true, type: "string" },
  PAYTABS_REGION: { required: true, type: "string", allowed: ["SAU"] },
  PAYTABS_BASE_URL: {
    required: true,
    type: "url",
    pattern: /^https:\/\/secure\.paytabs\.(sa|com|ae|eg|om|jo|bh|qa)(\/|$)/i,
  },

  // Google Maps
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: { required: true, type: "string" },

  // URLs
  NEXT_PUBLIC_APP_URL: { required: true, type: "url", pattern: /^https?:\/\//i },
  NEXT_PUBLIC_API_URL: { required: true, type: "url", pattern: /^https?:\/\//i },

  // ZATCA
  ZATCA_TAXPAYER_ID: { required: true, pattern: /^\d{10,20}$/ },
  ZATCA_API_URL: { required: true, type: "url", pattern: /^https?:\/\//i },
  ZATCA_CERTIFICATE: { required: true, type: "string" },

  // Email
  EMAIL_HOST: { required: true, type: "string" },
  EMAIL_PORT: {
    required: true,
    type: "number",
    validate: (v) => /^\d+$/.test(v) && Number(v) > 0 && Number(v) < 65536,
  },
  EMAIL_USER: { required: true, type: "string" },
  EMAIL_PASS: { required: true, type: "string" },

  // SMS
  SMS_PROVIDER: { required: true, type: "string" },
  SMS_ACCOUNT_SID: { required: true, type: "string" },
  SMS_AUTH_TOKEN: { required: true, type: "string" },
  SMS_FROM_NUMBER: {
    required: true,
    // Allow placeholder like +966xxxxxxxxx or real E.164 (+ and digits)
    pattern: /^\+\d[\dxX]+$/,
  },

  // Storage
  STORAGE_TYPE: { required: true, type: "string", allowed: ["local", "s3"] },
  AWS_ACCESS_KEY_ID: { required: true, type: "string" },
  AWS_SECRET_ACCESS_KEY: { required: true, type: "string" },
  AWS_REGION: { required: true, type: "string" },
  AWS_BUCKET_NAME: { required: true, type: "string" },

  // Feature flags
  ENABLE_PAYMENT_GATEWAY: { required: true, type: "boolean", allowed: ["true", "false"] },
  ENABLE_SMS_OTP: { required: true, type: "boolean", allowed: ["true", "false"] },
  ENABLE_EMAIL_NOTIFICATIONS: { required: true, type: "boolean", allowed: ["true", "false"] },
  ENABLE_GOOGLE_MAPS: { required: true, type: "boolean", allowed: ["true", "false"] },
  ENABLE_ZATCA_INTEGRATION: { required: true, type: "boolean", allowed: ["true", "false"] },

  // Node env
  NODE_ENV: {
    required: true,
    type: "string",
    allowed: ["development", "test", "staging", "production"],
  },
};

// Simple URL check; we rely on pattern when provided
function isLikelyUrl(v: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(v);
}

function checkRule(key: string, value: string, rule: KeyRule): { ok: boolean; message?: string } {
  // type checking
  if (rule.type === "boolean") {
    if (!/^(true|false)$/i.test(value)) {
      return { ok: false, message: `${key} must be 'true' or 'false'` };
    }
  } else if (rule.type === "number") {
    if (!/^\d+$/.test(value)) {
      return { ok: false, message: `${key} must be a number` };
    }
  } else if (rule.type === "url") {
    if (!isLikelyUrl(value)) {
      return { ok: false, message: `${key} must be a URL (http/https)` };
    }
  }

  // allowed values
  if (rule.allowed && !rule.allowed.includes(value)) {
    return { ok: false, message: `${key} must be one of: ${rule.allowed.join(", ")}` };
  }

  // pattern
  if (rule.pattern && !rule.pattern.test(value)) {
    return { ok: false, message: `${key} failed pattern check` };
  }

  // custom validate
  if (rule.validate && !rule.validate(value)) {
    return { ok: false, message: `${key} failed custom validation` };
  }

  return { ok: true };
}

describe("env.example integrity", () => {
  const { path: envPath, content } = loadEnvExample();
  const map = parseEnv(content);

  it("should exist at a known filename", () => {
    expect(envPath).toBeTruthy();
    expect(fs.existsSync(envPath)).toBe(true);
  });

  it("should not contain duplicate keys", () => {
    const dupes = collectDuplicates(content);
    expect(dupes).toEqual([]);
  });

  it("should include at least all required keys", () => {
    const missing: string[] = [];
    for (const key of Object.keys(REQUIRED_KEYS)) {
      if (!map.has(key)) missing.push(key);
    }
    expect(missing).toEqual([]);
  });

  it("should use lowercase boolean literals for feature flags and booleans", () => {
    const boolKeys = Object.keys(REQUIRED_KEYS).filter(
      (k) => REQUIRED_KEYS[k].type === "boolean"
    );
    const errors: string[] = [];
    for (const k of boolKeys) {
      const v = map.get(k) ?? "";
      if (!/^(true|false)$/.test(v)) {
        errors.push(`${k} must be exactly 'true' or 'false' (lowercase)`);
      }
    }
    expect(errors).toEqual([]);
  });

  it("should satisfy value constraints and patterns", () => {
    const problems: string[] = [];
    for (const [key, rule] of Object.entries(REQUIRED_KEYS)) {
      if (!map.has(key)) {
        if (rule.required) problems.push(`${key} is missing`);
        continue;
      }
      const value = (map.get(key) ?? "").trim();

      // Allow blanks for credentials-like placeholders if rule allows via custom validate
      if (!value && !rule.validate && rule.type && rule.type !== "boolean") {
        // Many example files leave secrets blank; only warn if rule truly requires non-empty
        // We'll skip non-empty enforcement unless allowed specifies a set or a pattern that forbids empty.
      }

      const { ok, message } = checkRule(key, value, rule);
      if (!ok) problems.push(`${key}: ${message ?? "invalid value"}`);
    }
    expect(problems).toEqual([]);
  });

  it("should keep commentary sections for readability", () => {
    // Sentinel section headers from provided content
    const sentinelHeaders = [
      "# Database",
      "# JWT Secret",
      "# PayTabs Configuration (Saudi Arabia)",
      "# Google Maps",
      "# Application URL",
      "# Backend API URL",
      "# ZATCA Configuration",
      "# Email Configuration (Optional)",
      "# SMS Configuration (Optional - for OTP)",
      "# File Storage (Optional)",
      "# Feature Flags",
      "# Development Mode",
    ];
    const missingHeaders = sentinelHeaders.filter((h) => !content.includes(h));
    expect(missingHeaders).toEqual([]);
  });

  describe("edge cases handling in parser", () => {
    it("should ignore comments and blank lines", () => {
      const tmp = `
# comment
FOO=bar

# another
BAZ=qux
`;
      const parsed = parseEnv(tmp);
      expect(Array.from(parsed.keys())).toEqual(["FOO", "BAZ"]);
    });

    it("should accept empty values (placeholders)", () => {
      const tmp = `EMPTY=\nNONEMPTY=value`;
      const parsed = parseEnv(tmp);
      expect(parsed.get("EMPTY")).toBe("");
      expect(parsed.get("NONEMPTY")).toBe("value");
    });

    it("keeps last value on duplicate keys but duplicates are reported elsewhere", () => {
      const tmp = `DUP=a\nDUP=b`;
      const parsed = parseEnv(tmp);
      expect(parsed.get("DUP")).toBe("b");
      const dupes = collectDuplicates(tmp);
      expect(dupes).toEqual(["DUP"]);
    });
  });
});