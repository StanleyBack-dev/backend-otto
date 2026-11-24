import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LocationOutput {
  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => Float)
  latitude!: number;

  @Field(() => Float)
  longitude!: number;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class SettingsOutput {
  @Field()
  assistantName!: string;

  @Field()
  language!: string;

  @Field()
  timeZone!: string;

  @Field(() => LocationOutput, {
    nullable: true,
    description: "Última localização conhecida (null: ainda não informada).",
  })
  location!: LocationOutput | null;

  @Field(() => Float)
  speechRate!: number;

  @Field()
  autoSpeak!: boolean;

  @Field()
  wakeWordEnabled!: boolean;

  @Field()
  briefingEnabled!: boolean;

  @Field({ description: "Hora local do resumo (HH:mm)." })
  briefingTime!: string;
}
