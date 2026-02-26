import http from 'node:http';
import { URL } from 'node:url';
import { analyticsConfig, ensureDbDir } from './config.mjs';
import { AnalyticsStore } from './analytics-store.mjs';
import { GeoResolver } from './geoip.mjs';
import { AnalyticsCache } from './cache.mjs';
import { getRange } from './range.mjs';

const sendJson = (res, status, payload, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(payload));
};

const parseJsonBody = (req) => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', (chunk) => {
    data += chunk;
    if (data.length > 32 * 1024) {
      reject(new Error('Payload too large'));
      req.destroy();
    }
  });
  req.on('end', () => {
    try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Invalid JSON')); }
  });
  req.on('error', reject);
});

const getClientType = (ua = '') => (/mobile|android|iphone/i.test(ua) ? 'mobile' : (ua ? 'desktop' : 'unknown'));
const getIp = (req) => (typeof req.headers['x-forwarded-for'] === 'string'
  ? req.headers['x-forwarded-for'].split(',')[0].trim()
  : req.socket.remoteAddress || null);

let store = null;
let geoResolver = null;
let cache = null;
if (analyticsConfig.enabled) {
  store = new AnalyticsStore({ dbPath: analyticsConfig.dbPath, dbDir: ensureDbDir(), retentionDays: analyticsConfig.retentionDays });
  store.purgeOldEvents();
  geoResolver = new GeoResolver();
  cache = new AnalyticsCache(analyticsConfig.cacheTtlMs);
}

const checkAccess = (reqUrl, req, res) => {
  if (!analyticsConfig.enabled) return sendJson(res, 404, { error: 'not found' }), false;
  if (!analyticsConfig.dashboardToken) return sendJson(res, 401, { error: 'dashboard token not configured' }), false;
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  const token = bearer || reqUrl.searchParams.get('token');
  if (token !== analyticsConfig.dashboardToken) return sendJson(res, 401, { error: 'unauthorized' }), false;
  return true;
};

