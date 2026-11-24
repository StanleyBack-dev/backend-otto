import { Args, Int, Query, Resolver } from "@nestjs/graphql";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import { WeatherProviderError } from "@/modules/weather/application/ports/weather-provider.port";
import { GetWeatherUseCase } from "@/modules/weather/application/use-cases/get-weather.use-case";
import { SearchPlacesUseCase } from "@/modules/weather/application/use-cases/search-places.use-case";
import { PlaceOutput } from "@/modules/weather/presentation/graphql/dto/outputs/place.output";
import { WeatherOutput } from "@/modules/weather/presentation/graphql/dto/outputs/weather.output";
import {
  toPlaceOutput,
  toWeatherOutput,
} from "@/modules/weather/presentation/graphql/mappers/weather.mapper";

// For the app screens (weather card, choosing the city). The assistant uses
// the same data through the get_weather tool.
@Resolver()
export class WeatherResolver {
  constructor(
    private readonly getWeather: GetWeatherUseCase,
    private readonly places: SearchPlacesUseCase,
    private readonly settings: MySettingsUseCase,
  ) {}

  @Query(() => WeatherOutput, {
    description: "Clima agora e previsão; sem `place`, na sua localização.",
  })
  async weather(
    @CurrentUser() user: AuthenticatedUser,
    @Args("place", { type: () => String, nullable: true }) place?: string,
    @Args("days", { type: () => Int, nullable: true }) days?: number,
  ): Promise<WeatherOutput> {
    const settings = await this.settings.forUser(user.id);
    const result = await this.guard(() =>
      this.getWeather.execute({
        place,
        days,
        saved: settings.location,
        timeZone: settings.timeZone,
        language: settings.language,
      }),
    );
    if (result.status === "location_unknown") {
      throw AppException.from(APP_ERRORS.weather.locationRequired, undefined);
    }
    if (result.status === "place_not_found") {
      throw AppException.from(APP_ERRORS.weather.placeNotFound, {
        place: result.place,
      });
    }
    return toWeatherOutput(result.place, result.forecast);
  }

  @Query(() => [PlaceOutput], {
    description: "Busca cidades pelo nome (para escolher a localização).",
  })
  async searchPlaces(
    @CurrentUser() user: AuthenticatedUser,
    @Args("name") name: string,
  ): Promise<PlaceOutput[]> {
    const settings = await this.settings.forUser(user.id);
    const places = await this.guard(() =>
      this.places.execute(name.slice(0, 100), settings.language),
    );
    return places.map(toPlaceOutput);
  }

  private async guard<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof WeatherProviderError) {
        throw AppException.from(APP_ERRORS.weather.unavailable, undefined);
      }
      throw error;
    }
  }
}
