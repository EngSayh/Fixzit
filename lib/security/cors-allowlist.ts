import { logSecurityEvent } from '@/lib/monitoring/security-events';
import { logger } from '@/lib/logger';

const STATIC_ALLOWED_ORIGINS = [
  // Production (.co)
  'https://fixzit.co',
  'https://www.fixzit.co',
  'https://app.fixzit.co',
  'https://dashboard.fixzit.co',
  'https://staging.fixzit.co',
  'https://api.fixzit.co',

  // Legacy/secondary (.sa)
  'https://fixzit.sa',
  'https://www.fixzit.sa',
  'https://app.fixzit.sa',
  'https://dashboard.fixzit.sa',
  'https://staging.fixzit.sa',
  'https://api.fixzit.sa',
];

const DEV_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'] as const;

export function parseOrigins(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => {
      // Validate URL structure
      try {
        const url = new URL(origin);
        // Only allow http/https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('Invalid protocol in origin', { component: 'CORS', origin, protocol: url.protocol });
          }
          return false;
        }
        // Disallow localhost in production CORS_ORIGINS
        if (process.env.NODE_ENV === 'production' && 
            (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('Localhost not allowed in production CORS_ORIGINS', { component: 'CORS', origin });
          }
          return false;
        }
        return true;
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Invalid URL in CORS_ORIGINS', { component: 'CORS', origin, error: err });
        }
        return false;
      }
    });
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
  // No Origin header behavior:
  // - Development: Allow (same-origin requests from localhost)
  // - Production: Reject for security (enforce explicit origin validation)
  if (!origin) {
    return process.env.NODE_ENV !== 'production';
  }
  const allowedOrigins = getAllowedOriginsSet();
  if (allowedOrigins.has(origin)) {
    return true;
  }
  const allowDev = process.env.NODE_ENV !== 'production' && DEV_ALLOWED_ORIGINS.includes(origin as (typeof DEV_ALLOWED_ORIGINS)[number]);
  if (!allowDev) {
    logSecurityEvent({
      type: 'cors_block',
      ip: 'unknown',
      path: origin,
      timestamp: new Date().toISOString(),
      metadata: { origin },
    }).catch(() => undefined);
  }
  return allowDev;
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
