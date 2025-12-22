import { getHourlyForecastMock, ForecastHour } from "./mock";
import { fetchOpenMeteoForecast } from "./openmeteo";

export type { ForecastHour };

// Simple toggle for dev/production or fallback
const USE_MOCK = false;

export async function getHourlyForecast(lat: number, lon: number): Promise<ForecastHour[]> {
    if (USE_MOCK) {
        console.warn("Using MOCK forecast data");
        return getHourlyForecastMock(lat, lon);
    }

    try {
        return await fetchOpenMeteoForecast(lat, lon);
    } catch (e) {
        console.error("Real forecast failed, falling back to Mock", e);
        return getHourlyForecastMock(lat, lon);
    }
}
