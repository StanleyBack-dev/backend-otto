import { Inject, Injectable } from "@nestjs/common";
import {
  WEATHER_PROVIDER,
  type WeatherProviderPort,
} from "@/modules/weather/application/ports/weather-provider.port";
import type { Place } from "@/modules/weather/domain/weather";

// Finds a city by name, so the owner can set the location by typing it
// (the app then saves the chosen one with updateMyLocation).
@Injectable()
export class SearchPlacesUseCase {
  constructor(
    @Inject(WEATHER_PROVIDER) private readonly provider: WeatherProviderPort,
  ) {}

  execute(name: string, language: string): Promise<Place[]> {
    const query = name.trim();
    if (query.length < 2) return Promise.resolve([]);
    return this.provider.searchPlaces(query, { language, limit: 5 });
  }
}
