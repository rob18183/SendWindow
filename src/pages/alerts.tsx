import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAlerts, AlertRule, checkAlertStatus } from "../lib/alerts";
import spots from "../../data/spots.nl.json";

export default function AlertsPage() {
    const { alerts, addAlert, removeAlert } = useAlerts();
    const [statuses, setStatuses] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Check status for all alerts
        alerts.forEach(async (a) => {
            const isFiring = await checkAlertStatus(a);
            setStatuses((prev) => ({ ...prev, [a.id]: isFiring }));
        });
    }, [alerts]);

    return (
        <div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <Link to="/" style={{ textDecoration: "none", color: "#666", display: "block", marginBottom: 4 }}>&larr; Back</Link>
                    <h1>My Alerts</h1>
                </div>
            </div>

            <CreateAlertForm onAdd={addAlert} />

            <div style={{ marginTop: 24 }}>
                {alerts.length === 0 && <div style={{ color: "#888", fontStyle: "italic" }}>No alerts set.</div>}
                {alerts.map((a) => {
                    const spotName = spots.find((s) => s.id === a.spotId)?.name ?? a.spotId;
                    const isFiring = statuses[a.id];

                    return (
                        <div key={a.id} style={{
                            border: "1px solid #ddd",
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 10,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: isFiring ? "rgba(46, 125, 50, 0.05)" : "white",
                            borderColor: isFiring ? "#2e7d32" : "#ddd"
                        }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{spotName}</div>
                                <div style={{ fontSize: 13, color: "#555" }}>
                                    Target: <span style={{
                                        fontWeight: "bold",
                                        color: a.minScore >= 70 ? "#2e7d32" : "#f9a825"
                                    }}>{a.minScore >= 70 ? "GREEN" : "YELLOW"}</span>
                                    {" "}({a.minDuration}h+)
                                </div>
                                <div style={{ fontSize: 12, marginTop: 4, color: isFiring ? "#2e7d32" : "#999", fontWeight: isFiring ? 600 : 400 }}>
                                    {isFiring ? "● ACTIVE NOW" : "○ Waiting..."}
                                </div>
                            </div>
                            <button
                                onClick={() => removeAlert(a.id)}
                                style={{
                                    background: "none", border: "none", color: "#999", fontSize: 18, cursor: "pointer", padding: 8
                                }}
                            >
                                &times;
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function CreateAlertForm({ onAdd }: { onAdd: (r: AlertRule) => void }) {
    const [spotId, setSpotId] = useState(spots[0].id);
    const [tier, setTier] = useState<"green" | "yellow">("green");

    const submit = () => {
        onAdd({
            id: crypto.randomUUID(),
            spotId,
            minScore: tier === "green" ? 70 : 45,
            minDuration: 1 // Default MVP
        });
    };

    return (
        <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>New Alert</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <select
                    value={spotId}
                    onChange={(e) => setSpotId(e.target.value)}
                    style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", flex: 1 }}
                >
                    {spots.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as any)}
                    style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", width: 100 }}
                >
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                </select>
            </div>
            <button
                onClick={submit}
                style={{
                    width: "100%",
                    background: "#333",
                    color: "white",
                    border: "none",
                    padding: 10,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600
                }}
            >
                Create Alert
            </button>
        </div>
    );
}
