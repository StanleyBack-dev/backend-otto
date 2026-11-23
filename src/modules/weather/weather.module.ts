import { Module, type OnModuleInit } from "@nestjs/common";
import { AssistantToolRegistry } from "@/modules/assistant/application/assistant-tool.registry";
import { AssistantModule } from "@/modules/assistant/assistant.module";
import { IdentityModule } from "@/modules/identity/identity.module";
import { WEATHER_PROVIDER } from "@/modules/weather/application/ports/weather-provider.port";
import { WeatherTool } from "@/modules/weather/application/tools/weather.tool";
import { GetWeatherUseCase } from "@/modules/weather/application/use-cases/get-weather.use-case";
import { SearchPlacesUseCase } from "@/modules/weather/application/use-cases/search-places.use-case";
import { OpenMeteoAdapter } from "@/modules/weather/infrastructure/open-meteo.adapter";
import { WeatherResolver } from "@/modules/weather/presentation/graphql/weather.resolver";

// Weather now and forecast (Open-Meteo) for the app and the assistant.
@Module({
  imports: [AssistantModule, IdentityModule],
  providers: [
    GetWeatherUseCase,
    SearchPlacesUseCase,
    WeatherTool,
    WeatherResolver,
    { provide: WEATHER_PROVIDER, useClass: OpenMeteoAdapter },
  ],
  exports: [GetWeatherUseCase],
})
export class WeatherModule implements OnModuleInit {
  constructor(
    private readonly tools: AssistantToolRegistry,
    private readonly weatherTool: WeatherTool,
  ) {}

  onModuleInit(): void {
    this.tools.register(this.weatherTool);
  }
}
