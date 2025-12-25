// Self-contained scoring logic to avoid TS import issues
function getDirDistance(deg, target) {
    const d = (deg % 360 + 360) % 360;
    const t = (target % 360 + 360) % 360;
    const diff = Math.abs(d - t);
    return Math.min(diff, 360 - diff);
}

function isStrictlyInside(deg, start, end) {
    const d = (deg % 360 + 360) % 360;
    const s = (start % 360 + 360) % 360;
    const e = (end % 360 + 360) % 360;
    if (s <= e) return d >= s && d <= e;
    return d >= s || d <= e; // Wraps
}

function calculateDirScore(windDeg, good_dirs) {
    for (const range of good_dirs) {
        if (isStrictlyInside(windDeg, range.start, range.end)) {
            // It is inside this sector. Calculate distance to edges.
            const distStart = getDirDistance(windDeg, range.start);
            const distEnd = getDirDistance(windDeg, range.end);
            const distToEdge = Math.min(distStart, distEnd);

            // Edge Bonus Logic:
            // < 15 deg from edge: side-shore penalty (linear ramp 10 -> 25)
            // >= 15 deg: full onshore (25)
            if (distToEdge >= 15) return 25;

            // Linear ramp from 10 to 25
            return 10 + (distToEdge / 15) * 15;
        }
    }
    return 0; // Strictly outside all sectors
}

function sendScore(spot, fh) {
    // 1. Safety Override (Unsafe Dirs)
    if (spot.unsafe_dirs && spot.unsafe_dirs.some(r => isStrictlyInside(fh.wind_dir_deg, r.start, r.end))) {
        return { score: 0, color: "red", breakdown: { wind: 0, pDir: 0, pGust: 0, safetyRed: true } };
    }

    // 2. Night Override
    if (fh.isDay === false) {
        return { score: 0, color: "red", breakdown: { wind: 0, pDir: 0, pGust: 0, safetyRed: false } };
    }

    // 3. Wind Score (0-60)
    let windScore = 0;
    const w = fh.wind_avg_kt;
    if (w < 10) windScore = 0;
    else if (w <= 16) windScore = 0 + ((w - 10) / (16 - 10)) * 45;
    else if (w <= 24) windScore = 45 + ((w - 16) / (24 - 16)) * 15;
    else if (w <= 30) windScore = 60;
    else if (w <= 36) windScore = 60 - ((w - 30) / (36 - 30)) * 25;
    else windScore = 20;

    // 4. Strict Direction Score (0-25)
    const dirScore = calculateDirScore(fh.wind_dir_deg, spot.good_dirs);

    // 5. Gust Score (0-15)
    const g = fh.wind_gust_kt - fh.wind_avg_kt;
    const gustScore = 15 * Math.max(0, 1 - Math.max(0, g - 6) / 14);

    // KILL SWITCH: If direction is invalid (0), total is 0.
    if (dirScore === 0) {
        return { score: 0, color: "red", breakdown: { wind: windScore, pDir: 0, pGust: gustScore, safetyRed: false } };
    }

    const total = Math.round(windScore + dirScore + gustScore);

    let color = "red";
    if (total >= 70) color = "green";
    else if (total >= 45) color = "yellow";

    return {
        score: total,
        color,
        breakdown: { pDir: dirScore, wind: windScore }
    };
}

// Zandvoort Data (Actual from spots.nl.json)
const zandvoort = {
    name: "Zandvoort",
    good_dirs: [{ start: 203, end: 23 }]
};

// Test Cases
const cases = [
    { dir: 270, name: "Onshore (W)" },      // Center: 25 pts
    { dir: 300, name: "Onshore (NW)" },     // Center: 25 pts
    { dir: 204, name: "Side-Shore (SSW)" }, // Edge (1 deg inside): ~11 pts
    { dir: 22, name: "Side-Shore (NNE)" }, // Edge (1 deg inside): ~11 pts
    { dir: 202, name: "Offshore (S)" },     // Outside: 0 pts -> Red
    { dir: 76, name: "Offshore (ENE)" },   // Outside: 0 pts -> Red
    { dir: 90, name: "Offshore (E)" }      // Outside: 0 pts -> Red
];

console.log("Testing Zandvoort STRICT Scoring (203-23):");
cases.forEach(c => {
    const res = sendScore(zandvoort, { wind_dir_deg: c.dir, wind_avg_kt: 20, wind_gust_kt: 20, isDay: true });
    console.log(`${c.name} (${c.dir}°): Score=${res.score.toFixed(1)} Color=${res.color} (DirPoints=${res.breakdown?.pDir.toFixed(1)})`);
});
