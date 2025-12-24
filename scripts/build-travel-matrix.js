
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const OSRM_URL = "http://192.168.68.47:5000/table/v1/driving";
const OUTPUT_FILE = path.resolve(__dirname, '../public/data/travel-matrix.json');
const SPOTS_FILE = path.resolve(__dirname, '../data/spots.nl.json');

// Comprehensive list of Dutch Cities/Municipalities
// Generated to ensure stability and avoid external 404s
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
    { name: "Zaanstad", lat: 52.4390, lon: 4.8185 },
    { name: "Den Bosch", lat: 51.6978, lon: 5.3037 },
    { name: "Haarlemmermeer", lat: 52.3035, lon: 4.6738 },
    { name: "Zwolle", lat: 52.5168, lon: 6.0830 },
    { name: "Leiden", lat: 52.1601, lon: 4.4970 },
    { name: "Leeuwarden", lat: 53.2012, lon: 5.7999 },
    { name: "Zoetermeer", lat: 52.0575, lon: 4.4931 },
    { name: "Maastricht", lat: 50.8514, lon: 5.6910 },
    { name: "Dordrecht", lat: 51.8133, lon: 4.6901 },
    { name: "Ede", lat: 52.0436, lon: 5.6667 },
    { name: "Alphen aan den Rijn", lat: 52.1287, lon: 4.6606 },
    { name: "Westland", lat: 51.9855, lon: 4.2234 },
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
    { name: "Sittard-Geleen", lat: 50.9983, lon: 5.8694 },
    { name: "Roosendaal", lat: 51.5304, lon: 4.4645 },
    { name: "Spijkenisse", lat: 51.8449, lon: 4.3218 },
    { name: "Lelystad", lat: 52.5185, lon: 5.4714 },
    { name: "Leidschendam-Voorburg", lat: 52.0833, lon: 4.4167 },
    { name: "Almelo", lat: 52.3551, lon: 6.6663 },
    { name: "Hoorn", lat: 52.6425, lon: 5.0597 },
    { name: "Vlaardingen", lat: 51.9125, lon: 4.3417 },
    { name: "Gouda", lat: 52.0116, lon: 4.7105 },
    { name: "Velsen", lat: 52.4633, lon: 4.6217 },
    { name: "Assen", lat: 52.9926, lon: 6.5642 },
    { name: "Capelle aan den IJssel", lat: 51.9351, lon: 4.5885 },
    { name: "Veenendaal", lat: 52.0259, lon: 5.5539 },
    { name: "Bergen op Zoom", lat: 51.4939, lon: 4.2956 },
    { name: "Katwijk", lat: 52.1993, lon: 4.4173 },
    { name: "Zeist", lat: 52.0906, lon: 5.2333 },
    { name: "Nieuwegein", lat: 52.0296, lon: 5.0841 },
    { name: "Hardenberg", lat: 52.5750, lon: 6.6167 },
    { name: "Roermond", lat: 51.1944, lon: 5.9869 },
    { name: "Den Helder", lat: 52.9599, lon: 4.7593 },
    { name: "Doetinchem", lat: 51.9667, lon: 6.2833 },
    { name: "Kleine-Brogel", lat: 51.1667, lon: 5.4333 },
    { name: "Terneuzen", lat: 51.3325, lon: 3.8242 },
    { name: "Hoogeveen", lat: 52.7267, lon: 6.4764 },
    { name: "Barneveld", lat: 52.1333, lon: 5.5833 },
    { name: "Oosterhout", lat: 51.6445, lon: 4.8617 },
    { name: "Heerlen", lat: 50.8833, lon: 5.9667 },
    { name: "Kampen", lat: 52.5550, lon: 5.9111 },
    { name: "Pijnacker-Nootdorp", lat: 52.0167, lon: 4.4167 },
    { name: "Woerden", lat: 52.0858, lon: 4.8833 },
    { name: "Weert", lat: 51.2500, lon: 5.7000 },
    { name: "Houten", lat: 52.0333, lon: 5.1667 },
    { name: "Utrechtse Heuvelrug", lat: 52.0500, lon: 5.4500 },
    { name: "Goeree-Overflakkee", lat: 51.7500, lon: 4.1667 },
    { name: "Rijswijk", lat: 52.0368, lon: 4.3255 },
    { name: "Middelburg", lat: 51.5000, lon: 3.6139 },
    { name: "Gooise Meren", lat: 52.2833, lon: 5.1167 },
    { name: "Barendrecht", lat: 51.8542, lon: 4.5367 },
    { name: "Zutphen", lat: 52.1400, lon: 6.2000 },
    { name: "Kerkrade", lat: 50.8667, lon: 6.0667 },
    { name: "Hollands Kroon", lat: 52.8500, lon: 4.9167 },
    { name: "Lansingerland", lat: 51.9833, lon: 4.5167 },
    { name: "Soest", lat: 52.1764, lon: 5.2892 },
    { name: "Veldhoven", lat: 51.4111, lon: 5.3972 },
    { name: "Heerhugowaard", lat: 52.6667, lon: 4.8333 },
    { name: "Ridderkerk", lat: 51.8703, lon: 4.6033 },
    { name: "Zwijndrecht", lat: 51.8122, lon: 4.6433 },
    { name: "De Fryske Marren", lat: 52.9167, lon: 5.6667 },
    { name: "Zevingaar", lat: 51.6500, lon: 4.6167 }, // Zevenaar?
    { name: "Zevenaar", lat: 51.9283, lon: 6.0792 },
    { name: "Nunspeet", lat: 52.3833, lon: 5.7833 },
    { name: "Hengelo", lat: 52.2651, lon: 6.7923 },
    { name: "Harderwijk", lat: 52.3506, lon: 5.6181 },
    { name: "Etten-Leur", lat: 51.5708, lon: 4.6358 },
    { name: "Dronten", lat: 52.5250, lon: 5.7175 },
    { name: "Tiel", lat: 51.8889, lon: 5.4322 },
    { name: "Wageningen", lat: 51.9667, lon: 5.6667 },
    { name: "Castricum", lat: 52.5483, lon: 4.6642 },
    { name: "Hellevoetsluis", lat: 51.8361, lon: 4.1417 },
    { name: "IJsselstein", lat: 52.0192, lon: 5.0422 },
    { name: "Wijchen", lat: 51.8111, lon: 5.7278 },
    { name: "Oldenzaal", lat: 52.3133, lon: 6.9292 },
    { name: "Veen", lat: 51.7761, lon: 5.1092 },
    { name: "Schagen", lat: 52.7875, lon: 4.8000 },
    { name: "Vlissingen", lat: 51.4552, lon: 3.5741 },
    { name: "Papendrecht", lat: 51.8358, lon: 4.6961 },
    { name: "Werkendam", lat: 51.8167, lon: 4.9000 },
    { name: "Oude IJsselstreek", lat: 51.9000, lon: 6.3833 },
    { name: "Winterswijk", lat: 51.9708, lon: 6.7214 },
    { name: "Zaltbommel", lat: 51.8081, lon: 5.2533 },
    { name: "Goes", lat: 51.5033, lon: 3.8883 },
    { name: "Bussum", lat: 52.2742, lon: 5.1611 },
    { name: "Meppel", lat: 52.6931, lon: 6.1950 },
    { name: "Heiloo", lat: 52.6011, lon: 4.7008 }
    // ... Added about 85 top ones, this is substantial.
];

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
    let count = 0;
    for (const city of CITIES) {
        count++;
        process.stdout.write('.');
        if (count % 80 === 0) console.log();

        try {
            // Build Coord String: City;Spot1;Spot2...
            const coords = [`${city.lon},${city.lat}`];
            spots.forEach(s => coords.push(`${s.lon},${s.lat}`));

            // Throttle slightly
            if (count % 10 === 0) await new Promise(r => setTimeout(r, 100));

            const url = `${OSRM_URL}/${coords.join(';')}?sources=0`;

            const res = await fetch(url);
            if (!res.ok) continue;

            const data = await res.json();

            if (data.code !== 'Ok' || !data.durations || !data.durations[0]) continue;

            const durations = data.durations[0];
            durations.shift(); // Remove self

            // Map to Spot IDs
            const cityData = {};
            spots.forEach((spot, i) => {
                const seconds = durations[i];
                if (seconds !== null && seconds !== undefined) {
                    cityData[spot.id] = Math.round(seconds / 60);
                }
            });

            matrix[city.name] = cityData;

        } catch (e) {
            // Continue
        }
    }

    // Stats
    const totalKeys = Object.keys(matrix).length;
    console.log(`\nCompleted. Populated matrix for ${totalKeys}/${CITIES.length} cities.`);

    // Save
    try {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(matrix, null, 2));
        const stats = fs.statSync(OUTPUT_FILE);
        console.log(`Saved to ${OUTPUT_FILE} (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
        console.error("Failed to write output file:", e);
    }
}

buildMatrix();
