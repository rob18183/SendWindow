const enabled = (import.meta.env.VITE_ANALYTICS_ENABLED ?? 'true') !== 'false';
const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT ?? '/api/analytics/search';

export type SearchAnalyticsEvent = {
  route: string;
  result_count: number;
  latency_ms: number;
  query_len: number;
  query_token_count?: number;
  app_version?: string;
};

export async function logSearchAnalytics(event: SearchAnalyticsEvent): Promise<void> {
  if (!enabled) return;
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Intentionally ignore analytics transport failures.
  }
}
