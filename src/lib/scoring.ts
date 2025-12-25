import { ForecastHour } from "./forecast/mock";

type Spot = {
  good_dirs: { start: number; end: number }[];
  unsafe_dirs?: { start: number; end: number }[];
};

export type ScoreResult = {
  score: number;
  color: "green" | "yellow" | "red";
  breakdown?: {
    wind: number;
    pDir: number;
    pGust: number;
    safetyRed: boolean;
  };
};


function getDirDistance(deg: number, target: number) {
  const d = (deg % 360 + 360) % 360;
  const t = (target % 360 + 360) % 360;
  const diff = Math.abs(d - t);
  return Math.min(diff, 360 - diff);
}

function isStrictlyInside(deg: number, start: number, end: number) {
  const d = (deg % 360 + 360) % 360;
  const s = (start % 360 + 360) % 360;
  const e = (end % 360 + 360) % 360;
  if (s <= e) return d >= s && d <= e;
  return d >= s || d <= e; // Wraps
}

// Helper to check safety override using the same strict logic
function isInsideUnsafe(deg: number, ranges?: { start: number; end: number }[]) {
  if (!ranges) return false;
  for (const r of ranges) {
    if (isStrictlyInside(deg, r.start, r.end)) return true;
  }
  return false;
}

function calculateDirScore(windDeg: number, good_dirs: { start: number; end: number }[]) {
  for (const range of good_dirs) {
    if (isStrictlyInside(windDeg, range.start, range.end)) {
      // It is strictly inside this sector. Calculate distance to nearest edge.
      const distStart = getDirDistance(windDeg, range.start);
      const distEnd = getDirDistance(windDeg, range.end);
      const distToEdge = Math.min(distStart, distEnd);

      // Edge Bonus Logic:
      // < 15 deg from edge: side-shore penalty (linear ramp 10 -> 25)
      // >= 15 deg: full onshore (25)
      if (distToEdge >= 15) return 25;

      // Linear ramp from 10 to 25. 
      // 0 deg (on the line) = 10 pts. 
      // 15 deg (deep) = 25 pts.
      return 10 + (distToEdge / 15) * 15;
    }
  }
  return 0; // Strictly outside all sectors
}

export function sendScore(spot: Spot, fh: ForecastHour): ScoreResult {
  // 1. Safety Override
  if (isInsideUnsafe(fh.wind_dir_deg, spot.unsafe_dirs)) {
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
  else if (w <= 16) windScore = 0 + ((w - 10) / (16 - 10)) * 45; // 0->45
  else if (w <= 24) windScore = 45 + ((w - 16) / (24 - 16)) * 15; // 45->60
  else if (w <= 30) windScore = 60;
  else if (w <= 36) windScore = 60 - ((w - 30) / (36 - 30)) * 25; // 60->35
  else windScore = 20;

  // 4. Strict Direction Score (0-25)
  const dirScore = calculateDirScore(fh.wind_dir_deg, spot.good_dirs);

  // 5. Gust Score (0-15)
  const g = fh.wind_gust_kt - fh.wind_avg_kt;
  // max score 15 if g<=6. 0 if g>=20.
  const gustScore = 15 * Math.max(0, 1 - Math.max(0, g - 6) / 14);

  // KILL SWITCH: If direction is strictly outside (score 0), total is 0.
  if (dirScore === 0) {
    return { score: 0, color: "red", breakdown: { wind: windScore, pDir: 0, pGust: gustScore, safetyRed: false } };
  }

  const total = Math.round(windScore + dirScore + gustScore);

  let color: "green" | "yellow" | "red" = "red";
  if (total >= 70) color = "green";
  else if (total >= 45) color = "yellow";

  return {
    score: total,
    color,
    breakdown: { wind: windScore, pDir: dirScore, pGust: gustScore, safetyRed: false }
  };
}
