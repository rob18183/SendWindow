import { useState, useEffect } from "react";
import { getHourlyForecast } from "./forecast";
import { sendScore } from "./scoring";
import { bestWindow } from "./windows";
import spots from "../../data/spots.nl.json";

export type AlertRule = {
    id: string;
    spotId: string;
    minScore: number; // 70 or 45
    minDuration: number;
};

export type AlertStatus = "loading" | "active" | "waiting" | "error";

export function useAlerts() {
    const [alerts, setAlerts] = useState<AlertRule[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("sendwindow_alerts");
        if (stored) {
            try {
                setAlerts(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse alerts", e);
            }
        }
    }, []);

    const save = (newAlerts: AlertRule[]) => {
        setAlerts(newAlerts);
        localStorage.setItem("sendwindow_alerts", JSON.stringify(newAlerts));
    };

    const addAlert = (rule: AlertRule) => {
        save([...alerts, rule]);
    };

    const removeAlert = (id: string) => {
        save(alerts.filter((a) => a.id !== id));
    };

    return { alerts, addAlert, removeAlert };
}

export async function checkAlertStatus(rule: AlertRule): Promise<boolean> {
    const spot = spots.find((s) => s.id === rule.spotId);
    if (!spot) return false;

    // TODO: In a real app we would cache this or batch requests
    const forecast = await getHourlyForecast(spot.lat, spot.lon);

    const hours = forecast.map(h => ({
        timeISO: h.timeISO,
        ...sendScore(spot as any, h)
    }));

    const best = bestWindow(hours, rule.minScore);

    if (!best) return false;
    return best.duration >= rule.minDuration;
}
