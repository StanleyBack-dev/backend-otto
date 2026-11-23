import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsEnum, IsString, Length, MaxLength } from "class-validator";
import { DevicePlatform } from "@/modules/identity/presentation/graphql/identity.graphql-enums";

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Field()
  @IsString()
  @Length(1, 200)
  password!: string;

  @Field({
    description: "Nome que identifica o dispositivo (ex.: PC do quarto).",
  })
  @IsString()
  @Length(1, 60)
  deviceName!: string;

  @Field(() => DevicePlatform)
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}
