
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const OSRM_URL = "http://192.168.68.47:5000/table/v1/driving";
const OUTPUT_FILE = path.resolve(__dirname, '../public/data/travel-matrix.json');
const SPOTS_FILE = path.resolve(__dirname, '../data/spots.nl.json');

// Major Dutch Cities (approximate centers)
const CITIES = [
    { name: "Amsterdam", lat: 52.3676, lon: 4.9041 },
    { name: "Rotterdam", lat: 51.9244, lon: 4.4777 },
    { name: "The Hague", lat: 52.0705, lon: 4.3007 },
    { name: "Utrecht", lat: 52.0907, lon: 5.1214 },
    { name: "Eindhoven", lat: 51.4416, lon: 5.4697 },
    { name: "Groningen", lat: 53.2194, lon: 6.5665 },
    { name: "Tilburg", lat: 51.5555, lon: 5.0913 },
    { name: "Almere", lat: 52.3508, lon: 5.2647 },
    { name: "Breda", lat: 51.5719, lon: 4.7683 },
    { name: "Nijmegen", lat: 51.8126, lon: 5.8372 },
    { name: "Apeldoorn", lat: 52.2112, lon: 5.9699 },
    { name: "Haarlem", lat: 52.3874, lon: 4.6462 },
    { name: "Enschede", lat: 52.2215, lon: 6.8937 },
    { name: "Arnhem", lat: 51.9851, lon: 5.8987 },
    { name: "Amersfoort", lat: 52.1561, lon: 5.3878 },
    { name: "Zaanstad", lat: 52.4390, lon: 4.8185 }, // Zaandam
    { name: "Den Bosch", lat: 51.6978, lon: 5.3037 },
    { name: "Haarlemmermeer", lat: 52.3035, lon: 4.6738 }, // Hoofddorp
    { name: "Zwolle", lat: 52.5168, lon: 6.0830 },
    { name: "Leiden", lat: 52.1601, lon: 4.4970 },
    { name: "Leeuwarden", lat: 53.2012, lon: 5.7999 },
    { name: "Maastricht", lat: 50.8514, lon: 5.6910 },
    { name: "Dordrecht", lat: 51.8133, lon: 4.6901 },
    { name: "Ede", lat: 52.0436, lon: 5.6667 },
    { name: "Alphen aan den Rijn", lat: 52.1287, lon: 4.6606 },
    { name: "Alkmaar", lat: 52.6324, lon: 4.7534 },
    { name: "Emmen", lat: 52.7858, lon: 6.8976 },
    { name: "Delft", lat: 52.0116, lon: 4.3571 },
    { name: "Venlo", lat: 51.3704, lon: 6.1724 },
    { name: "Deventer", lat: 52.2561, lon: 6.1627 },
    { name: "Helmond", lat: 51.4817, lon: 5.6611 },
    { name: "Hilversum", lat: 52.2292, lon: 5.1669 },
    { name: "Heerenveen", lat: 52.9620, lon: 5.9224 },
    { name: "Oss", lat: 51.7675, lon: 5.5165 },
    { name: "Amstelveen", lat: 52.3086, lon: 4.8622 },
    { name: "Purmerend", lat: 52.5026, lon: 4.9619 },
    { name: "Roosendaal", lat: 51.5304, lon: 4.4645 },
    { name: "Lelystad", lat: 52.5185, lon: 5.4714 },
    // A few strategic ones for spread
    { name: "Vlissingen", lat: 51.4552, lon: 3.5741 },
    { name: "Den Helder", lat: 52.9599, lon: 4.7593 },
    { name: "Gouda", lat: 52.0116, lon: 4.7105 }
];

// Helper to normalized city names for lookup keys (optional, but good for robust matching)
// For now, we will just use the name as provided in the list.

async function buildMatrix() {
    console.log(`Starting build for ${CITIES.length} cities...`);

    // Read spots
    let spots = [];
    try {
        const data = fs.readFileSync(SPOTS_FILE, 'utf8');
        spots = JSON.parse(data);
        console.log(`Loaded ${spots.length} spots.`);
    } catch (e) {
        console.error(`Failed to read spots file at ${SPOTS_FILE}:`, e);
        process.exit(1);
    }

    const matrix = {}; // { CityName: { SpotID: minutes, ... } }

    // Process each city
    for (const city of CITIES) {
        process.stdout.write(`Fetching for ${city.name.padEnd(20)}... `);

        try {
            // Build Coord String: City;Spot1;Spot2...
            const coords = [`${city.lon},${city.lat}`];
            spots.forEach(s => coords.push(`${s.lon},${s.lat}`));

            const url = `${OSRM_URL}/${coords.join(';')}?sources=0`;

            const start = performance.now();
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.code !== 'Ok' || !data.durations || !data.durations[0]) {
                throw new Error(`OSRM Error: ${data.code}`);
            }

            const durations = data.durations[0];
            durations.shift(); // Remove self-duration (0)

            // Map to Spot IDs
            const cityData = {};
            spots.forEach((spot, i) => {
                const seconds = durations[i];
                if (seconds !== null && seconds !== undefined) {
                    cityData[spot.id] = Math.round(seconds / 60);
                }
            });

            matrix[city.name] = cityData;

            const duration = performance.now() - start;
            console.log(`OK (${Object.keys(cityData).length} routes, ${duration.toFixed(0)}ms)`);

        } catch (e) {
            console.log(`FAILED: ${e.message}`);
        }
    }

    // Stats
    const totalKeys = Object.keys(matrix).length;
    console.log(`\nCompleted. Populated matrix for ${totalKeys}/${CITIES.length} cities.`);

    // Save
    try {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(matrix, null, 2)); // Pretty print for debug, minified usually better for prod but this is small
        const stats = fs.statSync(OUTPUT_FILE);
        console.log(`Saved to ${OUTPUT_FILE} (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
        console.error("Failed to write output file:", e);
    }
}

buildMatrix();
