import { useQueries } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import spots from "../../data/spots.nl.json";
import { getHourlyForecast } from "../lib/forecast";
import { sendScore } from "../lib/scoring";
import "leaflet/dist/leaflet.css";

// Fix Leaflet generic icon if needed (should be handled globally but safe to ensure)
// We will use DivIcons anyway.

export default function MapPage() {
    // 1. Fetch ALL forecasts parallely
    // Note: This might hit API rate limits if real API is used without batching.
    // For MOCK, it's fine. For OpenMeteo, 105 reqs is a lot.
    // Ideally we'd batch, but OpenMeteo free tier is quite generous (10k/day).
    // Just ensure we don't spam on every re-render. cacheTime helps.

    const spotQueries = useQueries({
        queries: spots.map(spot => ({
            queryKey: ['forecast', spot.id],
            queryFn: async () => {
                const hours = await getHourlyForecast(spot.lat, spot.lon);
                // Compute scores
                return hours.map(h => ({ ...h, scoreRes: sendScore(spot, h) }));
            },
            staleTime: 1000 * 60 * 15 // 15 min cache
        }))
    });

    const isAnyLoading = spotQueries.some(q => q.isLoading);

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Header Overlay */}
            <div style={{
                position: "absolute",
                top: 16,
                left: 16,
                zIndex: 1000,
                backgroundColor: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(4px)",
                padding: "8px 16px",
                borderRadius: 24,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 12
            }}>
                <Link to="/" style={{ textDecoration: "none", fontSize: 20 }}>&larr;</Link>
                <div style={{ fontWeight: "bold" }}>Spot Map</div>
                {isAnyLoading && <div style={{ fontSize: 12, opacity: 0.6 }}>Loading forecast...</div>}
            </div>

            <MapContainer
                center={[52.2, 5.2]}
                zoom={8}
                style={{ width: "100%", height: "100%" }}
                zoomControl={false} // Custom or just clean
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {spots.map((spot, i) => {
                    const q = spotQueries[i];
                    if (!q.data) return null; // Wait for data

                    // Logic: Get next ~12 daylight hours for barcode
                    // And current hour for dot color
                    const scores = q.data;

                    // Barcode: Take next 12h, filter isDay?
                    // User asked for "daytime score colors".
                    // Let's grab next 8-10 items that are Day.
                    const barcodeItems = scores.filter(s => new Date(s.timeISO) >= new Date() && s.isDay !== false).slice(0, 10);

                    const iconHtml = `
                        <div class="barcode-inner" style="
                            display: flex; 
                            flex-direction: row;
                            border-radius: 4px; 
                            overflow: hidden; 
                            border: 1px solid rgba(0,0,0,0.15);
                            background: white;
                            width: max-content;
                            padding: 2px;
                            gap: 1px;
                        ">
                            ${barcodeItems.map(item => `
                                <div style="
                                    width: 6px; 
                                    height: 16px; 
                                    background-color: var(--color-${item.scoreRes?.color === 'green' ? 'success' : item.scoreRes?.color === 'yellow' ? 'warning' : 'danger'});
                                    opacity: ${item.scoreRes?.score === 0 ? 0.3 : 1};
                                    border-radius: 1px;
                                " title="${new Date(item.timeISO).getHours()}:00"></div>
                            `).join('')}
                        </div>
                    `;

                    return (
                        <Marker
                            key={spot.id}
                            position={[spot.lat, spot.lon]}
                            icon={L.divIcon({
                                html: iconHtml,
                                className: 'barcode-marker',
                                iconSize: [60, 20],
                                iconAnchor: [30, 10]
                            })}
                        >
                            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                <div style={{ fontWeight: "bold", fontSize: 13 }}>{spot.name}</div>
                                <div style={{ fontSize: 11, color: "#666" }}>Click to view details</div>
                            </Tooltip>
                            <Popup>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ fontWeight: "bold", marginBottom: 4 }}>{spot.name}</div>
                                    <Link to={`/spot/${spot.id}`} className="btn-primary" style={{ fontSize: 12, padding: "4px 12px" }}>
                                        View Forecast
                                    </Link>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
