import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import spots from "../../data/spots.nl.json";
import { getHourlyForecast, ForecastHour } from "../lib/forecast";
import { sendScore, ScoreResult } from "../lib/scoring";
import { SpotMap } from "../components/SpotMap";

type Spot = {
    id: string; name: string; lat: number; lon: number;
    good_dirs: { start: number; end: number }[];
    unsafe_dirs?: { start: number; end: number }[];
    description?: string;
    hazards?: string;
    facilities?: string;
    rules?: string;
};

export type ComputedHour = ForecastHour & {
    scoreRes: ScoreResult;
};

export default function SpotDetail() {
    const { id } = useParams<{ id: string }>();
    const [selectedIdx, setSelectedIdx] = useState<number>(0);

    const spot = (spots as Spot[]).find((s) => s.id === id);

    // Use Query to get RAW forecast (matches key from Home)
    const { data: forecast, isLoading, isError } = useQuery({
        queryKey: ['forecast', spot?.id],
        queryFn: async () => {
            if (!spot) return null;
            return await getHourlyForecast(spot.lat, spot.lon);
        },
        enabled: !!spot,
        staleTime: 1000 * 60 * 15
    });

    if (!spot) return <div style={{ padding: 20 }}>Spot not found</div>;
    if (isLoading) return <div style={{ padding: 20 }}>Loading forecast...</div>;
    if (isError || !forecast) return <div style={{ padding: 20 }}>Failed to load forecast</div>;

    // Compute scores on the fly (derived state)
    const hours: ComputedHour[] = forecast.map((h) => ({
        ...h,
        scoreRes: sendScore(spot, h)
    }));

    const current = hours[selectedIdx];
    if (!current) return null;

    return (
        <div className="container" style={{ padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
                <Link to="/" className="btn btn-icon" style={{ textDecoration: "none", marginBottom: 8, display: 'inline-flex', paddingLeft: 0 }}>
                    &larr; Back
                </Link>
                <h1>{spot.name}</h1>
            </div>

            {/* Hourly Strip */}
            <div style={{
                display: "flex",
                overflowX: "auto",
                gap: 8,
                paddingBottom: 12,
                marginBottom: 20
            }}>
                {hours.map((h, i) => {
                    const time = new Date(h.timeISO).getHours();
                    const isSelected = i === selectedIdx;
                    return (
                        <div
                            key={i}
                            onClick={() => setSelectedIdx(i)}
                            style={{
                                flex: "0 0 48px",
                                height: 84,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                border: isSelected ? "2px solid var(--color-primary)" : "1px solid #e2e8f0",
                                borderRadius: 12,
                                cursor: "pointer",
                                backgroundColor: isSelected ? "white" : "#f8fafc",
                                boxShadow: isSelected ? "var(--shadow-md)" : "none",
                                transition: "all 0.2s"
                            }}
                        >
                            <div className="text-xs text-dim" style={{ marginBottom: 4 }}>{time}:00</div>
                            <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                backgroundColor: `var(--color-${h.scoreRes.color === 'green' ? 'success' : h.scoreRes.color === 'yellow' ? 'warning' : 'danger'})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: 10,
                                fontWeight: 'bold'
                            }}>
                                {h.scoreRes.score}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail Section */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <div className="text-sm text-dim" style={{ marginBottom: 8 }}>
                    {new Date(current.timeISO).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: `var(--color-${current.scoreRes.color === 'green' ? 'success' : current.scoreRes.color === 'yellow' ? 'warning' : 'danger'})` }}>
                        {current.scoreRes.score}
                    </div>
                    <div style={{ fontSize: 18, textTransform: "uppercase", fontWeight: "bold", color: `var(--color-${current.scoreRes.color === 'green' ? 'success' : current.scoreRes.color === 'yellow' ? 'warning' : 'danger'})` }}>
                        {current.scoreRes.color}
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Stat label="Wind Avg" value={`${current.wind_avg_kt} kt`} sub={`Score: ${current.scoreRes.breakdown?.wind.toFixed(0)}`} />
                    <Stat label="Gusts" value={`${current.wind_gust_kt} kt`} sub={`Score: ${current.scoreRes.breakdown?.pGust.toFixed(0)}`} />
                    <Stat label="Direction" value={`${current.wind_dir_deg}°`} sub={`Score: ${current.scoreRes.breakdown?.pDir.toFixed(0)}`} />
                    {current.scoreRes.breakdown?.safetyRed && (
                        <div style={{ gridColumn: "span 2", color: "var(--color-danger)", fontWeight: "bold", marginTop: 8 }}>
                            ⚠️ Unsafe Direction
                        </div>
                    )}
                </div>
            </div>

            {/* Map & Navigate */}
            <div style={{ marginBottom: 120 }}>
                {/* Navigation Button */}
                <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                        display: "flex",
                        width: "100%",
                        padding: "14px",
                        backgroundColor: "var(--color-accent)",
                        color: "white",
                        textAlign: "center",
                        textDecoration: "none",
                        marginBottom: 24,
                        fontSize: 16
                    }}
                >
                    📍 Navigate to Spot
                </a>

                {/* Map */}
                <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: 24 }}>
                    <SpotMap lat={spot.lat} lon={spot.lon} name={spot.name} />
                </div>

                {/* Spot Details */}
                {(spot.description || spot.rules || spot.hazards) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {spot.description && (
                            <div className="card" style={{ padding: 16 }}>
                                <h3>About</h3>
                                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text)' }}>{spot.description}</div>
                            </div>
                        )}

                        {spot.hazards && (
                            <div className="card" style={{ padding: 16, backgroundColor: '#fffbeb', borderLeft: '4px solid var(--color-warning)' }}>
                                <h3 style={{ color: '#92400e' }}>⚠️ Hazards</h3>
                                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#92400e' }}>{spot.hazards}</div>
                            </div>
                        )}

                        {spot.rules && (
                            <div className="card" style={{ padding: 16 }}>
                                <h3>Rules</h3>
                                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{spot.rules}</div>
                            </div>
                        )}

                        {spot.facilities && (
                            <div className="card" style={{ padding: 16 }}>
                                <h3>Facilities</h3>
                                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{spot.facilities}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value, sub }: { label: string, value: string, sub: string }) {
    return (
        <div>
            <div className="text-xs text-dim" style={{ marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
            <div className="text-xs text-dim" style={{ opacity: 0.8 }}>{sub}</div>
        </div>
    );
}


