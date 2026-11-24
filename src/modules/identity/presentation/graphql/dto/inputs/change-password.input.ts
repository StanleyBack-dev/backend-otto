import { Field, InputType } from "@nestjs/graphql";
import { IsString, Length } from "class-validator";

@InputType()
export class ChangePasswordInput {
  @Field()
  @IsString()
  @Length(1, 200)
  currentPassword!: string;

  @Field()
  @IsString()
  @Length(1, 200)
  newPassword!: string;
}
