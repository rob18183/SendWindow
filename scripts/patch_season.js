import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPath = path.join(__dirname, '../data/nkv_raw.json');
const spotsPath = path.join(__dirname, '../data/spots.nl.json');

const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const spotsData = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));

// Create a map of raw data by title (or permalink) for easy lookup
const rawMap = new Map();
rawData.forEach(r => {
    rawMap.set(r.titel, r.openstelling);
});

let updatedCount = 0;

spotsData.forEach(spot => {
    if (rawMap.has(spot.name)) {
        spot.season = rawMap.get(spot.name);
        updatedCount++;
    } else {
        console.warn(`Could not find raw data for ${spot.name}`);
        // Fallback default
        spot.season = "Het hele jaar";
    }
});

fs.writeFileSync(spotsPath, JSON.stringify(spotsData, null, 2));
console.log(`Patched ${updatedCount} spots with season data.`);
