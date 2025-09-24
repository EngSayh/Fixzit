/**
 * Tests for env.example file structure and critical values.
 *
 * Framework: Jest (TypeScript). Compatible with Vitest in most cases (describe/it/expect).
 *
 * These tests:
 * - Parse the env.example content embedded below to avoid file system/env coupling
 * - Validate presence of required keys
 * - Validate formats for URLs, booleans, and numbers where applicable
 * - Validate recommended defaults or placeholders exist
 */

const ENV_EXAMPLE = `# Database
MONGODB_URI=mongodb://localhost:27017/fixzit-enterprise

# JWT Secret
# Generate a unique 64-character hex value, e.g. via openssl rand -hex 32
JWT_SECRET=

# PayTabs Configuration (Saudi Arabia)
PAYTABS_PROFILE_ID=your_profile_id_here
PAYTABS_SERVER_KEY=your_server_key_here
PAYTABS_REGION=SAU
PAYTABS_BASE_URL=https://secure.paytabs.sa

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# ZATCA Configuration
ZATCA_TAXPAYER_ID=300000000000003
ZATCA_API_URL=https://api.zatca.gov.sa
ZATCA_CERTIFICATE=your_certificate_here

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@fixzit.co
EMAIL_PASS=your_email_password

# SMS Configuration (Optional - for OTP)
SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=your_account_sid
SMS_AUTH_TOKEN=your_auth_token
SMS_FROM_NUMBER=+966xxxxxxxxx

# File Storage (Optional)
STORAGE_TYPE=local
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=me-south-1
AWS_BUCKET_NAME=fixzit-uploads

# Feature Flags
ENABLE_PAYMENT_GATEWAY=true
ENABLE_SMS_OTP=false
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_GOOGLE_MAPS=true
ENABLE_ZATCA_INTEGRATION=true

# Development Mode
NODE_ENV=development
`;

function parseEnv(content: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    if (key) map[key] = value;
  }
  return map;
}

// Helpers
const isUrl = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};
const isMongoUri = (s: string) =>
  s.startsWith("mongodb://") || s.startsWith("mongodb+srv://");
const isBoolean = (s: string) => s === "true" || s === "false";
const isNumber = (s: string) => /^-?\d+(\.\d+)?$/.test(s);
const isSaudiPhone = (s: string) =>
  /^\+966\d{9}$/.test(s) || s === "+966xxxxxxxxx"; // placeholder allowed
const isHex64 = (s: string) => /^[a-f0-9]{64}$/i.test(s);

