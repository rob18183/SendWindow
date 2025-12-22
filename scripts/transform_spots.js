import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPath = path.join(__dirname, '../data/nkv_raw.json');
const outPath = path.join(__dirname, '../data/spots.nl.json');

const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

const DIR_MAP = {
    "Noord": 0,
    "Noordoost": 45,
    "Oost": 90,
    "Zuidoost": 135,
    "Zuid": 180,
    "Zuidwest": 225,
    "West": 270,
    "Noordwest": 315
};

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function normalizeAngle(a) {
    return (a % 360 + 360) % 360;
}

function getRanges(directions) {
    if (!directions || directions.length === 0) return [];

    // Convert named directions to intervals [start, end]
    // Assuming each direction covers +/- 22.5 degrees
    let intervals = [];
    directions.forEach(d => {
        const center = DIR_MAP[d];
        if (center !== undefined) {
            let start = center - 22.5;
            let end = center + 22.5;
            // Normalize immediately? No, keep it linear for merging if possible, but 0/360 wrap is tricky.
            // Let's normalize to 0-360, but handle wrap-around by splitting if needed.

            start = normalizeAngle(start);
            end = normalizeAngle(end);

            if (start > end) {
                // Crosses North
                intervals.push({ start: start, end: 360 });
                intervals.push({ start: 0, end: end });
            } else {
                intervals.push({ start, end });
            }
        }
    });

    if (intervals.length === 0) return [];

    // Sort by start
    intervals.sort((a, b) => a.start - b.start);

    // Merge
    const merged = [];
    let current = intervals[0];

    for (let i = 1; i < intervals.length; i++) {
        const next = intervals[i];
        if (next.start <= current.end + 0.1) { // 0.1 tolerance for float
            current.end = Math.max(current.end, next.end);
        } else {
            merged.push(current);
            current = next;
        }
    }
    merged.push(current);

    // Check if last merges with first (wrap around 360)
    // If last ends at 360 and first starts at 0
    if (merged.length > 1) {
        const last = merged[merged.length - 1];
        const first = merged[0];
        if (Math.abs(last.end - 360) < 0.1 && Math.abs(first.start - 0) < 0.1) {
            // We can represent this as one range that wraps.
            // The format expects {start, end}. If start > end, it implies wrapping?
            // Let's check the existing data.
            // Existing: { "start": 210, "end": 10 } -> this means 210 -> 360 -> 10.
            // So yes, we can combine them.

            // Remove last and first, add combined
            merged.pop();
            merged.shift();
            merged.push({ start: last.start, end: first.end });
        }
    } else if (merged.length === 1) {
        // If it's 0-360 full circle?
    }

    // Final normalization of values to integer?
    return merged.map(m => ({
        start: Math.round(m.start),
        end: Math.round(m.end)
    }));
}

const transformed = rawData.map(spot => {
    return {
        id: slugify(spot.titel),
        name: spot.titel,
        lat: spot.lat_lng[0],
        lon: spot.lat_lng[1],
        permalink: spot.permalink,
        image: spot.afbeelding,
        level: spot.niveau,
        depth: spot.waterdiepte,
        good_dirs: getRanges(spot.windrichting || []),
        // Optional: unsafe_dirs could be the inverse, but let's leave valid empty for now
        // or specifically map 'unsafe' if source had it.
        unsafe_dirs: []
    };
});

console.log(`Transformed ${transformed.length} spots.`);
fs.writeFileSync(outPath, JSON.stringify(transformed, null, 2));
console.log(`Saved to ${outPath}`);
