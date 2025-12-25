import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import spots from "../../data/spots.nl.json";
import { getUserLocation, haversineKm, geocodeAddress, getDrivingDuration } from "../lib/geo";
import { getHourlyForecast, ForecastHour } from "../lib/forecast";
import { bestWindow, fmtWindow } from "../lib/windows";
import { SpotCard } from "../components/SpotCard";
import { sendScore } from "../lib/scoring";

export default function DuoPage() {
    const [searchParams] = useSearchParams();
    const [locA, setLocA] = useState<{ lat: number; lon: number; name: string } | null>(null);
    const [locB, setLocB] = useState<{ lat: number; lon: number; name: string } | null>(null);
    const [addressB, setAddressB] = useState("");
    const [isSearchingB, setIsSearchingB] = useState(false);
    const [justCopied, setJustCopied] = useState(false);

    // Filter Season (assume Open for now for simplicity or reuse logic)
    // Filter Level (assume All)

    // 1. Initialize Locations (Check URL params first, then LocalStorage/GPS)
    useEffect(() => {
        const init = async () => {
            const fromParam = searchParams.get('from');
            const toParam = searchParams.get('to');

            // Initialize A (You)
            if (fromParam) {
                // If URL has 'from', verify it's valid
                try {
                    const res = await geocodeAddress(fromParam);
                    if (res) setLocA(res);
                } catch (e) { console.error(e); }
            } else {
                // Fallback to LocalStorage or GPS
                const saved = localStorage.getItem("user_location");
                if (saved) {
                    try {
                        setLocA(JSON.parse(saved));
                    } catch (e) { }
                } else {
                    getUserLocation().then(pos => setLocA({ ...pos, name: "GPS" })).catch(() => { });
                }
            }

            // Initialize B (Buddy)
            if (toParam) {
                setAddressB(toParam); // Pre-fill input
                try {
                    const res = await geocodeAddress(toParam);
                    if (res) setLocB(res);
                } catch (e) { console.error(e); }
            }
        };
        init();
    }, []); // Run once on mount

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

    const handleShare = async () => {
        if (!locA || !locB) return;
        const url = `${window.location.origin}/duo?from=${encodeURIComponent(locA.name)}&to=${encodeURIComponent(locB.name)}`;
        const msg = `Lets go and surf together! Here we can find a spot: ${url}`;

        try {
            await navigator.clipboard.writeText(msg);
            setJustCopied(true);
            setTimeout(() => setJustCopied(false), 3000);
        } catch (err) {
            console.warn("Clipboard API failed, trying fallback", err);
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = msg;
            textArea.style.position = "fixed"; // Avoid scrolling
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setJustCopied(true);
                    setTimeout(() => setJustCopied(false), 3000);
                } else {
                    alert("Could not copy link automatically. Here is the URL:\n" + url);
                }
            } catch (err) {
                alert("Could not copy link automatically. Here is the URL:\n" + url);
            }
            document.body.removeChild(textArea);
        }
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
            queryFn: () => getDrivingDuration(
                { ...locA!, name: locA!.name },
                { lat: spot.lat, lon: spot.lon, id: spot.id }
            ),
            enabled: !!locA
        }))
    });

    const driveTimesB = useQueries({
        queries: candidates.map(({ spot }) => ({
            queryKey: ['drivingTime', locB?.lat, locB?.lon, spot.lat, spot.lon],
            queryFn: () => getDrivingDuration(
                { ...locB!, name: locB!.name },
                { lat: spot.lat, lon: spot.lon, id: spot.id }
            ),
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

            // Fix: Use the score from the BEST WINDOW, not just the first hour.
            const bestWindowObj = bestWindow(hours, 45);

            let baseScore = 0;
            let displayColor = 'red';

            if (bestWindowObj) {
                // Average score of the window
                const windowHours = hours.slice(bestWindowObj.start, bestWindowObj.end + 1);
                const sum = windowHours.reduce((acc, h) => acc + h.score, 0);
                baseScore = Math.round(sum / windowHours.length);
                // Use color of the best score in window or average? Let's use average mapping.
                if (baseScore >= 70) displayColor = 'green';
                else if (baseScore >= 45) displayColor = 'yellow';
            } else {
                // If no window found, use the max score to at least rank them by potential
                const max = hours.reduce((m, h) => Math.max(m, h.score), 0);
                baseScore = max;
                if (baseScore >= 70) displayColor = 'green';
                else if (baseScore >= 45) displayColor = 'yellow';
            }

            // Allow null travel times (fallback to simple calc if needed)
            const tA = dA_Time ?? (c.dA * 1.5);
            const tB = dB_Time ?? (c.dB * 1.5);

            // Duo Score Algo
            // Score = (SpotScore * 2) - (TotalTime / 2) - (Diff * 1.5)
            const totalTime = tA + tB;
            const diff = Math.abs(tA - tB);

            const duoScore = (baseScore * 2.0) - (totalTime * 0.5) - (diff * 1.5);

            return {
                spot,
                baseScore,
                tA, tB,
                duoScore,
                color: displayColor,
                windowLabel: bestWindowObj ? fmtWindow(hours, bestWindowObj.start, bestWindowObj.end) : "No Window",
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <Link to="/" style={{ textDecoration: 'none', fontSize: 20 }}>⬅️</Link>
                        <h1 style={{ margin: 0 }}>Duo Mode 🤝</h1>
                    </div>
                    {/* Share Button (Only visible if both locs set) */}
                    {locA && locB && (
                        <button
                            onClick={handleShare}
                            className="btn-ghost"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                fontSize: 13,
                                background: justCopied ? '#ecfdf5' : '#f8fafc',
                                color: justCopied ? '#059669' : 'inherit',
                                transition: 'all 0.2s',
                                border: justCopied ? '1px solid #059669' : '1px solid transparent'
                            }}
                        >
                            <span>{justCopied ? '✅ ' : '🔗'}</span>
                            {justCopied ? 'Copied!' : 'Share'}
                        </button>
                    )}
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
                            <form onSubmit={handleSetLocB} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <input
                                    value={addressB}
                                    onChange={e => setAddressB(e.target.value)}
                                    placeholder="City (e.g. Amsterdam)"
                                    style={{ flex: "1 1 200px", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", minWidth: 0 }}
                                />
                                <button type="submit" className="btn-primary" disabled={isSearchingB} style={{ flexShrink: 0 }}>
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
                                windowLabel={r.windowLabel}
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
