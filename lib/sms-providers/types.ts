/**
 * SMS Provider Type Definitions
 *
 * Shared types for all SMS provider implementations.
 */

/**
 * Supported SMS provider types
 */
export type SMSProviderType = "twilio" | "unifonic" | "mock";

/**
 * SMS delivery status codes
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
 * Result from sending an SMS
 */
export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: SMSProviderType;
  to?: string;
  timestamp?: Date;
  /** Raw response from provider for debugging */
  rawResponse?: unknown;
}

/**
 * Result from checking SMS delivery status
 */
export interface SMSStatusResult {
  status: SMSDeliveryStatus;
  messageId?: string;
  error?: string;
  updatedAt?: Date;
  createdAt?: Date;
  sentAt?: Date;
  errorCode?: string | number;
  errorMessage?: string;
}

/**
 * Result from sending bulk SMS messages
 */
export interface BulkSMSResult {
  total?: number;
  successful?: number;
  failed: number;
  /** Alias for successful - for backward compatibility */
  sent: number;
  results: SMSResult[];
}

/**
 * Options for initializing an SMS provider
 */
export interface SMSProviderOptions {
  /** Force development/mock mode */
  devMode?: boolean;
  /** Override default timeout in milliseconds */
  timeoutMs?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * SMS Provider Interface
 *
 * All SMS providers must implement this interface.
 */
export interface SMSProvider {
  /** Provider name identifier */
  readonly name: SMSProviderType;

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Send a single SMS message
   * @param to Recipient phone number (E.164 format preferred)
   * @param message SMS message content
   */
  sendSMS(to: string, message: string): Promise<SMSResult>;

  /**
   * Send an OTP verification code
   * @param to Recipient phone number
   * @param code The OTP code to send
   * @param expiresInMinutes How long the code is valid
   */
  sendOTP?(
    to: string,
    code: string,
    expiresInMinutes?: number,
  ): Promise<SMSResult>;

  /**
   * Send bulk SMS messages
   * @param recipients Array of phone numbers
   * @param message SMS message content
   */
  sendBulk?(recipients: string[], message: string): Promise<BulkSMSResult>;

  /**
   * Check delivery status of a sent message
   * @param messageId The message ID from sendSMS result
   */
  getStatus?(messageId: string): Promise<SMSStatusResult | null>;

  /**
   * Test if the provider configuration is valid
   */
  testConfiguration?(): Promise<boolean>;
}
