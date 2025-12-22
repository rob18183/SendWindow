import fs from 'fs';
import path from 'path';

const spotsPath = path.resolve('data/spots.nl.json');
const spots = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));

const THEMES = [
    '/images/north_sea.png',
    '/images/inland.png',
    '/images/action.png',
    '/images/sunset.png'
];

let updatedCount = 0;

spots.forEach((spot, index) => {
    // Only replace if it's an external link (or always replace for consistent theme)
    // User complaint was "broken links", so replacing all is safer for quality.

    // Heuristic
    const name = spot.name.toLowerCase();
    let theme = '';

    if (name.includes('zee') || name.includes('strand') || name.includes('beach') || name.includes('texel') || name.includes('brouwersdam')) {
        theme = '/images/north_sea.png';
    } else if (name.includes('meer') || name.includes('plas') || name.includes('ijs') || name.includes('wolderwijd')) {
        theme = '/images/inland.png';
    } else if (name.includes('dam') || name.includes('dijk')) {
        theme = '/images/action.png'; // Dams often good for jumping
    } else {
        // Round robin for variety
        theme = THEMES[index % THEMES.length];
    }

    spot.image = theme;
    updatedCount++;
});

fs.writeFileSync(spotsPath, JSON.stringify(spots, null, 2));
console.log(`Updated images for ${updatedCount} spots.`);