const buildDashboardHtml = (systemInfo) => `<!doctype html><html><head><meta charset="utf-8"><title>SendWindow Analytics</title>
<style>body{font-family:system-ui;padding:24px;background:#f8fafc}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card{background:#fff;padding:14px;border-radius:10px}table{width:100%;border-collapse:collapse;background:#fff}td,th{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}</style>
</head><body><h1>Analytics Dashboard</h1><div id="app">Loading...</div>
<script>
window.__ANALYTICS_SYSTEM__=${JSON.stringify(systemInfo)};
window.__ANALYTICS_CONFIG__=${JSON.stringify({ retentionDays: analyticsConfig.retentionDays, dbPath: analyticsConfig.dbPath })};
const params=new URLSearchParams(location.search);const token=params.get('token')||'';const range=params.get('range')||'30d';
const headers=token?{Authorization:'Bearer '+token}:{};
Promise.all([
fetch('/api/admin/analytics/summary?range='+range+'&token='+encodeURIComponent(token),{headers}).then(r=>r.json()),
fetch('/api/admin/analytics/daily?range='+range+'&token='+encodeURIComponent(token),{headers}).then(r=>r.json()),
fetch('/api/admin/analytics/top-cities?range='+range+'&token='+encodeURIComponent(token),{headers}).then(r=>r.json())
]).then(([summary,daily,cities])=>{
const system=window.__ANALYTICS_SYSTEM__, cfg=window.__ANALYTICS_CONFIG__;
const trend=(daily||[]).map(x=>'<tr><td>'+x.day+'</td><td>'+x.searches+'</td><td>'+Math.round(x.avg_latency_ms)+'</td></tr>').join('')||'<tr><td colspan="3">No data</td></tr>';
const top=(cities||[]).map(x=>'<tr><td>'+x.city+'</td><td>'+x.country+'</td><td>'+x.searches+'</td><td>'+Number(x.percent).toFixed(1)+'%</td></tr>').join('')||'<tr><td colspan="4">No data</td></tr>';
const cards='<div class="grid">'+
'<div class="card"><strong>Total searches</strong><div>'+(summary.total_searches||0)+'</div></div>'+
'<div class="card"><strong>Avg/day</strong><div>'+Number(summary.avg_searches_per_day||0).toFixed(2)+'</div></div>'+
'<div class="card"><strong>Avg latency</strong><div>'+Math.round(summary.avg_latency||0)+'ms</div></div>'+
'<div class="card"><strong>Max latency</strong><div>'+(summary.max_latency||0)+'ms</div></div>'+
'<div class="card"><strong>Retention</strong><div>'+cfg.retentionDays+' days</div></div>'+
'<div class="card"><strong>Oldest event</strong><div>'+(system.oldest_event_ts||'n/a')+'</div></div>'+
'<div class="card"><strong>Total stored events</strong><div>'+system.total_events+'</div></div>'+
'<div class="card"><strong>DB path</strong><div>'+cfg.dbPath+'</div></div></div>';
document.getElementById('app').innerHTML=cards+'<h2>Daily trend</h2><table><thead><tr><th>Date</th><th>Searches</th><th>Avg latency (ms)</th></tr></thead><tbody>'+trend+'</tbody></table><h2>Top locations</h2><table><thead><tr><th>City</th><th>Country</th><th>Searches</th><th>%</th></tr></thead><tbody>'+top+'</tbody></table>';
}).catch(()=>{document.getElementById('app').textContent='Failed to load analytics';});
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'POST' && reqUrl.pathname === '/api/analytics/search') {
    if (!analyticsConfig.enabled) return sendJson(res, 404, { error: 'analytics disabled' });
    try {
      const body = await parseJsonBody(req);
      const geo = await geoResolver.resolve(getIp(req));
      store.logSearchEvent({
        route: body.route || '/search',
        result_count: body.result_count,
        latency_ms: body.latency_ms,
        query_len: body.query_len,
        query_token_count: body.query_token_count,
        city: geo.city,
        country: geo.country,
        client_type: getClientType(req.headers['user-agent']),
        app_version: body.app_version,
      });
      res.writeHead(204); return res.end();
    } catch (error) {
      return sendJson(res, 400, { error: String(error.message || error) });
    }
  }

  if (req.method === 'GET' && reqUrl.pathname.startsWith('/api/admin/analytics/')) {
    if (!checkAccess(reqUrl, req, res)) return;
    const range = getRange(reqUrl.searchParams);
    if (range.error) return sendJson(res, 400, { error: range.error });

    const { from, to, cacheKey } = range;
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    let key = '';
    let payload = null;
    if (reqUrl.pathname === '/api/admin/analytics/summary') {
      key = `summary:${cacheKey}`;
      payload = cache.get(key) || store.summary(fromIso, toIso);
    } else if (reqUrl.pathname === '/api/admin/analytics/daily') {
      key = `daily:${cacheKey}`;
      payload = cache.get(key) || store.daily(fromIso, toIso);
    } else if (reqUrl.pathname === '/api/admin/analytics/top-cities') {
      key = `cities:${cacheKey}`;
      payload = cache.get(key) || store.topCities(fromIso, toIso);
    } else {
      return sendJson(res, 404, { error: 'not found' });
    }
    cache.set(key, payload);
    return sendJson(res, 200, payload, { 'Cache-Control': 'no-store' });
  }

  if (req.method === 'GET' && reqUrl.pathname === '/admin/analytics') {
    if (!checkAccess(reqUrl, req, res)) return;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(buildDashboardHtml(store.systemInfo()));
  }

  return sendJson(res, 404, { error: 'not found' });
});

const port = Number.parseInt(process.env.PORT || '8787', 10);
server.listen(port, () => console.log(`[analytics] listening on :${port}`));
