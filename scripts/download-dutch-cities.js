
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.resolve(__dirname, '../data/nl_cities.json');

// Using dr5hn's database
const URL = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/cities.json";

console.log(`Downloading cities from ${URL}...`);

https.get(URL, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed to download: HTTP ${res.statusCode}`);
        process.exit(1);
    }

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
        if (data.length % 10000000 === 0) process.stdout.write('.');
    });

    res.on('end', () => {
        console.log("\nDownload complete. Parsing...");
        try {
            const allCities = JSON.parse(data);
            console.log(`Total cities in DB: ${allCities.length}`);

            const nlCities = allCities.filter(c => c.country_code === 'NL');
            console.log(`Found ${nlCities.length} Dutch cities/towns.`);

            // Map to our simple format
            const cleanList = nlCities.map(c => ({
                name: c.name,
                lat: parseFloat(c.latitude),
                lon: parseFloat(c.longitude)
            }));

            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanList, null, 2));
            console.log(`Saved to ${OUTPUT_FILE}`);

        } catch (e) {
            console.error("Failed to parse/filter JSON:", e);
        }
    });

}).on('error', (e) => {
    console.error("Download error:", e);
});
