type Props = {
    name: string;
    distanceKm: number;
    score: number;
    color: "green" | "yellow" | "red";
    windowLabel: string; // "14:00–18:00 (4h)" or "No window"
};

export function SpotCard({ name, distanceKm, score, color, windowLabel }: Props) {
    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <div style={{ fontWeight: 700 }}>{name}</div>
                    <div style={{ opacity: 0.7 }}>{distanceKm.toFixed(1)} km</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800 }}>
                        <span style={{ textTransform: "uppercase" }}>{color}</span> · {score}
                    </div>
                    <div style={{ opacity: 0.8 }}>{windowLabel}</div>
                </div>
            </div>
        </div>
    );
}
