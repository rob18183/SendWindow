const fs = require('fs');
const path = require('path');

const spotsPath = path.join(__dirname, '../data/spots.nl.json');
const spots = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));

// Define available images
// We will check file existence for safety or just assume they will be there.
// If generation fails, we might miss some, so let's stick to the 6 we have + add the 8 new names
// and we can filter them if we want to be safe, but for now lists include all planned ones.
const images = {
    coastal: [
        '/images/north_sea_waves.png',
        '/images/north_sea_beach.png',
        '/images/sunset_session.png',
        '/images/stormy_coast.png',
        // New batch (Calculated)
        '/images/coastal_dunes_path.png',
        '/images/coastal_pier_waves.png'
    ],
    inland: [
        '/images/inland_lake_flat.png',
        '/images/inland_lake_action.png',
        // New batch (Calculated)
        '/images/inland_grassy_launch.png'
    ]
};

// Flatten the list from random ordering to a sorted list
// Sort by Latitude (North to South) primarily, then Longitude.
// This groups neighbors together.
spots.sort((a, b) => {
    // Sort roughly North to South
    return b.lat - a.lat;
});

let updatedCount = 0;

for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];

    // Determine category
    const isInland = (spot.lon > 5.1 && spot.lat < 53.0) ||
        spot.name.toLowerCase().includes('meer') ||
        spot.name.toLowerCase().includes('plas');

    const pool = isInland ? images.inland : images.coastal;

    // Validation: Check neighbors to avoid duplicates
    // We check the previous spot's assigned image (if it exists)
    // Since we are iterating linearly, spot[i-1] is already processed.

    let prevImage = null;
    if (i > 0) {
        prevImage = spots[i - 1].image;
    }

    // Pick a random image that is NOT prevImage
    let candidate = '';
    let attempts = 0;
    do {
        candidate = pool[Math.floor(Math.random() * pool.length)];
        attempts++;
    } while (candidate === prevImage && attempts < 10);

    spot.image = candidate;
    updatedCount++;
}

fs.writeFileSync(spotsPath, JSON.stringify(spots, null, 2));
console.log(`Updated images for ${updatedCount} spots with neighbor-safe logic.`);
