import path from 'node:path';

const asBool = (value, fallback) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const asInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const analyticsConfig = {
  enabled: asBool(process.env.ANALYTICS_ENABLED, true),
  dbPath: process.env.ANALYTICS_DB_PATH || '/var/lib/sendwindow/analytics.sqlite',
  retentionDays: asInt(process.env.ANALYTICS_RETENTION_DAYS, 90),
  geoipProvider: process.env.ANALYTICS_GEOIP_PROVIDER || 'maxmind',
  geoipDbPath: process.env.ANALYTICS_GEOIP_DB_PATH,
  queryHashEnabled: asBool(process.env.ANALYTICS_QUERY_HASH_ENABLED, false),
  requireConsent: asBool(process.env.ANALYTICS_REQUIRE_CONSENT, false),
  dashboardToken: process.env.ANALYTICS_DASHBOARD_TOKEN || '',
  cacheTtlMs: 60_000,
};

export const ensureDbDir = () => path.dirname(analyticsConfig.dbPath);
