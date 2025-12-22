export type ScoreWindow = { start: number; end: number; len: number; avg: number };

export type SpotRank = {
    spotId: string;
    distanceKm: number;
    hours: { timeISO: string; score: number }[];
    greenBest: ScoreWindow | null;
    yellowBest: ScoreWindow | null;
};
