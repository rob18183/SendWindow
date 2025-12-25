
const { sendScore } = require('../src/lib/scoring'); // I might need to compile TS or use ts-node, but let's try pure JS with copied logic if needed, or use ts-node.
// Actually, I can't require TS files directly in node without ts-node.
// I will copy the scoring logic into this script for isolation and ease of running.

function getDirDistance(deg, start, end) {
    const d = (deg % 360 + 360) % 360;
    const s = (start % 360 + 360) % 360;
    const e = (end % 360 + 360) % 360;

    if (s <= e) {
        if (d >= s && d <= e) return 0;
    } else {
        if (d >= s || d <= e) return 0;
    }

    const distS = Math.min(Math.abs(d - s), 360 - Math.abs(d - s));
    const distE = Math.min(Math.abs(d - e), 360 - Math.abs(d - e));
    return Math.min(distS, distE);
}

function sendScore(spot, fh) {
    if (spot.unsafe_dirs) {
        for (const r of spot.unsafe_dirs) {
            if (getDirDistance(fh.wind_dir_deg, r.start, r.end) === 0) {
                return { score: 0, color: "red", note: "Safety Override" };
            }
        }
    }

    let minDiff = 360;
    for (const range of spot.good_dirs) {
        const d = getDirDistance(fh.wind_dir_deg, range.start, range.end);
        if (d < minDiff) minDiff = d;
    }

    // Logic from scoring.ts
    // If inside (minDiff=0) -> 25. If >60 deg away -> 0.
    const dirScore = 25 * Math.max(0, 1 - minDiff / 60);

    return {
        score: dirScore,
        minDiff,
        isSafe: dirScore > 0
    };
}

// Zandvoort Data (Actual)
const zandvoort = {
    name: "Zandvoort",
    good_dirs: [{ start: 203, end: 23 }]
};

// Test Cases
const cases = [
    { dir: 270, name: "Onshore (W)" },   // Should be good (inside 203-23)
    { dir: 300, name: "Onshore (NW)" },  // Should be good
    { dir: 90, name: "Offshore (E)" },  // Should be bad (score 0)
    { dir: 110, name: "Offshore (ESE)" },// Should be bad
    { dir: 130, name: "Offshore (SE)" }  // Should be bad
];

console.log("Testing Zandvoort Scoring (203-23):");
cases.forEach(c => {
    const res = sendScore(zandvoort, { wind_dir_deg: c.dir, wind_avg_kt: 20, wind_gust_kt: 20, isDay: true });
    // Added mock wind speed/day to ensure score isn't 0 due to low wind/night
    console.log(`${c.name} (${c.dir}°): Score=${res.score.toFixed(1)} Color=${res.color} (Breakdown: Wind=${res.breakdown?.wind} Dir=${res.breakdown?.pDir})`);
});
