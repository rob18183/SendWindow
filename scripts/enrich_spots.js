import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPOTS_PATH = path.join(__dirname, '../data/spots.nl.json');

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start
        .replace(/-+$/, '');            // Trim - from end
}

// Special overrides for tricky names if needed
const SLUG_OVERRIDES = {
    "maasvlakte-2-slufter": "maasvlakte_slufter",
    "maasvlakte-2-p5-en-p6": "maasvlakte_p5_p6"
};

async function main() {
    console.log(`Reading spots from ${SPOTS_PATH}...`);
    const raw = fs.readFileSync(SPOTS_PATH, 'utf-8');
    const spots = JSON.parse(raw);

    let updatedCount = 0;

    for (const spot of spots) {
        // ALWAYS update to fix broken links from previous run
        const forecasts = [];

        // 1. Windy (Lat/Lon based - Accurate)
        forecasts.push({
            name: "Windy",
            url: `https://www.windy.com/${spot.lat.toFixed(4)}/${spot.lon.toFixed(4)}?${spot.lat.toFixed(4)},${spot.lon.toFixed(4)},11`
        });

        // 2. Windfinder (Map based - 100% Reliable)
        // Slug generation was unreliable. Using map view instead.
        forecasts.push({
            name: "Windfinder",
            url: `https://www.windfinder.com/#12/${spot.lat.toFixed(4)}/${spot.lon.toFixed(4)}`
        });

        spot.external_forecasts = forecasts;
        updatedCount++;
    }

    if (updatedCount > 0) {
        fs.writeFileSync(SPOTS_PATH, JSON.stringify(spots, null, 2), 'utf-8');
        console.log(`✅ Updated ${updatedCount} spots with forecast links.`);
    } else {
        console.log("All spots already have forecast links. No changes made.");
    }
}

main();
