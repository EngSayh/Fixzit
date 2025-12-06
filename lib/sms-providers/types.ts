/**
 * SMS Provider Types
 *
 * Unified interface for SMS providers to enable easy switching
 * between Twilio, Unifonic, and other providers.
 */

/**
 * Result of an SMS send operation
 */
export interface SMSResult {
  success: boolean;
  /** Provider-specific message ID for tracking */
  messageId?: string;
  /** Error message if send failed */
  error?: string;
  /** Raw provider response for debugging */
  rawResponse?: unknown;
}

/**
 * Result of a status check operation
 */
export interface SMSStatusResult {
  /** Current delivery status */
  status: SMSDeliveryStatus;
  /** When the message was created/queued */
  createdAt: Date;
  /** When the message was actually sent */
  sentAt?: Date;
  /** Provider-specific error code */
  errorCode?: string | number;
  /** Human-readable error message */
  errorMessage?: string;
}

/**
 * Standardized delivery status across providers
 */
export type SMSDeliveryStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "undelivered"
  | "unknown";

/**
 * Bulk SMS send result
 */
export interface BulkSMSResult {
  /** Number of messages successfully queued/sent */
  sent: number;
  /** Number of messages that failed */
  failed: number;
  /** Individual results for each recipient */
  results: Array<SMSResult & { recipient: string }>;
}

/**
 * SMS Provider interface
 * All SMS providers must implement this interface
 */
export interface SMSProvider {
  /** Provider name for logging and debugging */
  readonly name: string;

  /**
   * Check if the provider is properly configured
   * (has all required environment variables)
   */
  isConfigured(): boolean;

  /**
   * Send a single SMS message
   * @param to - Recipient phone number (will be formatted by provider)
   * @param message - Message body
   */
  sendSMS(to: string, message: string): Promise<SMSResult>;

  /**
   * Get the delivery status of a sent message
   * @param messageId - Provider-specific message ID returned from sendSMS
   */
  getStatus?(messageId: string): Promise<SMSStatusResult | null>;

  /**
   * Test provider configuration by making a validation call
   * (Does NOT send a real message)
   */
  testConfiguration?(): Promise<boolean>;
}

/**
 * Supported SMS provider types
 */
export type SMSProviderType = "twilio" | "unifonic" | "mock";

/**
 * Provider factory options
 */
export interface SMSProviderOptions {
  /** Override provider type (default: from SMS_PROVIDER env var) */
  provider?: SMSProviderType;
  /** Force dev/mock mode regardless of environment */
  forceDevMode?: boolean;
}
