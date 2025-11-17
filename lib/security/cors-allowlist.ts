const STATIC_ALLOWED_ORIGINS = [
  'https://fixzit.sa',
  'https://www.fixzit.sa',
  'https://app.fixzit.sa',
  'https://dashboard.fixzit.sa',
  'https://staging.fixzit.sa',
];

const DEV_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'] as const;

function parseOrigins(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildAllowedOrigins(): string[] {
  const envOrigins = parseOrigins(process.env.CORS_ORIGINS);
  const frontendOrigins = parseOrigins(process.env.FRONTEND_URL);
  return Array.from(new Set([...STATIC_ALLOWED_ORIGINS, ...frontendOrigins, ...envOrigins]));
}

export function getAllowedOriginsSet(): Set<string> {
  return new Set(buildAllowedOrigins());
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  const allowedOrigins = getAllowedOriginsSet();
  if (allowedOrigins.has(origin)) {
    return true;
  }
  return process.env.NODE_ENV !== 'production' && DEV_ALLOWED_ORIGINS.includes(origin as (typeof DEV_ALLOWED_ORIGINS)[number]);
}

export function resolveAllowedOrigin(origin: string | null): string | undefined {
  if (origin) {
    const allowedOrigins = getAllowedOriginsSet();
    if (allowedOrigins.has(origin)) {
      return origin;
    }
    if (process.env.NODE_ENV !== 'production' && DEV_ALLOWED_ORIGINS.includes(origin as (typeof DEV_ALLOWED_ORIGINS)[number])) {
      return origin;
    }
    return undefined;
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEV_ALLOWED_ORIGINS[0];
  }

  return undefined;
}

export { STATIC_ALLOWED_ORIGINS, DEV_ALLOWED_ORIGINS };
