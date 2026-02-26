# SendWindow 🪁

A smart, modern kitesurf forecast application for the Netherlands. SendWindow calculates the best "window" to send it, based on real-time wind data and spot specificities.

## Features

-   **Smart Scoring**: Automatically rates spots (Green/Yellow/Red) based on wind speed, gusts, and direction relative to the spot's safe wind angles.
-   **Real-time Forecasts**: Powered by [Open-Meteo](https://open-meteo.com/) for accurate, hyper-local wind data.
-   **Spot Filtering**: Filter by radius, seasonality (Open Now), level (Beginner Friendly), and water type (Shallow).
-   **Duo Mode 🤝**: Planning a session with a buddy? Input two locations to find the fairest "compromise" spot that works for both of you.
-   **Driving Travel Times 🚗**: Estimates real driving duration using OSRM, cached for instant results.
-   **Live Webcams 📷**: View live feeds directly from spot cards like Zandvoort and Scheveningen.
-   **Visual Themes**: Beautiful, AI-generated themes for North Sea, Inland, and Action spots.
-   **Locally Persisted**: Remembers your location and filter preferences.
-   **Privacy Focused**: Anonymous analytics are built-in and self-hosted (no third-party tracker).

## Tech Stack

-   **Frontend**: React (v18), TypeScript, Vite
-   **State/Data**: TansStack Query (React Query) for caching and state management.
-   **Maps**: Leaflet & React-Leaflet.
-   **Styling**: Custom CSS variables, responsive implementation.
-   **Routing**: OSRM (Open Source Routing Machine) public API for driving times.
-   **Data Source**: NKV (Nederlandse Kitesurf Vereniging) public spot data.
-   **Analytics backend**: Built-in Node server + SQLite.

## Anonymous Analytics & Privacy

SendWindow collects anonymous usage metrics (search frequency, performance, and city-level location). No IP addresses, raw queries, or personal identifiers are stored. Analytics can be disabled via environment variable.

### What is collected

- One `search_performed` event per completed search interaction.
- Aggregated signal only: route, result count, latency, query length, optional query token count, client type, app version.
- Coarse location (`city`, optional `country`) resolved in-memory server-side; if unresolved, city is saved as `"unknown"`.

### What is explicitly not stored

- IP address
- Raw query text
- User-Agent string
- Referer
- Any unique user/session identifier

### Environment configuration

| Variable | Default | Description |
| --- | --- | --- |
| `ANALYTICS_ENABLED` | `true` | Master toggle for all analytics logging + dashboard |
| `ANALYTICS_DB_PATH` | `/var/lib/sendwindow/analytics.sqlite` | SQLite file path |
| `ANALYTICS_RETENTION_DAYS` | `90` | Retention window used at startup purge |
| `ANALYTICS_GEOIP_PROVIDER` | `maxmind` | Reserved provider flag for local GeoIP |
| `ANALYTICS_GEOIP_DB_PATH` | _unset_ | Path to local GeoIP DB (optional in this version) |
| `ANALYTICS_QUERY_HASH_ENABLED` | `false` | Reserved for future hashed query metrics |
| `ANALYTICS_REQUIRE_CONSENT` | `false` | Reserved for future consent workflow |
| `ANALYTICS_DASHBOARD_TOKEN` | _unset_ | Required token for `/admin/analytics` access |

### Retention policy

- On analytics server startup, events older than `ANALYTICS_RETENTION_DAYS` are purged.
- Purge activity is logged to server logs.
- Dashboard system panel includes retention days and oldest stored event timestamp.

### Running the analytics server

```bash
npm run analytics:server
```

Provided endpoints:

- `POST /api/analytics/search`
- `GET /api/admin/analytics/summary`
- `GET /api/admin/analytics/daily`
- `GET /api/admin/analytics/top-cities`
- `GET /admin/analytics`

Dashboard access requires `ANALYTICS_DASHBOARD_TOKEN`, either via:

- `Authorization: Bearer <token>`
- `?token=<token>`

If `ANALYTICS_ENABLED=false`, analytics endpoints return 404 and no events are stored.

### Analytics backend test coverage

Run the analytics range tests (custom date validation + cache-key/date-window stability):

```bash
npm run test:analytics
```

These tests currently verify:
- Invalid `range=custom` inputs return structured validation errors (missing params, invalid date values, and `from > to`).
- Relative ranges (`7d`, `30d`, `90d`) resolve to UTC day boundaries with stable cache keys (`7d`, `30d`, `90d`).
- Custom ranges produce deterministic cache keys (`custom:<from>:<to>`) and expected ISO boundaries.


## Getting Started

### Prerequisites
-   Node.js (v18+)
-   npm

### Installation

```bash
git clone https://github.com/your-username/sendwindow.git
cd sendwindow
npm install
```

### Development

Start the local development server:

```bash
npm run dev
```
Visit `http://localhost:5173`.

### Production Build

Create a production-ready build:

```bash
npm run build
```
The output will be in the `dist/` directory.

## Testing

- `npm run test:analytics` — analytics backend date-range and cache-key behavior tests.
- `npm run build` — type-check + production build sanity check.

## Deployment

This is a Single Page Application (SPA). For deployment:
1.  Build the app (`npm run build`).
2.  Serve the `dist` folder using any static file server (NGINX, Apache, Vercel, Netlify).
3.  **Important**: Configure your server to redirect 404s to `index.html` to support client-side routing.

See [instructions_for_deployment.md](./instructions_for_deployment.md) for a detailed NGINX configuration guide.

## License

MIT