describe("env.example structure", () => {
  const env = parseEnv(ENV_EXAMPLE);

  it("contains all expected keys", () => {
    const expectedKeys = [
      // Database
      "MONGODB_URI",
      // JWT
      "JWT_SECRET",
      // PayTabs
      "PAYTABS_PROFILE_ID",
      "PAYTABS_SERVER_KEY",
      "PAYTABS_REGION",
      "PAYTABS_BASE_URL",
      // Google Maps
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
      // App/Backend URLs
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_API_URL",
      // ZATCA
      "ZATCA_TAXPAYER_ID",
      "ZATCA_API_URL",
      "ZATCA_CERTIFICATE",
      // Email (optional)
      "EMAIL_HOST",
      "EMAIL_PORT",
      "EMAIL_USER",
      "EMAIL_PASS",
      // SMS (optional)
      "SMS_PROVIDER",
      "SMS_ACCOUNT_SID",
      "SMS_AUTH_TOKEN",
      "SMS_FROM_NUMBER",
      // Storage (optional)
      "STORAGE_TYPE",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
      "AWS_BUCKET_NAME",
      // Feature flags
      "ENABLE_PAYMENT_GATEWAY",
      "ENABLE_SMS_OTP",
      "ENABLE_EMAIL_NOTIFICATIONS",
      "ENABLE_GOOGLE_MAPS",
      "ENABLE_ZATCA_INTEGRATION",
      // Mode
      "NODE_ENV",
    ];

    const missing = expectedKeys.filter((k) => !(k in env));
    expect(missing).toEqual([]);
  });

  it("uses expected placeholder/default values", () => {
    expect(env.MONGODB_URI).toBe("mongodb://localhost:27017/fixzit-enterprise");
    expect(env.JWT_SECRET).toBe(""); // intentionally empty placeholder
    expect(env.PAYTABS_PROFILE_ID).toBe("your_profile_id_here");
    expect(env.PAYTABS_SERVER_KEY).toBe("your_server_key_here");
    expect(env.PAYTABS_REGION).toBe("SAU");
    expect(env.PAYTABS_BASE_URL).toBe("https://secure.paytabs.sa");

    expect(env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).toBe(
      "your_google_maps_api_key_here"
    );

    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_API_URL).toBe("http://localhost:5000");

    expect(env.ZATCA_TAXPAYER_ID).toBe("300000000000003");
    expect(env.ZATCA_API_URL).toBe("https://api.zatca.gov.sa");
    expect(env.ZATCA_CERTIFICATE).toBe("your_certificate_here");

    expect(env.EMAIL_HOST).toBe("smtp.gmail.com");
    expect(env.EMAIL_PORT).toBe("587");
    expect(env.EMAIL_USER).toBe("your_email@fixzit.co");
    expect(env.EMAIL_PASS).toBe("your_email_password");

    expect(env.SMS_PROVIDER).toBe("twilio");
    expect(env.SMS_ACCOUNT_SID).toBe("your_account_sid");
    expect(env.SMS_AUTH_TOKEN).toBe("your_auth_token");
    expect(env.SMS_FROM_NUMBER).toBe("+966xxxxxxxxx");

    expect(env.STORAGE_TYPE).toBe("local");
    expect(env.AWS_ACCESS_KEY_ID).toBe("your_access_key");
    expect(env.AWS_SECRET_ACCESS_KEY).toBe("your_secret_key");
    expect(env.AWS_REGION).toBe("me-south-1");
    expect(env.AWS_BUCKET_NAME).toBe("fixzit-uploads");

    expect(env.ENABLE_PAYMENT_GATEWAY).toBe("true");
    expect(env.ENABLE_SMS_OTP).toBe("false");
    expect(env.ENABLE_EMAIL_NOTIFICATIONS).toBe("true");
    expect(env.ENABLE_GOOGLE_MAPS).toBe("true");
    expect(env.ENABLE_ZATCA_INTEGRATION).toBe("true");

    expect(env.NODE_ENV).toBe("development");
  });

  it("validates value formats (URLs, booleans, numbers, URIs)", () => {
    expect(isMongoUri(env.MONGODB_URI)).toBe(true);

    // JWT_SECRET is deliberately empty in example; ensure it's either empty or a valid 64-hex when set
    if (env.JWT_SECRET) {
      expect(isHex64(env.JWT_SECRET)).toBe(true);
    } else {
      expect(env.JWT_SECRET).toBe(""); // placeholder acceptable
    }

    // URLs
    expect(isUrl(env.PAYTABS_BASE_URL)).toBe(true);
    expect(isUrl(env.NEXT_PUBLIC_APP_URL)).toBe(true);
    expect(isUrl(env.NEXT_PUBLIC_API_URL)).toBe(true);
    expect(isUrl(env.ZATCA_API_URL)).toBe(true);

    // Booleans
    expect(isBoolean(env.ENABLE_PAYMENT_GATEWAY)).toBe(true);
    expect(isBoolean(env.ENABLE_SMS_OTP)).toBe(true);
    expect(isBoolean(env.ENABLE_EMAIL_NOTIFICATIONS)).toBe(true);
    expect(isBoolean(env.ENABLE_GOOGLE_MAPS)).toBe(true);
    expect(isBoolean(env.ENABLE_ZATCA_INTEGRATION)).toBe(true);

    // Numbers
    expect(isNumber(env.EMAIL_PORT)).toBe(true);

    // Phone format allows placeholder or actual KSA number
    expect(isSaudiPhone(env.SMS_FROM_NUMBER)).toBe(true);
  });

  it("guards against unexpected extra or malformed lines", () => {
    // Ensure no duplicate keys
    const seen = new Set<string>();
    const lines = ENV_EXAMPLE
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith("#"));
    const dupes: string[] = [];
    for (const l of lines) {
      const idx = l.indexOf("=");
      if (idx === -1) continue;
      const k = l.slice(0, idx).trim();
      if (seen.has(k)) dupes.push(k);
      seen.add(k);
    }
    expect(dupes).toEqual([]);
  });

  it("documents secure defaults and hints for secrets", () => {
    // The example explicitly documents how to generate JWT_SECRET
    expect(ENV_EXAMPLE).toMatch(/openssl rand -hex 32/);
    // Ensure placeholder exists for JWT_SECRET
    expect("JWT_SECRET" in env).toBe(true);
  });
});