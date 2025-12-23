const fs = require('fs');
const path = require('path');

const spotsPath = path.join(__dirname, '../data/spots.nl.json');
const spots = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));

const images = {
    coastal: [
        '/images/north_sea_waves.png',
        '/images/north_sea_waves.png',
        '/images/north_sea_beach.png',
        '/images/north_sea_beach.png',
        '/images/sunset_session.png',
        '/images/stormy_coast.png'
    ],
    inland: [
        '/images/inland_lake_flat.png',
        '/images/inland_lake_flat.png',
        '/images/inland_lake_action.png'
    ]
};

function getRandomImage(list) {
    return list[Math.floor(Math.random() * list.length)];
}

let updatedCount = 0;

spots.forEach(spot => {
    // Simple heuristic for inland vs coastal
    // Inland: roughly > 5.0 Lon AND < 53.0 Lat (excludes Wadden islands which are coastal but high Lat)
    // Or name contains 'meer', 'plas'

    // Note: Wadden islands (Texel, etc) are coastal. Lat > 53.
    // West coast is Lon < 5.0.

    const isInland = (spot.lon > 5.1 && spot.lat < 53.0) ||
        spot.name.toLowerCase().includes('meer') ||
        spot.name.toLowerCase().includes('plas');

    // Keep existing if it's already one of our new ones (re-run safety)
    const currentImg = spot.image || '';
    if (currentImg.includes('north_sea_') || currentImg.includes('inland_lake_') || currentImg.includes('sunset_') || currentImg.includes('stormy_')) {
        // Already updated? Maybe re-roll if we want diversity, but let's overwrite for now to ensure distribution
    }

    if (isInland) {
        spot.image = getRandomImage(images.inland);
    } else {
        spot.image = getRandomImage(images.coastal);
    }
    updatedCount++;
});

fs.writeFileSync(spotsPath, JSON.stringify(spots, null, 2));
console.log(`Updated images for ${updatedCount} spots.`);
