import { Inject, Injectable } from "@nestjs/common";
import {
  WEATHER_PROVIDER,
  type WeatherProviderPort,
} from "@/modules/weather/application/ports/weather-provider.port";
import {
  clampDays,
  placeLabel,
  type Coordinates,
  type Forecast,
} from "@/modules/weather/domain/weather";

export type WeatherRequest = {
  /** A place named in the question ("e em Lisboa?"); wins over `saved`. */
  place?: string | null;
  /** The last location saved in the settings. */
  saved: (Coordinates & { name: string | null }) | null;
  days?: number | null;
  timeZone: string;
  language: string;
};

export type WeatherResult =
  | { status: "ok"; place: string; forecast: Forecast }
  | { status: "location_unknown" }
  | { status: "place_not_found"; place: string };

// The weather where the owner is (last saved location) or at a place they
// name. Results are cached for a few minutes: the weather barely changes
// and the desktop app may ask often.
@Injectable()
export class GetWeatherUseCase {
  private static readonly CACHE_MS = 10 * 60_000;
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: Forecast }
  >();

  constructor(
    @Inject(WEATHER_PROVIDER) private readonly provider: WeatherProviderPort,
  ) {}

  async execute(request: WeatherRequest): Promise<WeatherResult> {
    const days = clampDays(request.days);
    const named = request.place?.trim();
    if (named) {
      const [place] = await this.provider.searchPlaces(named, {
        language: request.language,
        limit: 1,
      });
      if (!place) return { status: "place_not_found", place: named };
      return {
        status: "ok",
        place: placeLabel(place),
        forecast: await this.forecast(place, {
          days,
          timeZone: place.timeZone ?? request.timeZone,
        }),
      };
    }
    if (!request.saved) return { status: "location_unknown" };
    return {
      status: "ok",
      place: request.saved.name ?? "sua localização",
      forecast: await this.forecast(request.saved, {
        days,
        timeZone: request.timeZone,
      }),
    };
  }

  private async forecast(
    at: Coordinates,
    options: { days: number; timeZone: string },
  ): Promise<Forecast> {
    // ~1 km grid: nearby positions share the entry.
    const key = [
      at.latitude.toFixed(2),
      at.longitude.toFixed(2),
      options.days,
      options.timeZone,
    ].join("|");
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return hit.value;
    const value = await this.provider.forecast(at, options);
    if (this.cache.size > 200) this.cache.clear();
    this.cache.set(key, {
      expiresAt: now + GetWeatherUseCase.CACHE_MS,
      value,
    });
    return value;
  }
}
