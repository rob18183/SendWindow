import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import spots from "../../data/spots.nl.json";
import { getUserLocation, haversineKm } from "../lib/geo";
import { getHourlyForecastMock } from "../lib/forecast/mock";
import { bestWindow } from "../lib/windows";
import { compareSpots } from "../lib/comparator";
import { SpotCard } from "../components/SpotCard";
import { sendScore } from "../lib/scoring";

type Spot = {
    id: string; name: string; lat: number; lon: number;
    good_dirs: { start: number; end: number }[];
    unsafe_dirs?: { start: number; end: number }[];
};

function fmtWindow(hours: { timeISO: string }[], start: number, end: number) {
    const s = new Date(hours[start].timeISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const e = new Date(hours[end].timeISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${s}–${e} (${end - start + 1}h)`;
}

export default function Home() {
    const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState(50);
    const [rows, setRows] = useState<any[]>([]);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        getUserLocation().then(setLoc).catch((e) => setErr(String(e?.message ?? e)));
    }, []);

    useEffect(() => {
        if (!loc) return;

        (async () => {
            const inRange = (spots as Spot[])
                .map((s) => ({ spot: s, distanceKm: haversineKm(loc, { lat: s.lat, lon: s.lon }) }))
                .filter((x) => x.distanceKm <= radiusKm);

            const computed = [];
            for (const { spot, distanceKm } of inRange) {
                const forecast = await getHourlyForecastMock(spot.lat, spot.lon);

                const hours = forecast.map((fh) => {
                    const r = sendScore(spot, fh);
                    return { timeISO: fh.timeISO, score: r.score, color: r.color };
                });

                const greenBest = bestWindow(hours, 70);
                const yellowBest = bestWindow(hours, 45);

                computed.push({ spotId: spot.id, spot, distanceKm, hours, greenBest, yellowBest });
            }

            computed.sort(compareSpots);

            const cards = computed.map((x) => {
                const chosen = x.greenBest ?? x.yellowBest;
                const label = chosen ? fmtWindow(x.hours, chosen.start, chosen.end) : "No window";
                const topHour = chosen ? x.hours[chosen.start] : x.hours[0];
                return {
                    id: x.spot.id,
                    name: x.spot.name,
                    distanceKm: x.distanceKm,
                    score: topHour?.score ?? 0,
                    color: topHour?.color ?? "red",
                    windowLabel: label
                };
            });

            setRows(cards);
        })().catch((e) => setErr(String(e?.message ?? e)));
    }, [loc, radiusKm]);

    return (
        <div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h1 style={{ margin: 0 }}>SendWindow</h1>
                <Link to="/alerts" style={{ fontSize: 14, color: "#007bff", textDecoration: "none", fontWeight: 600 }}>🔔 Alerts</Link>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <label>Radius</label>
                <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
                    <option value={10}>10 km</option>
                    <option value={25}>25 km</option>
                    <option value={50}>50 km</option>
                    <option value={100}>100 km</option>
                </select>
                {err && <span style={{ color: "crimson" }}>{err}</span>}
            </div>

            {rows.map((r) => (
                <Link key={r.id} to={`/spot/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <SpotCard {...r} />
                </Link>
            ))}
        </div>
    );
}
