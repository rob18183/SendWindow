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

        const extractSection = (html, headerText) => {
            const regex = new RegExp(`<h[1-6][^>]*>\\s*${headerText}\\s*<\\/h[1-6]>([\\s\\S]*?)<(h[1-6]|div class="footer"|section)`, 'i');
            const match = html.match(regex);
            return match ? cleanText(match[1]) : null;
        };

        const descriptionMatch = html.match(/<div class="entry-content"[^>]*>([\s\S]*?)<h/i);
        // Fallback for description: often it's just the first bit of entry-content
        let description = "";
        if (descriptionMatch) {
            // Remove any embedded images or divs first
            const content = descriptionMatch[1];
            description = cleanText(content.split(/<h/)[0]); // Take until next header
        }

        /* 
           Specific Headers found in manual inspection:
           - "Wees alert op" (Hazards)
           - "Locatie & faciliteiten" (Facilities/Parking)
           - "Spotbeheerder" (Contact)
           - "Regels" (Rules - sometimes present)
        */

        const hazards = extractSection(html, "Wees alert op");
        const facilities = extractSection(html, "Locatie &amp; faciliteiten"); // HTML encoded &

        // Sometimes it is "Locatie & faciliteiten" literal
        const facilities2 = extractSection(html, "Locatie & faciliteiten");

        const rules = extractSection(html, "Regels");

        return {
            description: description || undefined,
            hazards: hazards || undefined,
            facilities: facilities || facilities2 || undefined,
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
