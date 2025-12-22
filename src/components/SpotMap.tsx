import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon missing assets
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type SpotMapProps = {
    lat: number;
    lon: number;
    name: string;
    userLat?: number;
    userLon?: number;
};

export function SpotMap({ lat, lon, name, userLat, userLon }: SpotMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        // Fix Icon logic (run once)
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: markerIcon2x,
            iconUrl: markerIcon,
            shadowUrl: markerShadow,
        });

        if (!mapRef.current) return;

        // Init map if not exists
        if (!mapInstanceRef.current) {
            const map = L.map(mapRef.current).setView([lat, lon], 10);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            mapInstanceRef.current = map;
        }

        const map = mapInstanceRef.current;

        // Update View
        map.setView([lat, lon], 10);

        // Clear existing markers (simple approach: remove all layers that are markers? 
        // Or just re-render is rare enough. Let's just add new ones for simplicity or clear known ones logic is complex without tracking).
        // Actually, for this MVP, the component usually mounts once per page visit.
        // But to be safe, we can clear layers.
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        // Add Spot Marker
        L.marker([lat, lon])
            .addTo(map)
            .bindPopup(name)
            .openPopup();

        // Add User Marker
        if (userLat && userLon) {
            L.marker([userLat, userLon])
                .addTo(map)
                .bindPopup("You");
        }

        // Cleanup on unmount
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [lat, lon, name, userLat, userLon]);

    return (
        <div
            ref={mapRef}
            style={{ height: 200, width: '100%', borderRadius: 12, overflow: 'hidden' }}
        />
    );
}
