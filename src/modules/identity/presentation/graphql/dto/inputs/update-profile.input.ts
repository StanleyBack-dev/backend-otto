import { Field, InputType } from "@nestjs/graphql";
import { IsString, Length } from "class-validator";

@InputType()
export class UpdateProfileInput {
  @Field({ description: "Como o assistente chama você." })
  @IsString()
  @Length(1, 120)
  name!: string;
}
