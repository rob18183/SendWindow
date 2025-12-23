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
-   **Privacy Focused**: No tracking, all logic runs client-side.

## Tech Stack

-   **Frontend**: React (v18), TypeScript, Vite
-   **State/Data**: TansStack Query (React Query) for caching and state management.
-   **Maps**: Leaflet & React-Leaflet.
-   **Styling**: Custom CSS variables, responsive implementation.
-   **Routing**: OSRM (Open Source Routing Machine) public API for driving times.
-   **Data Source**: NKV (Nederlandse Kitesurf Vereniging) public spot data.

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

## Deployment

This is a Single Page Application (SPA). For deployment:
1.  Build the app (`npm run build`).
2.  Serve the `dist` folder using any static file server (NGINX, Apache, Vercel, Netlify).
3.  **Important**: Configure your server to redirect 404s to `index.html` to support client-side routing.

See [instructions_for_deployment.md](./instructions_for_deployment.md) for a detailed NGINX configuration guide.

## License

MIT
