import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = 'https://kitesurfvereniging.nl/spotkaart/?';

try {
    console.log('Fetching', url, '...');
    const response = await fetch(url);
    const text = await response.text();

    // Find the <pre id="data"> tag
    const match = text.match(/<pre id="data"[^>]*>([\s\S]*?)<\/pre>/);
    if (match && match[1]) {
        try {
            const rawJson = match[1].trim();
            const spots = JSON.parse(rawJson);
            console.log(`Found ${spots.length} spots.`);

            // Log the first spot
            console.log('Sample Spot:', JSON.stringify(spots[0], null, 2));

            // Save raw data
            const outPath = path.join(__dirname, '../data/nkv_raw.json');
            fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
            console.log(`Saved raw data to ${outPath}`);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
        }
    } else {
        console.error('Could not find <pre id="data"> tag in HTML. Snippet:', text.substring(0, 500));
    }
} catch (err) {
    console.error('Error fetching URL:', err);
}
