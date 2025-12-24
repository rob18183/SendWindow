
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const OSRM_URL = "http://192.168.68.47:5000/table/v1/driving";
const OUTPUT_FILE = path.resolve(__dirname, '../public/data/travel-grid.json');
const SPOTS_FILE = path.resolve(__dirname, '../data/spots.nl.json');

// NL Bounding Box (approx)
const BOUNDS = {
    minLat: 50.7,
    maxLat: 53.6,
    minLon: 3.3,
    maxLon: 7.3
};

// Grid Spacing (approx 3km)
const STEP_LAT = 0.027; // ~3km
const STEP_LON = 0.044; // ~3km

async function buildGrid() {
    console.log("Generating grid points...");

    // Read spots
    let spots = [];
    try {
        const data = fs.readFileSync(SPOTS_FILE, 'utf8');
        spots = JSON.parse(data);
        console.log(`Loaded ${spots.length} spots.`);
    } catch (e) {
        console.error("Failed to read spots file:", e);
        process.exit(1);
    }

    const grid = [];

    // Generate Grid Points
    for (let lat = BOUNDS.minLat; lat <= BOUNDS.maxLat; lat += STEP_LAT) {
        for (let lon = BOUNDS.minLon; lon <= BOUNDS.maxLon; lon += STEP_LON) {
            // Optional: Simple check if roughly in NL (could use a polygon, but bbox is fine for now)
            // We'll trust OSRM to return null or fast fail for sea points if routing fails,
            // but actually OSRM snaps to nearest road. So sea points will snap to coast. useful!
            grid.push({ lat, lon });
        }
    }

    console.log(`Generated ${grid.length} grid points.`);

    // Result Storage
    // We will store as an array of entries to save space: [lat, lon, [time1, time2...]]
    // Precision: lat/lon to 3 decimals, times as integers
    const resultMatrix = [];

    let count = 0;
    const total = grid.length;
    const batchSize = 1; // Keep it safe to avoid overload (OSRM might handle more but safety first)

    for (const point of grid) {
        count++;
        if (count % 50 === 0) process.stdout.write(`${Math.round(count / total * 100)}% `);

        try {
            // Build Request
            const coords = [`${point.lon.toFixed(5)},${point.lat.toFixed(5)}`];
            spots.forEach(s => coords.push(`${s.lon},${s.lat}`));

            const url = `${OSRM_URL}/${coords.join(';')}?sources=0`;

            // Throttle
            if (count % 10 === 0) await new Promise(r => setTimeout(r, 20));

            const res = await fetch(url);
            if (!res.ok) continue;

            const data = await res.json();
            if (data.code !== 'Ok' || !data.durations) continue;

            const times = data.durations[0];
            times.shift(); // Remove self

            // Compress: Store as simple array of minutes. 
            // -1 or 0 for unreachable? 
            // We use standard map: index matches spot index in spots.json
            const minutes = times.map(t => (t === null ? -1 : Math.round(t / 60)));

            // Optimization: If ALL are -1 (unreachable/middle of sea), typically we discard.
            // But OSRM usually snaps. Let's keep if valid.
            const validCount = minutes.filter(m => m > 0).length;
            if (validCount > 0) {
                resultMatrix.push({
                    lat: parseFloat(point.lat.toFixed(4)),
                    lon: parseFloat(point.lon.toFixed(4)),
                    times: minutes
                });
            }

        } catch (e) {
            // console.error(e);
        }
    }

    console.log(`\nCompleted. Valid Grid Points: ${resultMatrix.length}`);

    // Save
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(resultMatrix)); // Minified
    const stats = fs.statSync(OUTPUT_FILE);
    console.log(`Saved to ${OUTPUT_FILE} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

buildGrid();
