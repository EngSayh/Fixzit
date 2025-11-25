declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  }

  interface SendNotificationOptions {
    TTL?: number;
    headers?: Record<string, string>;
    vapidDetails?: {
      subject?: string;
      publicKey?: string;
      privateKey?: string;
    };
    contentEncoding?: "aesgcm" | "aes128gcm";
    urgency?: "very-low" | "low" | "normal" | "high";
    topic?: string;
    proxy?: string;
    timeout?: number;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string,
  ): void;
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: SendNotificationOptions,
  ): Promise<{ statusCode: number; body: string }>;
}
