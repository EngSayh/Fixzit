import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { logger } from "@/lib/logger";

interface SecretValue {
  [key: string]: string;
}

class AWSSecretsManager {
  private client: SecretsManagerClient;
  private cache = new Map<string, { value: SecretValue; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(region = "me-south-1") {
    this.client = new SecretsManagerClient({ region });
  }

  async getSecret(secretName: string): Promise<SecretValue> {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`No secret string found for ${secretName}`);
      }

      const secretValue = JSON.parse(response.SecretString);

      // Cache the result
      this.cache.set(secretName, {
        value: secretValue,
        timestamp: Date.now(),
      });

      return secretValue;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error(`Failed to retrieve secret ${secretName}:`, { error });
      throw error;
    }
  }

  async getJWTSecret(environment = "production"): Promise<string> {
    const secrets = await this.getSecret(`fixzit-jwt-${environment}`);
    return secrets.JWT_SECRET;
  }

  async getDatabaseSecrets(environment = "production"): Promise<SecretValue> {
    return await this.getSecret(`fixzit-database-${environment}`);
  }

  async getPaymentSecrets(environment = "production"): Promise<SecretValue> {
    return await this.getSecret(`fixzit-payments-${environment}`);
  }

  async getCommunicationSecrets(
    environment = "production",
  ): Promise<SecretValue> {
    return await this.getSecret(`fixzit-communications-${environment}`);
  }

  // Invalidate cache for a specific secret
  invalidateCache(secretName: string): void {
    this.cache.delete(secretName);
  }

  // Clear all cached secrets
  clearCache(): void {
    this.cache.clear();
  }
}

export default AWSSecretsManager;

// Example usage:
// const secretsManager = new AWSSecretsManager();
// const jwtSecret = await secretsManager.getJWTSecret();
// const dbSecrets = await secretsManager.getDatabaseSecrets();
