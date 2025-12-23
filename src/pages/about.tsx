import { Link } from "react-router-dom";

export default function AboutPage() {
    return (
        <div className="container" style={{ padding: '0 16px 40px 16px', maxWidth: 600, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ padding: '24px 0 16px 0', display: "flex", alignItems: "center", gap: 12 }}>
                <Link to="/" style={{ textDecoration: "none", fontSize: 24 }}>&larr;</Link>
                <h1 style={{ margin: 0, fontSize: 24 }}>About</h1>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

                {/* Mission */}
                <section>
                    <h2 style={{ fontSize: 18, marginBottom: 8 }}>The Mission</h2>
                    <p style={{ lineHeight: 1.6, color: "var(--color-text-dim)" }}>
                        Spend less time scrolling through forecasts and more time on the water.
                        **SendWindow** instantly analyzes wind conditions to tell you exactly when and where to go kitesurfing in the Netherlands.
                    </p>
                </section>

                {/* The Score */}
                <section>
                    <h2 style={{ fontSize: 18, marginBottom: 16 }}>The SendScore</h2>
                    <p style={{ lineHeight: 1.6, color: "var(--color-text-dim)", marginBottom: 16 }}>
                        We calculate a 0–100 score for every hour based on three key factors used by safety-conscious intermediate kiters.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div className="card" style={{ padding: 16, borderLeft: "4px solid var(--color-success)" }}>
                            <div style={{ fontWeight: 600 }}>1. Base Wind (0–60 pts)</div>
                            <div style={{ fontSize: 13, color: "var(--color-text-dim)", marginTop: 4 }}>
                                Ideally between 16–30 knots. Too light (&lt;16kt) or too nuking (&gt;36kt) reduces the score.
                            </div>
                        </div>

                        <div className="card" style={{ padding: 16, borderLeft: "4px solid var(--color-primary)" }}>
                            <div style={{ fontWeight: 600 }}>2. Direction (0–25 pts)</div>
                            <div style={{ fontSize: 13, color: "var(--color-text-dim)", marginTop: 4 }}>
                                We check each spot's specific playable wind range. Cross-on is best. Offshore is strictly penalized.
                            </div>
                        </div>

                        <div className="card" style={{ padding: 16, borderLeft: "4px solid var(--color-warning)" }}>
                            <div style={{ fontWeight: 600 }}>3. Gust Factor (0–15 pts)</div>
                            <div style={{ fontSize: 13, color: "var(--color-text-dim)", marginTop: 4 }}>
                                Steady wind is king. Gusty conditions (large difference between average and gusts) lower the score.
                            </div>
                        </div>
                    </div>
                </section>

                {/* Overrides */}
                <section>
                    <h2 style={{ fontSize: 18, marginBottom: 8 }}>Safety First</h2>
                    <ul style={{ paddingLeft: 20, lineHeight: 1.6, color: "var(--color-text-dim)" }}>
                        <li style={{ marginBottom: 8 }}>
                            <strong>Night Override:</strong> Scores are set to 0 (Red) during night hours to discourage dangerous night riding.
                        </li>
                        <li>
                            <strong>Offshore Override:</strong> If the wind direction is unsafe (e.g. offshore) for a specific spot, the score is forced to 0.
                        </li>
                    </ul>
                </section>

                {/* Data */}
                <section>
                    <h2 style={{ fontSize: 18, marginBottom: 8 }}>Data Sources</h2>
                    <p style={{ lineHeight: 1.6, color: "var(--color-text-dim)" }}>
                        Weather data is powered by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)" }}>Open-Meteo.com</a>. Locations are manually curated.
                    </p>
                </section>

                <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#cbd5e1" }}>
                    v0.1.0 Beta
                </div>
            </div>
        </div>
    );
}
