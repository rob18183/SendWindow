import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import spots from "../../data/spots.nl.json";
import { getUserLocation, haversineKm, geocodeAddress, getDrivingDuration } from "../lib/geo";
import { getHourlyForecast, ForecastHour } from "../lib/forecast";
import { bestWindow } from "../lib/windows";
import { SpotCard } from "../components/SpotCard";
import { sendScore } from "../lib/scoring";

export default function DuoPage() {
    const [locA, setLocA] = useState<{ lat: number; lon: number; name: string } | null>(null);
    const [locB, setLocB] = useState<{ lat: number; lon: number; name: string } | null>(null);
    const [addressB, setAddressB] = useState("");
    const [isSearchingB, setIsSearchingB] = useState(false);

    // Filter Season (assume Open for now for simplicity or reuse logic)
    // Filter Level (assume All)

    // 1. Initialize User Location (Loc A)
    useMemo(() => {
        const saved = localStorage.getItem("user_location");
        if (saved) {
            try {
                setLocA(JSON.parse(saved));
            } catch (e) { }
        } else {
            getUserLocation().then(pos => setLocA({ ...pos, name: "GPS" })).catch(() => { });
        }
    }, []);

    const handleSetLocB = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addressB) return;
        setIsSearchingB(true);
        const res = await geocodeAddress(addressB);
        if (res) {
            setLocB(res);
        } else {
            alert("Location not found");
        }
        setIsSearchingB(false);
    };

    // 2. Find Candidates (Top 30 by Linear Distance Sum)
    const candidates = useMemo(() => {
        if (!locA || !locB) return [];

        const withDist = spots.map(s => {
            const dA = haversineKm(locA, { lat: s.lat, lon: s.lon });
            const dB = haversineKm(locB, { lat: s.lat, lon: s.lon });
            return { spot: s, dA, dB, totalDist: dA + dB };
        });

        withDist.sort((a, b) => a.totalDist - b.totalDist);
        return withDist.slice(0, 30);
    }, [locA, locB]);

    // 3. Fetch Forecasts (for scoring)
    const forecastQueries = useQueries({
        queries: candidates.map(({ spot }) => ({
            queryKey: ['forecast', spot.id],
            queryFn: () => getHourlyForecast(spot.lat, spot.lon),
            staleTime: 1000 * 60 * 15
        }))
    });

    // 4. Fetch Driving Times (A & B)
    // This triggers 60 calls max. Acceptance: on-demand feature.
    const driveTimesA = useQueries({
        queries: candidates.map(({ spot }) => ({
            queryKey: ['drivingTime', locA?.lat, locA?.lon, spot.lat, spot.lon],
            queryFn: () => getDrivingDuration(locA!, { lat: spot.lat, lon: spot.lon }),
            enabled: !!locA
        }))
    });

    const driveTimesB = useQueries({
        queries: candidates.map(({ spot }) => ({
            queryKey: ['drivingTime', locB?.lat, locB?.lon, spot.lat, spot.lon],
            queryFn: () => getDrivingDuration(locB!, { lat: spot.lat, lon: spot.lon }),
            enabled: !!locB
        }))
    });

    // 5. Rank & Render
    const rankedSpots = useMemo(() => {
        if (!locA || !locB) return [];

        const results = candidates.map((c, i) => {
            const spot = c.spot;
            const fQ = forecastQueries[i];
            const dA_Time = driveTimesA[i].data;
            const dB_Time = driveTimesB[i].data;

            if (fQ.status !== 'success' || !fQ.data) return null;
            if (dA_Time === undefined || dB_Time === undefined) return null; // Loading

            // Calculate Base Score
            const forecast = fQ.data as ForecastHour[];
            const hours = forecast.map((fh) => {
                const r = sendScore(spot, fh);
                return { timeISO: fh.timeISO, score: r.score, color: r.color };
            });
            const topHour = hours[0]; // Simplification for ranking
            const bestWindowObj = bestWindow(hours, 45); // For display

            // Allow null travel times (fallback to simple calc if needed, but lets assume we wait)
            const tA = dA_Time ?? (c.dA * 1.5); // Fallback estimate
            const tB = dB_Time ?? (c.dB * 1.5);

            // Duo Score Algo
            // Score = (SpotScore * 2) - (TotalTime / 2) - (Diff * 1.5)
            const baseScore = topHour?.score ?? 0;
            const totalTime = tA + tB;
            const diff = Math.abs(tA - tB);

            const duoScore = (baseScore * 2.0) - (totalTime * 0.5) - (diff * 1.5);

            return {
                spot,
                baseScore,
                tA, tB,
                duoScore,
                color: topHour?.color ?? 'red',
                windowLabel: bestWindowObj ? `${bestWindowObj.start}-${bestWindowObj.end}` : "No Window", // Dirty label fix
                distKm: c.dA // Show dist from User A
            };
        }).filter(Boolean) as any[];

        results.sort((a, b) => b.duoScore - a.duoScore);
        return results;
    }, [candidates, forecastQueries, driveTimesA, driveTimesB, locA, locB]);

    const isCalculating = candidates.length > 0 && rankedSpots.length === 0;

    return (
        <div className="container" style={{ padding: '0 16px 40px' }}>
            <header style={{ padding: '24px 0' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                    <Link to="/" style={{ textDecoration: 'none', fontSize: 20 }}>⬅️</Link>
                    <h1 style={{ margin: 0 }}>Duo Mode 🤝</h1>
                </div>
                <p className="text-dim" style={{ marginBottom: 24 }}>Find the best fair spot for two kiters.</p>

                <div style={{ background: 'white', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* You */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>👤 You</span>
                        <span className="text-dim">{locA ? locA.name : "Locating..."}</span>
                    </div>

                    <div style={{ height: 1, background: '#f1f5f9' }} />

                    {/* Buddy */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>👤 Buddy</span>
                        {!locB ? (
                            <form onSubmit={handleSetLocB} style={{ display: 'flex', gap: 8 }}>
                                <input
                                    value={addressB}
                                    onChange={e => setAddressB(e.target.value)}
                                    placeholder="City (e.g. Amsterdam)"
                                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                                />
                                <button type="submit" className="btn-primary" disabled={isSearchingB}>
                                    {isSearchingB ? "..." : "Set"}
                                </button>
                            </form>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-dim">{locB.name}</span>
                                <button onClick={() => setLocB(null)} className="btn-ghost" style={{ fontSize: 12 }}>Change</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {candidates.length > 0 && (
                <div>
                    <h3 style={{ marginBottom: 16 }}>Best Compromise Spots</h3>
                    {isCalculating && <div className="text-dim">Calculating fair routes...</div>}

                    {rankedSpots.map((r: any) => (
                        <Link key={r.spot.id} to={`/spot/${r.spot.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                            <SpotCard
                                name={r.spot.name}
                                distanceKm={r.distKm}
                                score={r.baseScore}
                                color={r.color}
                                windowLabel={r.windowLabel} // Todo: fmtWindow
                                image={r.spot.image}
                                duoTimes={{ a: Math.round(r.tA), b: Math.round(r.tB) }}
                            />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
