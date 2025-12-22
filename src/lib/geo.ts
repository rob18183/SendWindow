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
