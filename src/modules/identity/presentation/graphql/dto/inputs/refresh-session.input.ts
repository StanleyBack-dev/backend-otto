import { Field, InputType } from "@nestjs/graphql";
import { IsString, Length } from "class-validator";

@InputType()
export class RefreshSessionInput {
  @Field()
  @IsString()
  @Length(40, 300)
  refreshToken!: string;
}
