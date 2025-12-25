
import spotsData from '../../data/spots.nl.json';

export function getUserLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
        );
    });
}

const R = 6371; // Earth radius in km

export function haversineKm(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }) {
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lon - p1.lon) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function getCardinalDirection(deg: number): string {
    const cardinals = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    ];
    const val = Math.floor((deg / 22.5) + 0.5);
    return cardinals[(val % 16)];
}

// Basic rate limiting/caching could be good, but for now direct calls.
// Nominatim usage policy requires User-Agent.

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SendWindowApp/1.0' } });
        if (!res.ok) throw new Error("Geocode failed");
        const data = await res.json();
        const addr = data.address;
        // Prioritize: city, town, village, suburb, municipality
        return addr.city || addr.town || addr.village || addr.suburb || addr.municipality || data.display_name.split(',')[0];
    } catch (e) {
        console.warn("Reverse geocode error:", e);
        return "Unknown Location";
    }
}

export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number; name: string } | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SendWindowApp/1.0' } });
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0] };
        }
        return null;
    } catch (e) {
        console.warn("Forward geocode error:", e);
        return null;
    }
}



// Simple Rate Limiter for OSRM Demo Server
// Limit: ~1 request per second to be safe
const requestQueue: (() => Promise<void>)[] = [];
let isProcessingQueue = false;

async function processQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (requestQueue.length > 0) {
        const task = requestQueue.shift();
        if (task) {
            await task();
            // Wait 1s between calls
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    isProcessingQueue = false;
}

function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        requestQueue.push(async () => {
            try {
                const result = await fn();
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
        processQueue();
    });
}


// Static Grid Matrix Cache
// Format: Array of { lat, lon, times: number[] }
interface GridPoint {
    lat: number;
    lon: number;
    times: number[];
}
let travelGrid: GridPoint[] | null = null;
let isFetchingGrid = false;

// Optimization: Create a SpotIndex map once for fast lookup
const spotIdToIndex = new Map<string, number>();
spotsData.forEach((s, i) => spotIdToIndex.set(s.id, i));

async function loadTravelGrid() {
    if (travelGrid || isFetchingGrid) return;
    isFetchingGrid = true;
    try {
        const res = await fetch('/data/travel-grid.json');
        if (res.ok) {
            travelGrid = await res.json();
            console.log(`Travel grid loaded (${travelGrid?.length} points)`);
        }
    } catch (e) {
        console.warn("Failed to load travel grid", e);
    } finally {
        isFetchingGrid = false;
    }
}

// Load immediately
loadTravelGrid();

export async function getDrivingDuration(
    start: { lat: number; lon: number; name?: string },
    end: { lat: number; lon: number; id?: string }
): Promise<number | null> {

    // 1. Spatial Grid Lookup
    if (travelGrid && travelGrid.length > 0 && end.id) {
        // Find nearest grid point
        let minDist = Infinity;
        let closest: GridPoint | null = null;

        const SLAT = start.lat;
        const SLON = start.lon;

        // Simple linear scan (fast enough for <10k points)
        // Optimization: Only check points within rough box
        for (let i = 0; i < travelGrid.length; i++) {
            const p = travelGrid[i];
            const dLat = p.lat - SLAT;
            const dLon = p.lon - SLON;

            // 5km approx bounding box check (0.05 deg)
            if (Math.abs(dLat) > 0.05 || Math.abs(dLon) > 0.08) continue;

            const distSq = dLat * dLat + dLon * dLon;
            if (distSq < minDist) {
                minDist = distSq;
                closest = p;
            }
        }

        // Threshold: ~4km (0.005 deg^2 approx)
        if (closest && minDist < 0.005) {
            const spotIndex = spotIdToIndex.get(end.id!);
            if (spotIndex !== undefined) {
                const time = closest.times[spotIndex];
                if (time > 0) return time;
            }
        }
    }

    const key = `travel_${start.lat.toFixed(3)},${start.lon.toFixed(3)}_${end.lat.toFixed(3)},${end.lon.toFixed(3)}`;

    // Check cache
    try {
        const cached = localStorage.getItem(key);
        if (cached) return parseInt(cached, 10);
    } catch (e) { /* ignore */ }

    // Wrap the fetch in the rate limiter logic
    const performFetch = async () => {
        try {
            // Read env var (Vite exposed)
            const baseUrl = import.meta.env.VITE_OSRM_URL || "https://router.project-osrm.org/route/v1/driving";
            // If using the public demo server, use the queue. If self-hosted, go direct.
            const isDemo = baseUrl.includes("router.project-osrm.org");

            // Construct request
            const performRequest = async () => {
                const url = `${baseUrl}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`;
                const res = await fetch(url);
                if (!res.ok) return null;
                const data = await res.json();
                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    return Math.round(data.routes[0].duration / 60);
                }
                return null;
            };

            const minutes = isDemo ? await enqueueRequest(performRequest) : await performRequest();

            if (minutes !== null) {
                try {
                    localStorage.setItem(key, String(minutes));
                } catch (e) { /* full? */ }
                return minutes;
            }
            return null;
        } catch (e) {
            console.warn("OSRM error:", e);
            return null;
        }
    };

    return performFetch();
}
