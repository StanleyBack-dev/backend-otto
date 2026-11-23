import { Injectable } from "@nestjs/common";
import type {
  AssistantTool,
  ToolContext,
} from "@/modules/assistant/domain/assistant-tool";
import { GetWeatherUseCase } from "@/modules/weather/application/use-cases/get-weather.use-case";
import { MAX_FORECAST_DAYS } from "@/modules/weather/domain/weather";

// "Qual o clima agora?", "Vai chover amanhã?", "E em Lisboa?"
@Injectable()
export class WeatherTool implements AssistantTool {
  readonly name = "get_weather";
  readonly description =
    "Current weather and the daily forecast. Without `place`, uses the owner's saved location. Use it for any question about weather, temperature, rain or what to wear.";
  readonly parameters = {
    type: "object" as const,
    properties: {
      place: {
        type: "string" as const,
        description:
          "City named in the question, e.g. 'Lisboa' or 'Goiânia, Goiás'. Omit for the owner's location.",
      },
      days: {
        type: "integer" as const,
        description: `Forecast days from today (1-${MAX_FORECAST_DAYS}). 1 = today only, 2 = today and tomorrow.`,
      },
    },
  };

  constructor(private readonly weather: GetWeatherUseCase) {}

  async execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<Record<string, unknown>> {
    const result = await this.weather.execute({
      place: typeof args.place === "string" ? args.place : null,
      days: typeof args.days === "number" ? args.days : null,
      saved: context.location,
      timeZone: context.timeZone,
      language: context.language,
    });
    switch (result.status) {
      case "location_unknown":
        return {
          error:
            "The owner's location is not saved yet. Ask which city, or tell them to share the location in the app settings.",
        };
      case "place_not_found":
        return { error: `No place found named "${result.place}".` };
      default:
        return {
          place: result.place,
          timeZone: result.forecast.timeZone,
          current: result.forecast.current,
          days: result.forecast.days,
          units: "temperature °C, wind km/h, precipitation mm",
        };
    }
  }
}
