import { Field, ID, InputType } from "@nestjs/graphql";
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";

@InputType()
export class UpdateNewsSourceInput {
  @Field(() => ID)
  @IsUUID()
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 60)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  category?: string;

  @Field({ nullable: true, description: "false pausa a coleta da fonte." })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
