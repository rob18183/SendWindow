import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const runSql = (dbPath, sql, params = []) => {
  const script = `
import sqlite3, json
conn = sqlite3.connect(${JSON.stringify(dbPath)})
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute(${JSON.stringify(sql)}, json.loads(${JSON.stringify(JSON.stringify(params))}))
if ${sql.trim().toUpperCase().startsWith('SELECT') ? 'True' : 'False'}:
    rows=[dict(r) for r in cur.fetchall()]
    print(json.dumps(rows))
else:
    conn.commit()
    print(json.dumps({'changes': cur.rowcount}))
conn.close()
`;
  const proc = spawnSync('python3', ['-c', script], { encoding: 'utf8' });
  if (proc.status !== 0) {
    throw new Error(proc.stderr || 'sqlite command failed');
  }
  return JSON.parse(proc.stdout.trim() || 'null');
};

export class AnalyticsStore {
  constructor(config) {
    fs.mkdirSync(config.dbDir, { recursive: true });
    this.config = config;
    this.setup();
  }

  setup() {
    runSql(this.config.dbPath, `CREATE TABLE IF NOT EXISTS analytics_events (
      event_id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      event_type TEXT NOT NULL,
      route TEXT NOT NULL,
      result_count INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      query_len INTEGER NOT NULL,
      query_token_count INTEGER NULL,
      city TEXT NOT NULL,
      country TEXT NULL,
      client_type TEXT NOT NULL,
      app_version TEXT NULL
    )`);
    runSql(this.config.dbPath, 'CREATE INDEX IF NOT EXISTS idx_ts ON analytics_events(ts)');
    runSql(this.config.dbPath, 'CREATE INDEX IF NOT EXISTS idx_event_ts ON analytics_events(event_type, ts)');
    runSql(this.config.dbPath, 'CREATE INDEX IF NOT EXISTS idx_city_ts ON analytics_events(city, ts)');
  }

  purgeOldEvents() {
    const threshold = new Date(Date.now() - this.config.retentionDays * 86400000).toISOString();
    const result = runSql(this.config.dbPath, 'DELETE FROM analytics_events WHERE ts < ?', [threshold]);
    console.log(`[analytics] Purged ${result.changes} events older than ${threshold}`);
    return result.changes;
  }

  logSearchEvent(event) {
    runSql(this.config.dbPath, `INSERT INTO analytics_events (
      event_id, ts, event_type, route, result_count, latency_ms,
      query_len, query_token_count, city, country, client_type, app_version
    ) VALUES (?, ?, 'search_performed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      crypto.randomUUID(),
      new Date().toISOString(),
      event.route || '/search',
      Math.max(0, Number(event.result_count ?? 0)),
      Math.max(0, Number(event.latency_ms ?? 0)),
      Math.max(0, Number(event.query_len ?? 0)),
      event.query_token_count == null ? null : Math.max(0, Number(event.query_token_count)),
      event.city || 'unknown',
      event.country || null,
      event.client_type || 'unknown',
      event.app_version || null,
    ]);
  }

  summary(from, to) {
    const totals = runSql(this.config.dbPath, `SELECT
      COUNT(*) as total_searches,
      COALESCE(AVG(latency_ms), 0) as avg_latency,
      COALESCE(MAX(latency_ms), 0) as max_latency
      FROM analytics_events
      WHERE event_type = 'search_performed' AND ts >= ? AND ts < ?`, [from, to])[0] || { total_searches: 0, avg_latency: 0, max_latency: 0 };
    const topCities = runSql(this.config.dbPath, `SELECT city, COUNT(*) as searches
      FROM analytics_events
      WHERE event_type = 'search_performed' AND ts >= ? AND ts < ?
      GROUP BY city
      ORDER BY searches DESC
      LIMIT 5`, [from, to]);
    const days = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
    return { ...totals, avg_searches_per_day: Number(totals.total_searches) / days, top_cities: topCities };
  }

  daily(from, to) {
    return runSql(this.config.dbPath, `SELECT substr(ts,1,10) as day, COUNT(*) as searches,
      COALESCE(AVG(latency_ms),0) as avg_latency_ms
      FROM analytics_events
      WHERE event_type = 'search_performed' AND ts >= ? AND ts < ?
      GROUP BY day ORDER BY day ASC`, [from, to]);
  }

  topCities(from, to) {
    const total = (runSql(this.config.dbPath, `SELECT COUNT(*) as total FROM analytics_events
      WHERE event_type = 'search_performed' AND ts >= ? AND ts < ?`, [from, to])[0] || { total: 0 }).total;
    const rows = runSql(this.config.dbPath, `SELECT city, COALESCE(country,'unknown') as country, COUNT(*) as searches
      FROM analytics_events
      WHERE event_type = 'search_performed' AND ts >= ? AND ts < ?
      GROUP BY city, country ORDER BY searches DESC LIMIT 100`, [from, to]);
    return rows.map((r) => ({ ...r, percent: total ? (r.searches / total) * 100 : 0 }));
  }

  systemInfo() {
    const oldest = runSql(this.config.dbPath, 'SELECT ts FROM analytics_events ORDER BY ts ASC LIMIT 1');
    const total = runSql(this.config.dbPath, 'SELECT COUNT(*) as count FROM analytics_events');
    return { oldest_event_ts: oldest[0]?.ts ?? null, total_events: total[0]?.count ?? 0 };
  }
}
