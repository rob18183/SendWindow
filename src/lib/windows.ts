import { isToday, isTomorrow, format } from "date-fns";

type Hour = {
    timeISO: string;
    score: number;
    color: "green" | "yellow" | "red";
};

export type Window = {
    start: number; // index
    end: number;   // index
    avgScore: number;
    duration: number;
};

export function bestWindow(hours: Hour[], thresholdScore: number): Window | null {
    let windows: Window[] = [];
    let currentStart = -1;

    for (let i = 0; i < hours.length; i++) {
        if (hours[i].score >= thresholdScore) {
            if (currentStart === -1) currentStart = i;
        } else {
            if (currentStart !== -1) {
                windows.push(makeWindow(hours, currentStart, i - 1));
                currentStart = -1;
            }
        }
    }
    if (currentStart !== -1) {
        windows.push(makeWindow(hours, currentStart, hours.length - 1));
    }

    if (windows.length === 0) return null;

    // Sort: Duration DESC, Start ASC, AvgScore DESC
    windows.sort((a, b) => {
        if (b.duration !== a.duration) return b.duration - a.duration;
        if (a.start !== b.start) return a.start - b.start;
        return b.avgScore - a.avgScore;
    });

    return windows[0]; // Option A: show only best
}

function makeWindow(hours: Hour[], start: number, end: number): Window {
    let sum = 0;
    for (let i = start; i <= end; i++) sum += hours[i].score;
    return {
        start,
        end,
        duration: end - start + 1,
        avgScore: sum / (end - start + 1)
    };
}

export function fmtWindow(hours: { timeISO: string }[], start: number, end: number) {
    const sDate = new Date(hours[start].timeISO);
    const eDate = new Date(hours[end].timeISO);

    let dayStr = "";
    if (isToday(sDate)) dayStr = "Today";
    else if (isTomorrow(sDate)) dayStr = "Tomorrow";
    else dayStr = format(sDate, "EEE");

    const sTime = format(sDate, "HH:mm");
    const eTime = format(eDate, "HH:mm");
    const duration = end - start + 1;

    return `${dayStr} ${sTime}–${eTime} · ${duration}h`;
}
