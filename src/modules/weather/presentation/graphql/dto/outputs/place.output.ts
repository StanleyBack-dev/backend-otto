import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PlaceOutput {
  @Field()
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: "Estado e país, ex.: Goiás, Brasil.",
  })
  region!: string | null;

  @Field(() => String, { nullable: true })
  countryCode!: string | null;

  @Field(() => Float)
  latitude!: number;

  @Field(() => Float)
  longitude!: number;

  @Field(() => String, { nullable: true, description: "Fuso IANA." })
  timeZone!: string | null;
}
