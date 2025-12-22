import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import spots from "../../data/spots.nl.json";
import { getUserLocation, haversineKm } from "../lib/geo";
import { getHourlyForecast, ForecastHour } from "../lib/forecast";
import { bestWindow } from "../lib/windows";
import { compareSpots } from "../lib/comparator";
import { SpotCard } from "../components/SpotCard";
import { sendScore } from "../lib/scoring";

type Spot = {
    id: string; name: string; lat: number; lon: number;
    good_dirs: { start: number; end: number }[];
    unsafe_dirs?: { start: number; end: number }[];
    description?: string;
    hazards?: string;
    facilities?: string;
    rules?: string;
    level?: string[];
    depth?: string[];
    permalink?: string;
    image?: string;
};

import { isToday, isTomorrow, format } from "date-fns";

function fmtWindow(hours: { timeISO: string }[], start: number, end: number) {
    const sDate = new Date(hours[start].timeISO);
    const eDate = new Date(hours[end].timeISO);

    let dayStr = "";
    if (isToday(sDate)) dayStr = "Today";
    else if (isTomorrow(sDate)) dayStr = "Tomorrow";
    else dayStr = format(sDate, "EEE");

    const sTime = format(sDate, "HH:mm");
    const eTime = format(eDate, "HH:mm");
    const duration = end - start + 1;

    return `${dayStr} ${sTime}–${eTime} · ${duration}h`;
}

export default function Home() {
    const queryClient = useQueryClient();
    const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState(50);
    const [initLocError, setInitLocError] = useState<string | null>(null);

    useEffect(() => {
        getUserLocation().then(setLoc).catch((e) => setInitLocError(String(e?.message ?? e)));
    }, []);

    const inRange = useMemo(() => {
        if (!loc) return [];
        return (spots as Spot[])
            .map((s) => ({ spot: s, distanceKm: haversineKm(loc, { lat: s.lat, lon: s.lon }) }))
            .filter((x) => x.distanceKm <= radiusKm);
    }, [loc, radiusKm]);

    // Parallel fetch for all visible spots
    const spotQueries = useQueries({
        queries: inRange.map(({ spot }) => ({
            queryKey: ['forecast', spot.id],
            queryFn: () => getHourlyForecast(spot.lat, spot.lon),
            staleTime: 1000 * 60 * 15 // 15 mins
        }))
    });

    const isRefetching = spotQueries.some(q => q.isRefetching || q.isLoading);

    const rows = useMemo(() => {
        const computed = inRange.map(({ spot, distanceKm }, idx) => {
            const result = spotQueries[idx];

            if (result.status !== 'success' || !result.data) {
                // Loading or Error state placeholder
                return null;
            }

            const forecast = result.data as ForecastHour[];
            const hours = forecast.map((fh) => {
                const r = sendScore(spot, fh);
                return { timeISO: fh.timeISO, score: r.score, color: r.color };
            });

            const greenBest = bestWindow(hours, 70);
            const yellowBest = bestWindow(hours, 45);

            return { spotId: spot.id, spot, distanceKm, hours, greenBest, yellowBest };
        }).filter(Boolean) as any[];

        computed.sort(compareSpots);

        return computed.map((x) => {
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
    }, [inRange, spotQueries]);

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['forecast'] });
    };

    return (
        <div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h1 style={{ margin: 0 }}>SendWindow</h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button
                        onClick={handleRefresh}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: 16,
                            cursor: "pointer",
                            padding: 4,
                            transform: isRefetching ? "rotate(360deg)" : "none",
                            transition: "transform 1s ease"
                        }}
                        title="Refresh Forecasts"
                    >
                        🔄
                    </button>
                    <Link to="/alerts" style={{ fontSize: 14, color: "#007bff", textDecoration: "none", fontWeight: 600 }}>🔔 Alerts</Link>
                </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <label>Radius</label>
                <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
                    <option value={10}>10 km</option>
                    <option value={25}>25 km</option>
                    <option value={50}>50 km</option>
                    <option value={100}>100 km</option>
                </select>
                {initLocError && <span style={{ color: "crimson" }}>{initLocError}</span>}
                {!loc && !initLocError && <span style={{ color: "#999" }}>Locating...</span>}
            </div>

            {rows.map((r) => (
                <Link key={r.id} to={`/spot/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <SpotCard {...r} />
                </Link>
            ))}

            {loc && rows.length === 0 && !isRefetching && (
                <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
                    No spots within {radiusKm}km found.
                </div>
            )}

            {(isRefetching || (!rows.length && !initLocError)) && rows.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
                    Loading forecasts...
                </div>
            )}
        </div>
    );
}
