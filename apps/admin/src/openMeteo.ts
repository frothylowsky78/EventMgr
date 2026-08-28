import type { WeatherDay, WeatherLocation } from '@eventmgr/shared-types';

/**
 * Open-Meteo client — geocoding + forecast, called straight from the browser.
 *
 * No API key and no signup: both endpoints are free and send permissive CORS headers, which is
 * why weather needs no Lambda, no SSM secret, and no new API route (see docs/open-questions.md
 * A6/#6). Results fill the weather form; staff review and edit before saving through the
 * existing PUT /admin/events/{eventId}/weather.
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

/** Open-Meteo only publishes ~16 days ahead; beyond that a lookup returns nothing for those dates. */
export const FORECAST_HORIZON_DAYS = 16;

export interface GeocodeResult extends WeatherLocation {
  /** Stable id from Open-Meteo, used as a React key. */
  id: number;
  /** e.g. "Coeur d'Alene, Idaho, United States" — what we show and store as `name`. */
  label: string;
}

/** WMO weather interpretation codes → the plain-language strings the app displays. */
const WMO: Record<number, string> = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  56: 'Freezing drizzle', 57: 'Heavy freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Heavy freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

const describe = (code: number | undefined): string =>
  code == null ? '' : (WMO[code] ?? `Code ${code}`);

async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo request failed (${res.status})`);
  const json = await res.json();
  // Open-Meteo signals errors in the body with { error: true, reason: "..." }.
  if (json && typeof json === 'object' && 'error' in json && json.error) {
    throw new Error(String((json as { reason?: string }).reason ?? 'Open-Meteo error'));
  }
  return json as Record<string, unknown>;
}

interface RawGeocode {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

/** Search places by name. Returns [] when nothing matches — Open-Meteo omits `results` entirely. */
export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const json = await getJson(url);
  const results = (json.results as RawGeocode[] | undefined) ?? [];
  return results.map((r) => {
    const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
    return { id: r.id, label, name: label, latitude: r.latitude, longitude: r.longitude };
  });
}

export interface ForecastResult {
  current: { tempF: number; condition: string } | null;
  daily: WeatherDay[];
}

interface RawForecast {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
  };
}

/**
 * Fetch current conditions + the daily forecast in °F for a location.
 * `days` is clamped to Open-Meteo's 16-day horizon.
 */
export async function fetchForecast(
  location: WeatherLocation,
  days = FORECAST_HORIZON_DAYS
): Promise<ForecastResult> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    temperature_unit: 'fahrenheit',
    timezone: 'auto',
    forecast_days: String(Math.min(Math.max(days, 1), FORECAST_HORIZON_DAYS)),
  });

  const json = (await getJson(`${FORECAST_URL}?${params}`)) as RawForecast;

  const current =
    json.current?.temperature_2m != null
      ? {
          tempF: Math.round(json.current.temperature_2m),
          condition: describe(json.current.weather_code),
        }
      : null;

  const d = json.daily;
  const daily: WeatherDay[] = (d?.time ?? []).map((date, i) => {
    const precip = d?.precipitation_probability_max?.[i];
    return {
      date,
      highF: Math.round(d?.temperature_2m_max?.[i] ?? 0),
      lowF: Math.round(d?.temperature_2m_min?.[i] ?? 0),
      condition: describe(d?.weather_code?.[i]),
      ...(precip != null ? { precipChance: precip } : {}),
    };
  });

  return { current, daily };
}
