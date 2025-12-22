import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// import * as cheerio from 'cheerio'; // Removed to avoid dependency 
// Actually, user environment might not have cheerio. Let's try simple regex/string parsing first to avoid dependency hell 
// or I can assume I can install it? The prompt says "Using the browser subagent" is one way, but for batch scraping 100 pages,
// running the browser subagent 100 times is slow and expensive.
// A simple fetch + regex/string parsing is better for this limited scope.
// However, the text content extraction is much easier with a DOM parser.
// I will try to use a basic regex approach for the distinct headers.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../data/spots.nl.json');
const spots = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Politeness delay
const DELAY_MS = 1000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple text cleaner
function cleanText(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]+>/g, '') // Strip tags
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function scrapeSpot(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const html = await res.text();

        // Extract Description (Usually in a specific div or first p tags after header)
        // Adjust these regexes based on inspection
        // Inspection showed: 
        // Description is often the first block of text.
        // Rules are under "Regels" header? 
        // Hazards under "Wees alert op"
        // Facilities under "Locatie & faciliteiten"

        // Let's use simple block extraction defined by headers.

        // Updated extraction logic based on Fusion Builder inspection

        // 1. Facilities (Locatie & Faciliteiten)
        // Usually follows id="locatie" anchor. Look for fusion-checklist
        // Regex: id="locatie".*?fusion-checklist.*?>(.*?)<\/ul> 
        // Note: JS dot doesn't match newline, use [\s\S]
        const facilitiesMatch = html.match(/id="locatie"[\s\S]*?class="[^"]*fusion-checklist[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
        let facilities = facilitiesMatch ? cleanText(facilitiesMatch[1]) : undefined;

        // 2. Main Content (Spot info + Hazards)
        // Usually in a fusion-text block. "Wees alert op:" is a strong signal.
        // We look for the "Wees alert op:" string and extract the UL following it.
        const hazardsMatch = html.match(/Wees alert op:[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
        let hazards = hazardsMatch ? cleanText(hazardsMatch[1]) : undefined;

        // 3. Description
        // It's the text before "Wees alert op:" in the same block, OR if "Wees alert op" is missing, it's the text after "Spot info"
        // Let's try to capture the text between "Spot info" header and "Wees alert op"
        // "Spot info" might be in an h3.
        const descMatch = html.match(/>\s*Spot info\s*<[\s\S]*?<\/h[1-6]>([\s\S]*?)Wees alert op:/i);
        let description = "";

        if (descMatch) {
            description = cleanText(descMatch[1]);
        } else {
            // Fallback: If no "Wees alert op", just take text after Spot Info until next section or reasonable length?
            // Or maybe just the first fusion-text block?
            const backupMatch = html.match(/>\s*Spot info\s*<[\s\S]*?<\/h[1-6]>([\s\S]*?)<div/i);
            if (backupMatch) description = cleanText(backupMatch[1]);
        }

        // Rules? "Regels" header
        const rulesMatch = html.match(/>\s*Regels\s*<[\s\S]*?<\/h[1-6]>([\s\S]*?)<(h[1-6]|div|section)/i);
        let rules = rulesMatch ? cleanText(rulesMatch[1]) : undefined;

        return {
            description: description || undefined,
            hazards: hazards || undefined,
            facilities: facilities || undefined,
            rules: rules || undefined,
            last_scraped: new Date().toISOString()
        };

    } catch (e) {
        console.error(`Error scraping ${url}:`, e.message);
        return null;
    }
}

async function processSpots() {
    console.log(`Processing ${spots.length} spots...`);
    let updatedCount = 0;

    for (let i = 0; i < spots.length; i++) {
        const spot = spots[i];

        // Skip if already scraped recently (optional check, for now we overwrite)
        if (!spot.permalink) continue;

        console.log(`[${i + 1}/${spots.length}] Scraping ${spot.name}...`);

        const details = await scrapeSpot(spot.permalink);

        if (details) {
            spots[i] = { ...spot, ...details };
            updatedCount++;
        }

        // Save regularly
        if (i % 5 === 0) {
            fs.writeFileSync(dataPath, JSON.stringify(spots, null, 2));
        }

        await sleep(DELAY_MS);
    }

    // Final Save
    fs.writeFileSync(dataPath, JSON.stringify(spots, null, 2));
    console.log(`Done! Updated ${updatedCount} spots.`);
}

processSpots();
