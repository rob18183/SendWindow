import fs from 'node:fs';

const url = "https://kitesurfvereniging.nl/kitespot/s-gravenzande-slag-beukel/";

function cleanText(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]+>/g, '') // Strip tags
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

console.log(`Fetching ${url}...`);
const res = await fetch(url);
const html = await res.text();

const idx = html.indexOf("Spot info");
if (idx !== -1) {
    console.log("Snippet around Spot info:\n", html.substring(idx, idx + 500));
} else {
    console.log("Spot info literal NOT found");
}

// Improved Description Regex
// Sometimes it's just <div class="fusion-text ..."> ... </div>
// If "Spot info" is not found, we fail.
const descMatch = html.match(/>\s*Spot info\s*<[\s\S]*?<\/h[1-6]>([\s\S]*?)Wees alert op:/i);
if (descMatch) {
    console.log("Description Match:", cleanText(descMatch[1]));
} else {
    console.log("Description Regex failed");
}
