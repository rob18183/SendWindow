import { Window } from "./windows";

type ComputedSpot = {
    spotId: string;
    distanceKm: number;
    hours: any[];
    greenBest: Window | null;
    yellowBest: Window | null;
};

export function compareSpots(a: ComputedSpot, b: ComputedSpot): number {
    const winA = a.greenBest ?? a.yellowBest;
    const winB = b.greenBest ?? b.yellowBest;

    // 1. Tier: Green > Yellow > None
    const tierA = a.greenBest ? 2 : (a.yellowBest ? 1 : 0);
    const tierB = b.greenBest ? 2 : (b.yellowBest ? 1 : 0);
    if (tierA !== tierB) return tierB - tierA;

    // If both no window, sort by distance? Or maybe score of current hour?
    // User roadmap says: "sorts by tier+soonest start+duration+avg+distance"
    if (!winA || !winB) {
        // Fallback for no windows: distance
        if (!winA && winB) return 1;
        if (winA && !winB) return -1;
        return a.distanceKm - b.distanceKm;
    }

    // Both have windows.

    // 2. Soonest start time
    if (winA.start !== winB.start) return winA.start - winB.start;

    // 3. Duration (longer better)
    if (winA.duration !== winB.duration) return winB.duration - winA.duration;

    // 4. Avg Score
    if (winA.avgScore !== winB.avgScore) return winB.avgScore - winA.avgScore;

    // 5. Distance
    return a.distanceKm - b.distanceKm;
}