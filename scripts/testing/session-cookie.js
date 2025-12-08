/**
 * Test session cookie helper for NextAuth-compatible JWTs.
 * Reused by HTTP runners and Playwright setup to avoid duplicating mint logic.
 */
const { encode: encodeJwt } = require("next-auth/jwt");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function mintSessionCookie({ email, role, orgId }) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET (or AUTH_SECRET) is required to mint session cookies");
  }

  const token = await encodeJwt({
    secret,
    maxAge: 30 * 24 * 60 * 60,
    token: {
      id: email,
      sub: email,
      email,
      role,
      roles: [role],
      orgId: orgId || process.env.TEST_ORG_ID || "test-org",
      passwordSet: true,
    },
  });

  return {
    token,
    cookies: [
      `${process.env.BASE_URL && process.env.BASE_URL.startsWith("https") ? "__Secure-authjs.session-token" : "authjs.session-token"}=${token}; Path=/; HttpOnly; SameSite=Lax`,
      `${process.env.BASE_URL && process.env.BASE_URL.startsWith("https") ? "__Secure-next-auth.session-token" : "next-auth.session-token"}=${token}; Path=/; HttpOnly; SameSite=Lax`,
    ],
  };
}

module.exports = { mintSessionCookie, requireEnv };
