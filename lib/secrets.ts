import { logger } from '@/lib/logger';
/**
 * AWS Secrets Manager Integration
 * Securely retrieves sensitive configuration from AWS Secrets Manager
 * Falls back to environment variables for development
 */

import { randomBytes } from 'crypto';
import { 
  SecretsManagerClient, 
  GetSecretValueCommand 
} from '@aws-sdk/client-secrets-manager';

// Cached secrets to avoid repeated AWS API calls
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let secretsClient: SecretsManagerClient | null = null;

/**
 * Initialize AWS Secrets Manager client
 * Only initializes in production with proper AWS credentials
 */
function getSecretsClient(): SecretsManagerClient | null {
  if (secretsClient) {
    return secretsClient;
  }

  // Initialize if AWS region is configured
  // Let AWS SDK use its default credential provider chain:
  // - ECS/EKS task role metadata
  // - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // - Shared credentials file (~/.aws/credentials)
  // - EC2 instance metadata
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  if (!region) {
    return null;
  }

  secretsClient = new SecretsManagerClient({
    region,
    // Only provide explicit credentials if both are present
    credentials: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      : undefined // Use AWS SDK default credential provider chain
  });
  
  logger.info('[Secrets] AWS Secrets Manager initialized', { region });
  return secretsClient;
}

/**
 * Get a secret value from AWS Secrets Manager or environment variables
 * 
 * Priority order:
 * 1. AWS Secrets Manager (production only, with caching)
 * 2. Environment variables (all environments)
 * 3. Error if not found and required
 * 
 * @param secretName - The name of the secret (e.g., 'JWT_SECRET', 'prod/fixzit/jwt-secret')
 * @param envFallback - Environment variable name to use as fallback
 * @param required - Whether the secret is required (throws if not found)
 * @returns The secret value or null if not found and not required
 */
export async function getSecret(
  secretName: string,
  envFallback?: string,
  required: boolean = false
): Promise<string | null> {
  try {
    // Check cache first
    const cached = secretCache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Try AWS Secrets Manager in production
    const client = getSecretsClient();
    if (client) {
      try {
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const response = await client.send(command);
        
        const secretValue = response.SecretString || 
          (response.SecretBinary ? Buffer.from(response.SecretBinary).toString('utf-8') : null);
        
        if (secretValue) {
          // Cache the secret
          secretCache.set(secretName, {
            value: secretValue,
            expiresAt: Date.now() + CACHE_TTL
          });
          
          if (process.env.NODE_ENV !== 'production') {
            logger.info('[Secrets] Retrieved from AWS Secrets Manager', { secretName });
          }
          return secretValue;
        }
      } catch (awsError) {
        const errorMessage = awsError instanceof Error ? awsError.message : String(awsError);
        logger.warn('[Secrets] Failed to retrieve from AWS', { secretName, errorMessage });
        // Fall through to environment variable fallback
      }
    }

    // Fallback to environment variable
    if (envFallback) {
      const envValue = process.env[envFallback]?.trim();
      if (envValue) {
        if (process.env.NODE_ENV !== 'production') {
          logger.info('[Secrets] Using environment variable', { envKey: envFallback });
        }
        return envValue;
      }
    }

    // Not found
    if (required) {
      const errorMessage = `Required secret '${secretName}' not found in AWS Secrets Manager` + 
        (envFallback ? ` or environment variable '${envFallback}'` : '');
      throw new Error(errorMessage);
    }

    return null;
  } catch (error) {
    if (required) {
      logger.error('[Secrets] Failed to retrieve required secret', { secretName, error });
      throw error;
    }
    logger.warn('[Secrets] Failed to retrieve optional secret', { secretName });
    return null;
  }
}

/**
 * Get JWT secret with proper priority handling
 * 
 * Priority:
 * 1. AWS Secrets Manager: prod/fixzit/jwt-secret (production)
 * 2. Environment: JWT_SECRET (all environments)
 * 3. Error in production, ephemeral in development
 */
export async function getJWTSecret(): Promise<string> {
  // Try AWS Secrets Manager first (production only)
  const awsSecretName = process.env.JWT_SECRET_NAME || 'prod/fixzit/jwt-secret';
  const secret = await getSecret(awsSecretName, 'JWT_SECRET', false);
  
  if (secret) {
    return secret;
  }

  // Production MUST have JWT_SECRET configured
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `JWT_SECRET is required in production. Configure it in AWS Secrets Manager (using secret name '${awsSecretName}') or as environment variable 'JWT_SECRET'.`
    );
  }

  // Development fallback - generate ephemeral secret
  logger.warn('[Secrets] No JWT_SECRET configured. Using ephemeral secret for development.');
  logger.warn('[Secrets] Set JWT_SECRET environment variable for session persistence.');
  
  return randomBytes(32).toString('hex');
}

/**
 * Get database connection string with proper security
 */
export async function getDatabaseURL(): Promise<string> {
  const secret = await getSecret(
    process.env.DB_SECRET_NAME || 'prod/fixzit/mongodb-uri',
    'MONGODB_URI',
    true
  );
  
  if (!secret) {
    throw new Error('Database connection string is required');
  }
  
  return secret;
}

/**
 * Get SendGrid API key with proper security
 */
export async function getSendGridAPIKey(): Promise<string | null> {
  return getSecret(
    process.env.SENDGRID_SECRET_NAME || 'prod/fixzit/sendgrid-api-key',
    'SENDGRID_API_KEY',
    false
  );
}

/**
 * Clear the secret cache (useful for testing or forced refresh)
 */
export function clearSecretCache(): void {
  secretCache.clear();
  logger.info('[Secrets] Cache cleared');
}
