import { Field, Float, InputType } from "@nestjs/graphql";
import { IsNumber, IsOptional, IsString, Length } from "class-validator";

// Sent by a device (GPS, Windows location) or typed by the owner.
@InputType()
export class UpdateLocationInput {
  @Field(() => Float)
  @IsNumber()
  latitude!: number;

  @Field(() => Float)
  @IsNumber()
  longitude!: number;

  @Field({ nullable: true, description: "Nome do lugar, ex.: Goiânia - GO." })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @Field({
    nullable: true,
    description: "Fuso IANA do dispositivo; quando enviado, passa a valer.",
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  timeZone?: string;
}
