import { logger } from '@/lib/logger';

type MetricsWebhookPayload = {
  duplicationRate: number;
  generatedAt: string;
  aliasFiles: number;
};

export async function postRouteMetricsWebhook(payload: MetricsWebhookPayload) {
  const webhookUrl = process.env.ROUTE_METRICS_SLACK_WEBHOOK;
  const message = `Route alias duplication is down to ${payload.duplicationRate.toFixed(
    2
  )}% across ${payload.aliasFiles} aliases (generated ${payload.generatedAt}).`;

  if (!webhookUrl) {
    logger.info('Route metrics webhook (dry-run)', { ...payload, message });
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to post route metrics webhook', {
        status: response.status,
        error: errorText,
      });
    }
  } catch (error) {
    logger.error('Error posting route metrics webhook', { error });
  }
}
