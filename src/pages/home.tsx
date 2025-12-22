import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import spots from "../../data/spots.nl.json";
import { getUserLocation, haversineKm, reverseGeocode, geocodeAddress } from "../lib/geo";
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
    season?: string;
};

import { isToday, isTomorrow, format } from "date-fns";

// Helper to check if spot is open in current month (hardcoded logic for now)
function isSpotOpen(season?: string): boolean {
    if (!season) return true; // Assume open if unknown
    const s = season.toLowerCase();

    if (s.includes("hele jaar")) return true;

    const currentMonth = new Date().getMonth(); // 0-11. Dec = 11.
    // Examples: "oktober t/m april", "april t/m oktober", "juni t/m september"

    // Parse range map
    const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

    // Simple heuristic for "X t/m Y"
    if (s.includes("t/m")) {
        const parts = s.split("t/m");
        if (parts.length === 2) {
            const startStr = parts[0].trim().substring(0, 3);
            const endStr = parts[1].trim().substring(0, 3);

            let startIdx = months.findIndex(m => startStr.includes(m));
            let endIdx = months.findIndex(m => endStr.includes(m));

            if (startIdx !== -1 && endIdx !== -1) {
                if (startIdx <= endIdx) {
                    // Straight range (e.g. Apr-Oct)
                    return currentMonth >= startIdx && currentMonth <= endIdx;
                } else {
                    // Wrap range (e.g. Oct-Apr)
                    return currentMonth >= startIdx || currentMonth <= endIdx;
                }
            }
        }
    }

    return true; // Fallback
}

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
    const [locName, setLocName] = useState<string>("Locating...");
    const [isManualLoc, setIsManualLoc] = useState(false);
    const [manualAddress, setManualAddress] = useState("");

    const [radiusKm, setRadiusKm] = useState(50);
    const [initLocError, setInitLocError] = useState<string | null>(null);

    // Filters
    const [filterOpen, setFilterOpen] = useState(true);
    const [filterBeginner, setFilterBeginner] = useState(false);
    const [filterShallow, setFilterShallow] = useState(false);

    useEffect(() => {
        // Check local storage first
        const saved = localStorage.getItem("user_location");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.lat && parsed.lon) {
                    setLoc({ lat: parsed.lat, lon: parsed.lon });
                    setLocName(parsed.name || "Saved Location");
                    return;
                }
            } catch (e) {
                console.error("Failed to parse saved location", e);
            }
        }

        // Only auto-locate if we haven't manually set a location
        if (!loc) {
            getUserLocation().then(async (pos) => {
                setLoc(pos);
                setLocName("GPS Location"); // Temp
                const name = await reverseGeocode(pos.lat, pos.lon);
                setLocName(name);
            }).catch((e) => {
                setInitLocError(String(e?.message ?? e));
                setLocName("Unknown");
            });
        }
    }, []); // Only run once on mount (or if we intentionally want to re-trigger)

    const handleManualLocSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualAddress) return;

        setLocName("Searching...");
        const res = await geocodeAddress(manualAddress);
        if (res) {
            const newLoc = { lat: res.lat, lon: res.lon };
            setLoc(newLoc);
            setLocName(res.name);
            localStorage.setItem("user_location", JSON.stringify({ ...newLoc, name: res.name }));
            setIsManualLoc(false);
            setInitLocError(null);
        } else {
            setLocName("Not found");
            // Keep input open
        }
    };

    const handleUseGPS = () => {
        localStorage.removeItem("user_location");
        setLoc(null);
        setLocName("Locating...");
        setIsManualLoc(false);
        setManualAddress("");

        getUserLocation().then(async (pos) => {
            setLoc(pos);
            const name = await reverseGeocode(pos.lat, pos.lon);
            setLocName(name);
        }).catch((e) => {
            setInitLocError(String(e?.message ?? e));
            setLocName("Unknown");
        });
    };


    const inRange = useMemo(() => {
        if (!loc) return [];
        return (spots as Spot[])
            .filter(s => {
                if (filterOpen && !isSpotOpen(s.season)) return false;
                if (filterBeginner && !s.level?.some(l => l.toLowerCase().includes("beginner"))) return false;
                // Note: 'Ondiep' means Shallow. 'Diep' means Deep.
                if (filterShallow && !s.depth?.some(d => d.toLowerCase().includes("ondiep"))) return false;
                return true;
            })
            .map((s) => ({ spot: s, distanceKm: haversineKm(loc, { lat: s.lat, lon: s.lon }) }))
            .filter((x) => x.distanceKm <= radiusKm);
    }, [loc, radiusKm, filterOpen, filterBeginner, filterShallow]);

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
                windowLabel: label,
                image: x.spot.image // Pass image through
            };
        });
    }, [inRange, spotQueries]);

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['forecast'] });
    };

    return (
        <div className="container" style={{ padding: '0 16px' }}>
            {/* Header Section */}
            <header style={{ padding: '24px 0 16px 0' }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                        <h1 style={{ marginBottom: 4 }}>SendWindow</h1>
                        {/* Location Bar */}
                        {!isManualLoc ? (
                            <div className="location-bar">
                                <span>📍 {locName}</span>
                                <button
                                    onClick={() => { setIsManualLoc(true); setManualAddress(""); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 500 }}>
                                    Change
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleManualLocSubmit} style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                <input
                                    value={manualAddress}
                                    onChange={e => setManualAddress(e.target.value)}
                                    placeholder="City or Town..."
                                    style={{ fontSize: 13, padding: "6px 12px", borderRadius: 20, border: "1px solid #cbd5e1", outline: "none" }}
                                    autoFocus
                                />
                                <button type="submit" className="btn" style={{ background: "var(--color-primary)", color: "white" }}>Set</button>
                                <button type="button" onClick={handleUseGPS} className="btn" style={{ background: "#e2e8f0" }}>GPS</button>
                                <button type="button" onClick={() => setIsManualLoc(false)} className="btn-icon">✕</button>
                            </form>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={handleRefresh}
                            className="btn-icon"
                            style={{
                                transform: isRefetching ? "rotate(360deg)" : "none",
                                transition: "transform 1s ease"
                            }}
                            title="Refresh Forecasts"
                        >
                            🔄
                        </button>
                        <Link to="/alerts" className="btn-ghost" style={{ textDecoration: "none", fontWeight: 600 }}>🔔 Alerts</Link>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="filters-area">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div className="text-sm font-bold text-dim">FILTERS & SETTINGS</div>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                        <span className="text-sm">Radius:</span>
                        <select
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            style={{
                                padding: "4px 12px", borderRadius: 20, border: "1px solid #cbd5e1", background: "white", fontSize: 13
                            }}>
                            <option value={10}>10 km</option>
                            <option value={25}>25 km</option>
                            <option value={50}>50 km</option>
                            <option value={100}>100 km</option>
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <label className={`filter-chip ${filterOpen ? 'active' : ''}`}>
                            <input type="checkbox" checked={filterOpen} onChange={e => setFilterOpen(e.target.checked)} />
                            📅 Open Now
                        </label>
                        <label className={`filter-chip ${filterBeginner ? 'active' : ''}`}>
                            <input type="checkbox" checked={filterBeginner} onChange={e => setFilterBeginner(e.target.checked)} />
                            👶 Beginner Friendly
                        </label>
                        <label className={`filter-chip ${filterShallow ? 'active' : ''}`}>
                            <input type="checkbox" checked={filterShallow} onChange={e => setFilterShallow(e.target.checked)} />
                            🌊 Shallow Water
                        </label>
                    </div>

                    {filterOpen && (
                        <div className="text-xs text-dim" style={{ marginTop: 8 }}>
                            Showing spots open in {new Date().toLocaleString('default', { month: 'long' })}
                        </div>
                    )}
                </div>
            </header>

            {/* Content List */}
            <div style={{ paddingBottom: 40 }}>
                {rows.map((r) => (
                    <Link key={r.id} to={`/spot/${r.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                        <SpotCard {...r} />
                    </Link>
                ))}

                {loc && rows.length === 0 && !isRefetching && (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-dim)" }}>
                        No spots match your filters within {radiusKm}km.
                    </div>
                )}

                {(!loc && !initLocError) && (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-dim)" }}>
                        Allow location access to find spots near you.
                    </div>
                )}

                {initLocError && (
                    <div style={{ padding: 20, textAlign: "center", color: "var(--color-danger)" }}>
                        Location Error: {initLocError}
                    </div>
                )}

                {(isRefetching || (!rows.length && !initLocError)) && rows.length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-dim)" }}>
                        Loading forecasts...
                    </div>
                )}
            </div>
        </div>
    );
}
