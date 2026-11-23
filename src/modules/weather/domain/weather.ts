// Weather now and for the next days at a place. Conditions follow the WMO
// weather codes; the labels are in English because the AI model turns them
// into the owner's language.
export type Coordinates = { latitude: number; longitude: number };

export type Place = Coordinates & {
  name: string;
  /** "Goiás, Brasil": what tells two places with the same name apart. */
  region: string | null;
  countryCode: string | null;
  timeZone: string | null;
};

export type CurrentWeather = {
  time: string;
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number;
  precipitationMm: number;
  windKmh: number;
  isDay: boolean;
  weatherCode: number;
  condition: string;
};

export type DailyForecast = {
  /** YYYY-MM-DD in the place time zone. */
  date: string;
  minC: number;
  maxC: number;
  precipitationChancePercent: number | null;
  precipitationMm: number;
  weatherCode: number;
  condition: string;
};

export type Forecast = {
  timeZone: string;
  current: CurrentWeather;
  days: DailyForecast[];
};

export const MAX_FORECAST_DAYS = 7;

const WMO_CONDITIONS: Record<number, string> = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "depositing rime fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  56: "light freezing drizzle",
  57: "dense freezing drizzle",
  61: "slight rain",
  63: "moderate rain",
  65: "heavy rain",
  66: "light freezing rain",
  67: "heavy freezing rain",
  71: "slight snowfall",
  73: "moderate snowfall",
  75: "heavy snowfall",
  77: "snow grains",
  80: "slight rain showers",
  81: "moderate rain showers",
  82: "violent rain showers",
  85: "slight snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with slight hail",
  97: "heavy thunderstorm",
  99: "thunderstorm with heavy hail",
};

export function weatherCondition(code: number): string {
  return WMO_CONDITIONS[code] ?? "unknown";
}

/** Forecast days asked for, kept within what the provider gives. */
export function clampDays(days: number | null | undefined): number {
  if (!days || !Number.isFinite(days)) return 1;
  return Math.min(MAX_FORECAST_DAYS, Math.max(1, Math.round(days)));
}

/** "Goiânia, Goiás, Brasil" — how a place is said back to the owner. */
export function placeLabel(place: Pick<Place, "name" | "region">): string {
  return place.region ? `${place.name}, ${place.region}` : place.name;
}
