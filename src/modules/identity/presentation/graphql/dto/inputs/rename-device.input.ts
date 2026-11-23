import { Field, ID, InputType } from "@nestjs/graphql";
import { IsString, IsUUID, Length } from "class-validator";

@InputType()
export class RenameDeviceInput {
  @Field(() => ID)
  @IsUUID()
  deviceId!: string;

  @Field()
  @IsString()
  @Length(1, 60)
  name!: string;
}
