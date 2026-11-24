import { Injectable } from "@nestjs/common";
import {
  WeatherProviderError,
  type WeatherProviderPort,
} from "@/modules/weather/application/ports/weather-provider.port";
import {
  weatherCondition,
  type Coordinates,
  type Forecast,
  type Place,
} from "@/modules/weather/domain/weather";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const TIMEOUT_MS = 6_000;

const CURRENT = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "is_day",
];
const DAILY = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "precipitation_sum",
];

type ForecastResponse = {
  timezone: string;
  current: Record<string, number | string>;
  daily: Record<string, (number | null)[]> & { time: string[] };
};

type GeocodingResponse = {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    timezone?: string;
  }[];
};

// Open-Meteo: free for non-commercial use, no key (data CC BY 4.0, places
// from GeoNames).
@Injectable()
export class OpenMeteoAdapter implements WeatherProviderPort {
  async forecast(
    at: Coordinates,
    options: { days: number; timeZone: string },
  ): Promise<Forecast> {
    const params = new URLSearchParams({
      latitude: String(at.latitude),
      longitude: String(at.longitude),
      current: CURRENT.join(","),
      daily: DAILY.join(","),
      timezone: options.timeZone || "auto",
      forecast_days: String(options.days),
    });
    const data = await this.get<ForecastResponse>(`${FORECAST_URL}?${params}`);
    const c = data.current;
    const d = data.daily;
    const number = (value: unknown) => Number(value ?? 0);
    return {
      timeZone: data.timezone,
      current: {
        time: String(c.time),
        temperatureC: number(c.temperature_2m),
        feelsLikeC: number(c.apparent_temperature),
        humidityPercent: number(c.relative_humidity_2m),
        precipitationMm: number(c.precipitation),
        windKmh: number(c.wind_speed_10m),
        isDay: number(c.is_day) === 1,
        weatherCode: number(c.weather_code),
        condition: weatherCondition(number(c.weather_code)),
      },
      days: d.time.map((date, i) => ({
        date,
        minC: number(d.temperature_2m_min[i]),
        maxC: number(d.temperature_2m_max[i]),
        precipitationChancePercent: d.precipitation_probability_max[i] ?? null,
        precipitationMm: number(d.precipitation_sum[i]),
        weatherCode: number(d.weather_code[i]),
        condition: weatherCondition(number(d.weather_code[i])),
      })),
    };
  }

  async searchPlaces(
    name: string,
    options: { language: string; limit: number },
  ): Promise<Place[]> {
    const params = new URLSearchParams({
      name,
      count: String(options.limit),
      // The API takes the language code only ("pt", not "pt-BR").
      language: options.language.split("-")[0].toLowerCase(),
      format: "json",
    });
    const data = await this.get<GeocodingResponse>(
      `${GEOCODING_URL}?${params}`,
    );
    return (data.results ?? []).map((result) => ({
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      region:
        [result.admin1, result.country].filter(Boolean).join(", ") || null,
      countryCode: result.country_code ?? null,
      timeZone: result.timezone ?? null,
    }));
  }

  // One retry for a slow or failing moment of the service (it happens), never
  // for a bad request. Both attempts fit well inside the 60 s function.
  private async get<T>(url: string): Promise<T> {
    try {
      return await this.getOnce<T>(url);
    } catch (error) {
      if (error instanceof WeatherProviderError && !error.retryable)
        throw error;
      return this.getOnce<T>(url);
    }
  }

  private async getOnce<T>(url: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      throw new WeatherProviderError(
        `Open-Meteo unreachable: ${error instanceof Error ? error.message : "unknown"}`,
        true,
      );
    }
    if (response.status >= 500) {
      throw new WeatherProviderError(`Open-Meteo ${response.status}`, true);
    }
    const body = (await response.json().catch(() => null)) as
      (T & { error?: boolean; reason?: string }) | null;
    if (!response.ok || !body || body.error) {
      throw new WeatherProviderError(
        `Open-Meteo ${response.status}: ${body?.reason ?? "invalid response"}`,
      );
    }
    return body;
  }
}
