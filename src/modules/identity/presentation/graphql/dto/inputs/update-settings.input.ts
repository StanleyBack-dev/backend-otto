import { Field, Float, InputType } from "@nestjs/graphql";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

// Only the fields sent change; the domain validates the values.
@InputType()
export class UpdateSettingsInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  assistantName?: string;

  @Field({ nullable: true, description: "Ex.: pt-BR, en-US." })
  @IsOptional()
  @IsString()
  @Length(2, 35)
  language?: string;

  @Field({ nullable: true, description: "Fuso IANA, ex.: America/Sao_Paulo." })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  timeZone?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  speechRate?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  autoSpeak?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  wakeWordEnabled?: boolean;
}
