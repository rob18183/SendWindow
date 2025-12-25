import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import spots from "../../data/spots.nl.json";
import { getCardinalDirection } from "../lib/geo";
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
    // New fields
    season?: string;
    level?: string[];
    depth?: string[];
    webcam?: { url: string; type: 'embed' | 'link' };
    external_forecasts?: { name: string; url: string }[];
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

    // Compute visible items helper
    const getVisibleItems = (hours: ComputedHour[]) => {
        const items: any[] = [];
        const getDayStr = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'short' });
        let lastDayStr = "";

        hours.forEach((h, i) => {
            const dayStr = getDayStr(h.timeISO);
            if (h.isDay !== false) {
                if (dayStr !== lastDayStr) {
                    if (items.length > 0) items.push({ type: 'day-header', text: dayStr });
                    lastDayStr = dayStr;
                }
                items.push({ type: 'slot', hour: h, index: i });
            } else {
                const last = items[items.length - 1];
                if (!last || last.type !== 'night') items.push({ type: 'night' });
            }
        });
        return items;
    };

    // Derived state
    const hours: ComputedHour[] = forecast ? forecast.map((h) => ({ ...h, scoreRes: sendScore(spot!, h) })) : [];
    const visibleItems = hours.length > 0 ? getVisibleItems(hours) : [];
    const current = hours[selectedIdx];

    // Effect for selection - Must be unconditional
    useEffect(() => {
        if (!hours || hours.length === 0) return;
        if (hours[selectedIdx]?.isDay === false) {
            const firstDayIdx = visibleItems.find((v: any) => v.type === 'slot')?.index ?? 0;
            if (firstDayIdx !== selectedIdx) {
                setSelectedIdx(firstDayIdx);
            }
        }
    }, [id, forecast, selectedIdx, hours, visibleItems]);

    // Render loading/error states AFTER hooks
    if (!spot) return <div style={{ padding: 20 }}>Spot not found</div>;
    if (isLoading) return <div style={{ padding: 20 }}>Loading forecast...</div>;
    if (isError || !forecast || !current) return <div style={{ padding: 20 }}>Failed to load forecast</div>;


    return (
        <div className="container" style={{ padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
                <Link to="/" className="btn btn-icon" style={{ textDecoration: "none", marginBottom: 8, display: 'inline-flex', paddingLeft: 0 }}>
                    &larr; Back
                </Link>
                <h1>{spot.name}</h1>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {spot.season && <span className="chip">📅 {spot.season}</span>}
                    {spot.level?.map(l => <span key={l} className="chip">👶 {l}</span>)}
                    {spot.depth?.map(d => <span key={d} className="chip">🌊 {d}</span>)}
                </div>
            </div>

            {/* Hourly Strip */}
            <div style={{
                display: "flex",
                overflowX: "auto",
                gap: 0, // Remove gap, use border for separation
                paddingBottom: 12,
                marginBottom: 20,
                alignItems: "stretch"
            }}>
                {visibleItems.map((item, i) => {
                    if (item.type === 'night') {
                        return (
                            <div key={`night-${i}`} style={{
                                width: 24,
                                backgroundColor: '#f1f5f9',
                                borderRight: '1px dashed #cbd5e1',
                                flexShrink: 0,
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} title="Night">
                                <span style={{ fontSize: 12 }}>🌙</span>
                            </div>
                        );
                    }

                    if (item.type === 'day-header') {
                        return (
                            <div key={`day-${i}`} style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 32,
                                padding: "0 4px",
                                fontWeight: "bold",
                                fontSize: 13,
                                color: "var(--color-dim)",
                                borderRight: '1px solid #e2e8f0',
                                backgroundColor: '#fff',
                                flexShrink: 0,
                                position: 'sticky',
                                left: 0,
                                writingMode: "vertical-rl",
                                textOrientation: "mixed",
                                transform: "rotate(180deg)", // Reads Bottom-to-Top
                            }}>
                                {item.text}
                            </div>
                        );
                    }

                    // Must be slot
                    if (item.type !== 'slot') return null;

                    const h = item.hour;
                    const idx = item.index;
                    const time = new Date(h.timeISO).getHours();
                    const isSelected = idx === selectedIdx;
                    const scoreColor = `var(--color-${h.scoreRes.color === 'green' ? 'success' : h.scoreRes.color === 'yellow' ? 'warning' : 'danger'})`;

                    return (
                        <div
                            key={idx}
                            onClick={() => setSelectedIdx(idx)}
                            style={{
                                flex: "0 0 64px",
                                minWidth: 64, // FORCE width
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 4px 6px",
                                borderRight: "1px solid #f1f5f9",
                                backgroundColor: isSelected ? "#f0f9ff" : "white",
                                cursor: "pointer",
                                transition: "all 0.1s",
                                position: 'relative'
                            }}
                        >
                            {/* Selection Indicator */}
                            {isSelected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'var(--color-primary)' }} />}

                            {/* Time */}
                            <div className="text-xs text-dim" style={{ fontSize: 12, fontWeight: 500 }}>{time}:00</div>

                            {/* Direction Arrow */}
                            <div style={{ transform: `rotate(${h.wind_dir_deg}deg)`, fontSize: 20, color: '#334155', margin: '4px 0' }}>↓</div>

                            {/* Speed Group */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                                    {h.wind_avg_kt}
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b', height: 14 }}>
                                    {h.wind_gust_kt - h.wind_avg_kt > 5 ? `(${h.wind_gust_kt})` : ''}
                                </div>
                            </div>

                            {/* Score Indicator (Bottom Bar) */}
                            <div style={{
                                width: '60%',
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: scoreColor,
                                marginTop: 6,
                                opacity: isSelected ? 1 : 0.6
                            }} />

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
                    <Stat
                        label="Direction"
                        value={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {getCardinalDirection(current.wind_dir_deg)}
                                <div style={{ transform: `rotate(${current.wind_dir_deg}deg)`, display: 'inline-block' }}>↓</div>
                            </div>
                        }
                        sub={`${current.wind_dir_deg}° · Score: ${current.scoreRes.breakdown?.pDir.toFixed(0)}`}
                    />
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

                {/* Webcam & External Links */}
                {(spot.webcam || spot.external_forecasts) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>

                        {/* Webcam */}
                        {spot.webcam && (
                            <div className="card" style={{ padding: 16 }}>
                                <h3>Live Webcam</h3>
                                <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
                                    {spot.webcam.type === 'embed' ? (
                                        <iframe
                                            src={spot.webcam.url}
                                            width="100%"
                                            height="100%"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            title="Webcam"
                                        />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <a href={spot.webcam.url} target="_blank" rel="noreferrer" className="btn-primary">
                                                Open Webcam
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* External Forecasts */}
                        {spot.external_forecasts && spot.external_forecasts.length > 0 && (
                            <div className="card" style={{ padding: 16 }}>
                                <h3>More Forecasts</h3>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                                    {spot.external_forecasts.map(ef => (
                                        <a key={ef.name} href={ef.url} target="_blank" rel="noreferrer" className="btn" style={{ background: '#f1f5f9', fontSize: 13 }}>
                                            {ef.name} ↗
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

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

function Stat({ label, value, sub }: { label: string, value: React.ReactNode, sub: string }) {
    return (
        <div>
            <div className="text-xs text-dim" style={{ marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
            <div className="text-xs text-dim" style={{ opacity: 0.8 }}>{sub}</div>
        </div>
    );
}


