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

function getDirDistance(deg: number, start: number, end: number) {
  // Normalize all to 0-360
  const d = (deg % 360 + 360) % 360;
  const s = (start % 360 + 360) % 360;
  const e = (end % 360 + 360) % 360;

  // Check if inside
  if (s <= e) {
    if (d >= s && d <= e) return 0;
  } else {
    // Wraps around 0 (e.g. 350 to 10)
    if (d >= s || d <= e) return 0;
  }

  // Distance to nearest edge
  const distS = Math.min(Math.abs(d - s), 360 - Math.abs(d - s));
  const distE = Math.min(Math.abs(d - e), 360 - Math.abs(d - e));
  return Math.min(distS, distE);
}

function isInside(deg: number, ranges?: { start: number; end: number }[]) {
  if (!ranges) return false;
  for (const r of ranges) {
    if (getDirDistance(deg, r.start, r.end) === 0) return true;
  }
  return false;
}

export function sendScore(spot: Spot, fh: ForecastHour): ScoreResult {
  // 1. Safety Override
  if (isInside(fh.wind_dir_deg, spot.unsafe_dirs)) {
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

  // 3. Direction Score (0-25)
  let minDiff = 360;
  for (const range of spot.good_dirs) {
    const d = getDirDistance(fh.wind_dir_deg, range.start, range.end);
    if (d < minDiff) minDiff = d;
  }
  // If inside (minDiff=0) -> 25. If >60 deg away -> 0.
  const dirScore = 25 * Math.max(0, 1 - minDiff / 60);

  // 4. Gust Score (0-15)
  const g = fh.wind_gust_kt - fh.wind_avg_kt;
  // max score 15 if g<=6. 0 if g>=20.
  const gustScore = 15 * Math.max(0, 1 - Math.max(0, g - 6) / 14);

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
