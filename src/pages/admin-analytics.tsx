import { Link, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type Summary = {
  total_searches: number;
  avg_latency: number;
  max_latency: number;
  avg_searches_per_day: number;
  top_cities: { city: string; searches: number }[];
};

type Daily = { day: string; searches: number; avg_latency_ms: number };
type TopCity = { city: string; country: string; searches: number; percent: number };

const tokenHeader = (token: string | null): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {});

async function fetchJsonOrThrow<T>(url: string, init: RequestInit, label: string): Promise<T> {
  const res = await fetch(url, init);
  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  if (!res.ok) {
    const body = await res.text();
    const message = body ? `${label} failed (${res.status}): ${body.slice(0, 240)}` : `${label} failed (${res.status})`;
    throw new Error(message);
  }

  if (!contentType.includes("application/json")) {
    const body = await res.text();
    throw new Error(`${label} failed: expected JSON response but got '${contentType || "unknown"}' (${body.slice(0, 240)})`);
  }

  return res.json() as Promise<T>;
}

export default function AdminAnalyticsPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const range = params.get("range") || "30d";

  const commonParams = useMemo(() => {
    const qp = new URLSearchParams();
    qp.set("range", range);
    if (token) qp.set("token", token);
    return qp.toString();
  }, [range, token]);

  const summaryQuery = useQuery({
    queryKey: ["analytics", "summary", commonParams],
    queryFn: async (): Promise<Summary> => fetchJsonOrThrow(`/api/admin/analytics/summary?${commonParams}`, { headers: tokenHeader(token) }, "Summary"),
  });

  const dailyQuery = useQuery({
    queryKey: ["analytics", "daily", commonParams],
    queryFn: async (): Promise<Daily[]> => fetchJsonOrThrow(`/api/admin/analytics/daily?${commonParams}`, { headers: tokenHeader(token) }, "Daily"),
  });

  const topCitiesQuery = useQuery({
    queryKey: ["analytics", "top-cities", commonParams],
    queryFn: async (): Promise<TopCity[]> => fetchJsonOrThrow(`/api/admin/analytics/top-cities?${commonParams}`, { headers: tokenHeader(token) }, "Top cities"),
  });

  const isLoading = summaryQuery.isLoading || dailyQuery.isLoading || topCitiesQuery.isLoading;
  const error = summaryQuery.error || dailyQuery.error || topCitiesQuery.error;

  return (
    <div className="container" style={{ padding: "0 16px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ padding: "24px 0 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/" style={{ textDecoration: "none", fontSize: 24 }}>&larr;</Link>
        <h1 style={{ margin: 0, fontSize: 24 }}>Admin Analytics</h1>
      </div>

      <p style={{ color: "var(--color-text-dim)", marginTop: 0 }}>
        Range: <strong>{range}</strong> · Aggregated only (no raw events).
      </p>

      {isLoading && <div className="card" style={{ padding: 16 }}>Loading analytics…</div>}
      {error && <div className="card" style={{ padding: 16, color: "var(--color-danger)" }}>Failed to load analytics: {String(error)}</div>}

      {!isLoading && !error && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ padding: 14 }}><strong>Total searches</strong><div>{summaryQuery.data?.total_searches ?? 0}</div></div>
            <div className="card" style={{ padding: 14 }}><strong>Avg/day</strong><div>{(summaryQuery.data?.avg_searches_per_day ?? 0).toFixed(2)}</div></div>
            <div className="card" style={{ padding: 14 }}><strong>Avg latency</strong><div>{Math.round(summaryQuery.data?.avg_latency ?? 0)}ms</div></div>
            <div className="card" style={{ padding: 14 }}><strong>Max latency</strong><div>{summaryQuery.data?.max_latency ?? 0}ms</div></div>
          </div>

          <section className="card" style={{ padding: 14, marginBottom: 16 }}>
            <h2 style={{ marginTop: 0 }}>Daily trend</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr><th style={{ textAlign: "left", padding: 8 }}>Date</th><th style={{ textAlign: "left", padding: 8 }}>Searches</th><th style={{ textAlign: "left", padding: 8 }}>Avg latency (ms)</th></tr>
                </thead>
                <tbody>
                  {(dailyQuery.data ?? []).length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: 8 }}>No data</td></tr>
                  ) : (dailyQuery.data ?? []).map((row) => (
                    <tr key={row.day}><td style={{ padding: 8 }}>{row.day}</td><td style={{ padding: 8 }}>{row.searches}</td><td style={{ padding: 8 }}>{Math.round(row.avg_latency_ms)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" style={{ padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Top locations</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr><th style={{ textAlign: "left", padding: 8 }}>City</th><th style={{ textAlign: "left", padding: 8 }}>Country</th><th style={{ textAlign: "left", padding: 8 }}>Searches</th><th style={{ textAlign: "left", padding: 8 }}>%</th></tr>
                </thead>
                <tbody>
                  {(topCitiesQuery.data ?? []).length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 8 }}>No data</td></tr>
                  ) : (topCitiesQuery.data ?? []).map((row, idx) => (
                    <tr key={`${row.city}-${row.country}-${idx}`}><td style={{ padding: 8 }}>{row.city}</td><td style={{ padding: 8 }}>{row.country}</td><td style={{ padding: 8 }}>{row.searches}</td><td style={{ padding: 8 }}>{row.percent.toFixed(1)}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
