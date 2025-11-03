/**
 * AWS Secrets Manager Integration
 * Securely retrieves sensitive configuration from AWS Secrets Manager
 * Falls back to environment variables for development
 */

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

  // Only use AWS Secrets Manager in production with credentials configured
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.AWS_REGION &&
    (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI)
  ) {
    secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION,
      credentials: process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      } : undefined // Use ECS task role if no explicit credentials
    });
    
    console.log('[Secrets] AWS Secrets Manager initialized for region:', process.env.AWS_REGION);
    return secretsClient;
  }

  return null;
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
          
          console.log('[Secrets] Retrieved from AWS Secrets Manager:', secretName);
          return secretValue;
        }
      } catch (awsError) {
        console.warn('[Secrets] Failed to retrieve from AWS:', secretName, awsError);
        // Fall through to environment variable fallback
      }
    }

    // Fallback to environment variable
    if (envFallback) {
      const envValue = process.env[envFallback]?.trim();
      if (envValue) {
        console.log('[Secrets] Using environment variable:', envFallback);
        return envValue;
      }
    }

    // Not found
    if (required) {
      throw new Error(
        `Required secret '${secretName}' not found in AWS Secrets Manager or environment variable '${envFallback}'`
      );
    }

    return null;
  } catch (error) {
    if (required) {
      console.error('[Secrets] Failed to retrieve required secret:', secretName, error);
      throw error;
    }
    console.warn('[Secrets] Failed to retrieve optional secret:', secretName);
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
      'JWT_SECRET is required in production. ' +
      'Configure it in AWS Secrets Manager or as environment variable.'
    );
  }

  // Development fallback - generate ephemeral secret
  console.warn('[Secrets] No JWT_SECRET configured. Using ephemeral secret for development.');
  console.warn('[Secrets] Set JWT_SECRET environment variable for session persistence.');
  
  const { randomBytes } = await import('crypto');
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
  console.log('[Secrets] Cache cleared');
}
