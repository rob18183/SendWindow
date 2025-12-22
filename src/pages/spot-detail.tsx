import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import spots from "../../data/spots.nl.json";
import { getHourlyForecastMock, ForecastHour } from "../lib/forecast/mock";
import { sendScore, ScoreResult } from "../lib/scoring";

type Spot = {
    id: string; name: string; lat: number; lon: number;
    good_dirs: { start: number; end: number }[];
    unsafe_dirs?: { start: number; end: number }[];
};

type ComputedHour = ForecastHour & {
    scoreRes: ScoreResult;
};

export default function SpotDetail() {
    const { id } = useParams<{ id: string }>();
    const [hours, setHours] = useState<ComputedHour[]>([]);
    const [selectedIdx, setSelectedIdx] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const spot = (spots as Spot[]).find((s) => s.id === id);

    useEffect(() => {
        if (!spot) return;
        getHourlyForecastMock(spot.lat, spot.lon).then((hrs) => {
            const computed = hrs.map((h) => ({
                ...h,
                scoreRes: sendScore(spot, h)
            }));
            setHours(computed);
            // Default select first meaningful hour? or just now (0)
            setLoading(false);
        });
    }, [spot]);

    if (!spot) return <div style={{ padding: 20 }}>Spot not found</div>;
    if (loading) return <div style={{ padding: 20 }}>Loading forecast...</div>;

    const current = hours[selectedIdx];
    if (!current) return null;

    return (
        <div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
                <Link to="/" style={{ textDecoration: "none", color: "#666" }}>&larr; Back</Link>
                <h1 style={{ marginTop: 8 }}>{spot.name}</h1>
            </div>

            {/* Hourly Strip */}
            <div style={{
                display: "flex",
                overflowX: "auto",
                gap: 4,
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
                                flex: "0 0 40px",
                                height: 80,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                border: isSelected ? "2px solid #333" : "1px solid #eee",
                                borderRadius: 8,
                                cursor: "pointer",
                                backgroundColor: isSelected ? "#f0f0f0" : "transparent"
                            }}
                        >
                            <div style={{ fontSize: 10, marginBottom: 4 }}>{time}:00</div>
                            <div style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                backgroundColor: getColorCode(h.scoreRes.color)
                            }} />
                            <div style={{ fontSize: 10, marginTop: 4, fontWeight: "bold" }}>{h.scoreRes.score}</div>
                        </div>
                    );
                })}
            </div>

            {/* Detail Section */}
            <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
                    {new Date(current.timeISO).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: getColorCode(current.scoreRes.color) }}>
                        {current.scoreRes.score}
                    </div>
                    <div style={{ fontSize: 18, textTransform: "uppercase", fontWeight: "bold", color: getColorCode(current.scoreRes.color) }}>
                        {current.scoreRes.color}
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Stat label="Wind Avg" value={`${current.wind_avg_kt} kt`} sub={`Score: ${current.scoreRes.breakdown?.wind.toFixed(0)}`} />
                    <Stat label="Gusts" value={`${current.wind_gust_kt} kt`} sub={`Score: ${current.scoreRes.breakdown?.pGust.toFixed(0)}`} />
                    <Stat label="Direction" value={`${current.wind_dir_deg}°`} sub={`Score: ${current.scoreRes.breakdown?.pDir.toFixed(0)}`} />
                    {current.scoreRes.breakdown?.safetyRed && (
                        <div style={{ gridColumn: "span 2", color: "red", fontWeight: "bold", marginTop: 8 }}>
                            ⚠️ Unsafe Direction
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, sub }: { label: string, value: string, sub: string }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{sub}</div>
        </div>
    );
}

function getColorCode(c: "green" | "yellow" | "red") {
    switch (c) {
        case "green": return "#2e7d32"; // Darker green
        case "yellow": return "#f9a825"; // Darker yellow
        case "red": return "#c62828"; // Darker red
    }
}
