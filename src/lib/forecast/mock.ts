export type ForecastHour = {
    timeISO: string;
    wind_avg_kt: number;
    wind_gust_kt: number;
    wind_dir_deg: number;
    isDay?: boolean; // Optional for backward compat, but we will populate it
};

export async function getHourlyForecastMock(lat: number, lon: number): Promise<ForecastHour[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Generate 48 hours starting from current hour
    const start = new Date();
    start.setMinutes(0, 0, 0);

    const hours: ForecastHour[] = [];

    // Seed random based on lat/lon to be consistent per spot but different between spots
    let seed = lat * lon;
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    // Base conditions for this "location"
    let avg = 15 + random() * 15; // 15-30 knots base
    let dir = 200 + random() * 40; // SW-ish

    for (let i = 0; i < 48; i++) {
        const t = new Date(start.getTime() + i * 3600 * 1000);

        // Evolve weather slowly
        avg += (random() - 0.5) * 5;
        if (avg < 5) avg = 5;
        if (avg > 40) avg = 40;

        dir += (random() - 0.5) * 20;
        dir = (dir + 360) % 360;

        const gust = avg + 5 + random() * 10;
        const hoursOfDay = t.getHours();
        const isDay = hoursOfDay >= 6 && hoursOfDay < 21; // Simple mock day logic

        hours.push({
            timeISO: t.toISOString(),
            wind_avg_kt: Math.round(avg),
            wind_gust_kt: Math.round(gust),
            wind_dir_deg: Math.round(dir),
            isDay // Add property
        });
    }

    return hours;
}
