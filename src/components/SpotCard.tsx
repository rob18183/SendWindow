type Props = {
    name: string;
    distanceKm: number;
    score: number;
    color: "green" | "yellow" | "red";
    windowLabel: string;
    image?: string;
    travelTime?: number | null;
    duoTimes?: { a: number; b: number };
};

export function SpotCard({ name, distanceKm, score, color, windowLabel, image, travelTime, duoTimes }: Props) {
    const statusClass = `status-${color}`; // e.g. status-green

    return (
        <div className="card" style={{ display: 'flex', marginBottom: 16, minHeight: 100 }}>
            {/* Image Section */}
            <div style={{ width: 100, flexShrink: 0, position: 'relative', backgroundColor: '#e2e8f0' }}>
                {image ? (
                    <img
                        src={image}
                        alt={name}
                        referrerPolicy="no-referrer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 24 }}>
                        🪁
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>{name}</h3>
                    <div className={statusClass} style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <span>{score}</span>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: `var(--color-${color === 'green' ? 'success' : color === 'yellow' ? 'warning' : 'danger'})` }}></div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 13, flexWrap: 'wrap', gap: 8 }}>
                    <div className="text-dim">
                        📍 {distanceKm.toFixed(1)} km
                        {duoTimes ? (
                            <span style={{ marginLeft: 8, display: 'inline-flex', gap: 6, flexWrap: "wrap" }}>
                                <span title="Your drive">🚗 You: {duoTimes.a}m</span>
                                <span style={{ opacity: 0.5 }}>|</span>
                                <span title="Buddy's drive">Buddy: {duoTimes.b}m</span>
                            </span>
                        ) : (
                            travelTime && <span style={{ marginLeft: 8 }}>🚗 {travelTime} min</span>
                        )}
                    </div>
                    <div style={{
                        backgroundColor: '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontWeight: 500,
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        color: windowLabel.includes("No window") ? '#94a3b8' : '#0f172a'
                    }}>
                        {windowLabel}
                    </div>
                </div>
            </div>
        </div>
    );
}
