import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CurrentWeatherOutput {
  @Field({ description: "Hora local da medição (ISO 8601)." })
  time!: string;

  @Field(() => Float)
  temperatureC!: number;

  @Field(() => Float)
  feelsLikeC!: number;

  @Field(() => Float)
  humidityPercent!: number;

  @Field(() => Float)
  precipitationMm!: number;

  @Field(() => Float)
  windKmh!: number;

  @Field()
  isDay!: boolean;

  @Field(() => Int, { description: "Código WMO da condição." })
  weatherCode!: number;
}

@ObjectType()
export class DailyForecastOutput {
  @Field({ description: "YYYY-MM-DD no fuso do lugar." })
  date!: string;

  @Field(() => Float)
  minC!: number;

  @Field(() => Float)
  maxC!: number;

  @Field(() => Float, { nullable: true })
  precipitationChancePercent!: number | null;

  @Field(() => Float)
  precipitationMm!: number;

  @Field(() => Int)
  weatherCode!: number;
}

@ObjectType()
export class WeatherOutput {
  @Field()
  place!: string;

  @Field()
  timeZone!: string;

  @Field(() => CurrentWeatherOutput)
  current!: CurrentWeatherOutput;

  @Field(() => [DailyForecastOutput])
  days!: DailyForecastOutput[];
}
