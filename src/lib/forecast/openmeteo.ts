import { ForecastHour } from "./mock";

type OpenMeteoResponse = {
    hourly: {
        time: string[];
        wind_speed_10m: number[];
        wind_direction_10m: number[];
        wind_gusts_10m: number[];
        is_day: number[];
    };
};

export async function fetchOpenMeteoForecast(lat: number, lon: number): Promise<ForecastHour[]> {
    const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day",
        wind_speed_unit: "kn",
        timezone: "auto",
        timezone: "auto",
        forecast_days: "5" // Get 5 days to ensure ample "window"
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OpenMeteo Error: ${res.statusText}`);

        const data: OpenMeteoResponse = await res.json();

        const hours: ForecastHour[] = [];
        const len = data.hourly.time.length;

        // Filter for "now" onwards
        const now = new Date();
        now.setMinutes(0, 0, 0); // Round down to hour

        for (let i = 0; i < len; i++) {
            const t = new Date(data.hourly.time[i]);
            if (t < now) continue; // Skip past hours

            hours.push({
                timeISO: data.hourly.time[i],
                wind_avg_kt: Math.round(data.hourly.wind_speed_10m[i]),
                wind_gust_kt: Math.round(data.hourly.wind_gusts_10m[i]),
                wind_dir_deg: Math.round(data.hourly.wind_direction_10m[i]),
                isDay: data.hourly.is_day[i] === 1
            });
        }

        return hours;
    } catch (e) {
        console.error("Failed to fetch forecast", e);
        // Fallback or rethrow?
        // For MVP, lets rethrow so UI can handle (or we fallback to mock in the provider wrapper)
        throw e;
    }
}
