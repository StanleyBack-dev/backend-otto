import type { ToolContext } from "@/modules/assistant/domain/assistant-tool";
import {
  WeatherProviderError,
  type WeatherProviderPort,
} from "@/modules/weather/application/ports/weather-provider.port";
import { WeatherTool } from "@/modules/weather/application/tools/weather.tool";
import { GetWeatherUseCase } from "@/modules/weather/application/use-cases/get-weather.use-case";
import {
  clampDays,
  placeLabel,
  weatherCondition,
  type Forecast,
} from "@/modules/weather/domain/weather";
import { OpenMeteoAdapter } from "@/modules/weather/infrastructure/open-meteo.adapter";

const FORECAST: Forecast = {
  timeZone: "America/Sao_Paulo",
  current: {
    time: "2026-11-23T15:00",
    temperatureC: 31,
    feelsLikeC: 33,
    humidityPercent: 40,
    precipitationMm: 0,
    windKmh: 9,
    isDay: true,
    weatherCode: 2,
    condition: "partly cloudy",
  },
  days: [],
};

function provider(): jest.Mocked<WeatherProviderPort> {
  return {
    forecast: jest.fn().mockResolvedValue(FORECAST),
    searchPlaces: jest.fn().mockResolvedValue([
      {
        name: "Lisboa",
        region: "Lisboa, Portugal",
        countryCode: "PT",
        latitude: 38.72,
        longitude: -9.14,
        timeZone: "Europe/Lisbon",
      },
    ]),
  };
}

const context: ToolContext = {
  userId: "u1",
  timeZone: "America/Sao_Paulo",
  language: "pt-BR",
  location: { name: "Goiânia - GO", latitude: -16.69, longitude: -49.26 },
  now: new Date("2026-11-23T18:00:00Z"),
};

describe("weather domain", () => {
  it("labels WMO codes and keeps days in range", () => {
    expect(weatherCondition(63)).toBe("moderate rain");
    expect(weatherCondition(1234)).toBe("unknown");
    expect(clampDays(undefined)).toBe(1);
    expect(clampDays(30)).toBe(7);
    expect(clampDays(0)).toBe(1);
    expect(placeLabel({ name: "Goiânia", region: "Goiás, Brasil" })).toBe(
      "Goiânia, Goiás, Brasil",
    );
  });
});

describe("GetWeatherUseCase", () => {
  it("uses the saved location and caches the forecast", async () => {
    const p = provider();
    const useCase = new GetWeatherUseCase(p);
    const request = {
      saved: { name: "Goiânia - GO", latitude: -16.69, longitude: -49.26 },
      timeZone: "America/Sao_Paulo",
      language: "pt-BR",
    };
    const result = await useCase.execute(request);
    await useCase.execute(request);
    expect(result).toMatchObject({ status: "ok", place: "Goiânia - GO" });
    expect(p.forecast).toHaveBeenCalledTimes(1);
    expect(p.forecast).toHaveBeenCalledWith(
      { name: "Goiânia - GO", latitude: -16.69, longitude: -49.26 },
      { days: 1, timeZone: "America/Sao_Paulo" },
    );
  });

  it("looks up a named place in its own time zone", async () => {
    const p = provider();
    const result = await new GetWeatherUseCase(p).execute({
      place: "Lisboa",
      days: 3,
      saved: null,
      timeZone: "America/Sao_Paulo",
      language: "pt-BR",
    });
    expect(result).toMatchObject({
      status: "ok",
      place: "Lisboa, Lisboa, Portugal",
    });
    expect(p.forecast).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 38.72 }),
      { days: 3, timeZone: "Europe/Lisbon" },
    );
  });

  it("says when the location is unknown or the place does not exist", async () => {
    const p = provider();
    p.searchPlaces.mockResolvedValue([]);
    const useCase = new GetWeatherUseCase(p);
    const base = { timeZone: "UTC", language: "pt-BR", saved: null };
    await expect(useCase.execute(base)).resolves.toEqual({
      status: "location_unknown",
    });
    await expect(useCase.execute({ ...base, place: "Xyz" })).resolves.toEqual({
      status: "place_not_found",
      place: "Xyz",
    });
  });
});

describe("WeatherTool", () => {
  it("returns the forecast for the owner's location", async () => {
    const tool = new WeatherTool(new GetWeatherUseCase(provider()));
    const result = await tool.execute({ days: 2 }, context);
    expect(result).toMatchObject({
      place: "Goiânia - GO",
      current: { temperatureC: 31, condition: "partly cloudy" },
    });
  });

  it("tells the model when it needs a city", async () => {
    const tool = new WeatherTool(new GetWeatherUseCase(provider()));
    const result = await tool.execute({}, { ...context, location: null });
    expect(result.error).toContain("not saved");
  });
});

describe("OpenMeteoAdapter", () => {
  afterEach(() => jest.restoreAllMocks());

  const json = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

  it("maps the forecast response", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(() =>
      json(200, {
        timezone: "America/Sao_Paulo",
        current: {
          time: "2026-11-23T15:00",
          temperature_2m: 30.4,
          apparent_temperature: 32,
          relative_humidity_2m: 41,
          precipitation: 0,
          weather_code: 61,
          wind_speed_10m: 7.2,
          is_day: 1,
        },
        daily: {
          time: ["2026-11-23"],
          weather_code: [80],
          temperature_2m_max: [32],
          temperature_2m_min: [20],
          precipitation_probability_max: [70],
          precipitation_sum: [4.2],
        },
      }),
    );
    const forecast = await new OpenMeteoAdapter().forecast(
      { latitude: -16.69, longitude: -49.26 },
      { days: 1, timeZone: "America/Sao_Paulo" },
    );
    expect(forecast.current).toMatchObject({
      temperatureC: 30.4,
      isDay: true,
      condition: "slight rain",
    });
    expect(forecast.days[0]).toMatchObject({
      maxC: 32,
      precipitationChancePercent: 70,
      condition: "slight rain showers",
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("forecast_days=1");
    expect(url).toContain("timezone=America%2FSao_Paulo");
  });

  it("maps places and fails clearly", async () => {
    jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(() =>
        json(200, {
          results: [
            {
              name: "Goiânia",
              latitude: -16.68,
              longitude: -49.25,
              country: "Brasil",
              country_code: "BR",
              admin1: "Goiás",
              timezone: "America/Sao_Paulo",
            },
          ],
        }),
      )
      .mockImplementationOnce(() => json(400, { error: true, reason: "bad" }));
    const adapter = new OpenMeteoAdapter();
    await expect(
      adapter.searchPlaces("Goiania", { language: "pt-BR", limit: 5 }),
    ).resolves.toEqual([
      {
        name: "Goiânia",
        region: "Goiás, Brasil",
        countryCode: "BR",
        latitude: -16.68,
        longitude: -49.25,
        timeZone: "America/Sao_Paulo",
      },
    ]);
    await expect(
      adapter.forecast(
        { latitude: 0, longitude: 0 },
        { days: 1, timeZone: "UTC" },
      ),
    ).rejects.toBeInstanceOf(WeatherProviderError);
  });
});
