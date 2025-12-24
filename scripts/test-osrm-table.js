
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const OSRM_URL = "http://192.168.68.47:5000/table/v1/driving";
// Amsterdam Central
const START_POS = { lat: 52.379189, lon: 4.899431, name: "Amsterdam Central" };

const spotsPath = path.resolve(__dirname, '../data/spots.nl.json');
const spots = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));

console.log(`Loaded ${spots.length} spots.`);

async function fetchTravelTimes() {
    console.log(`Fetching travel times from: ${START_POS.name} (${START_POS.lat}, ${START_POS.lon})`);

    // OSRM Table API format:
    // /table/v1/driving/{lon},{lat};{lon},{lat};...?sources=0
    // sources=0 means the first coordinate is the source, and all others are destinations.

    // 1. Build Coordinate String
    // Start with Source
    const coords = [`${START_POS.lon},${START_POS.lat}`];

    // Add destinations
    spots.forEach(spot => {
        coords.push(`${spot.lon},${spot.lat}`);
    });

    const coordString = coords.join(';');
    const url = `${OSRM_URL}/${coordString}?sources=0`; // &annotations=duration is default

    console.log(`Requesting OSRM Table (URL length: ${url.length})...`);

    // 2. Fetch
    const start = performance.now();
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const duration = performance.now() - start;

        console.log(`OSRM Response in ${duration.toFixed(2)}ms`);

        if (data.code !== 'Ok') {
            console.error("OSRM Error Code:", data.code);
            return;
        }

        // 3. Process Results
        // data.durations[0] is an array of travel times from source to all destinations (including itself at index 0)
        const durations = data.durations[0];

        // Remove the first element (travel to itself, usually 0)
        durations.shift();

        if (durations.length !== spots.length) {
            console.warn(`Mismatch in result count! Expected ${spots.length}, got ${durations.length}`);
        }

        console.log("\nSample Results (First 5):");
        for (let i = 0; i < Math.min(5, spots.length); i++) {
            const timeSeconds = durations[i];
            const timeMinutes = timeSeconds ? Math.round(timeSeconds / 60) : null;
            console.log(`- To ${spots[i].name}: ${timeMinutes} min (${(timeSeconds / 60).toFixed(1)}m)`);
        }

        // Stats
        const validTimes = durations.filter(d => d !== null);
        const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
        console.log(`\nSuccessfully calculated ${validTimes.length}/${spots.length} routes.`);
        console.log(`Average travel time: ${(avg / 60).toFixed(1)} min.`);

    } catch (e) {
        console.error("Failed to fetch OSRM data:", e);
    }
}

fetchTravelTimes();
