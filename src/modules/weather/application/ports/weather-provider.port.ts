import type {
  Coordinates,
  Forecast,
  Place,
} from "@/modules/weather/domain/weather";

export class WeatherProviderError extends Error {
  constructor(
    message: string,
    /** Timeout, network or server error: worth one more try. */
    readonly retryable = false,
  ) {
    super(message);
    this.name = "WeatherProviderError";
  }
}

// Weather data source (Open-Meteo today). Throws WeatherProviderError when
// the provider cannot answer.
export interface WeatherProviderPort {
  forecast(
    at: Coordinates,
    options: { days: number; timeZone: string },
  ): Promise<Forecast>;
  /** Places matching a name, best match first. */
  searchPlaces(
    name: string,
    options: { language: string; limit: number },
  ): Promise<Place[]>;
}

export const WEATHER_PROVIDER = Symbol("WEATHER_PROVIDER");
