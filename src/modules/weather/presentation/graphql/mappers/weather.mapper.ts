import type { Forecast, Place } from "@/modules/weather/domain/weather";
import type { PlaceOutput } from "@/modules/weather/presentation/graphql/dto/outputs/place.output";
import type { WeatherOutput } from "@/modules/weather/presentation/graphql/dto/outputs/weather.output";

// The condition labels stay out of the API: the app shows its own icon and
// text from the WMO code.
export function toWeatherOutput(
  place: string,
  forecast: Forecast,
): WeatherOutput {
  const now = forecast.current;
  return {
    place,
    timeZone: forecast.timeZone,
    current: {
      time: now.time,
      temperatureC: now.temperatureC,
      feelsLikeC: now.feelsLikeC,
      humidityPercent: now.humidityPercent,
      precipitationMm: now.precipitationMm,
      windKmh: now.windKmh,
      isDay: now.isDay,
      weatherCode: now.weatherCode,
    },
    days: forecast.days.map((day) => ({
      date: day.date,
      minC: day.minC,
      maxC: day.maxC,
      precipitationChancePercent: day.precipitationChancePercent,
      precipitationMm: day.precipitationMm,
      weatherCode: day.weatherCode,
    })),
  };
}

export function toPlaceOutput(place: Place): PlaceOutput {
  return {
    name: place.name,
    region: place.region,
    countryCode: place.countryCode,
    latitude: place.latitude,
    longitude: place.longitude,
    timeZone: place.timeZone,
  };
}
