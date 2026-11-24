import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString, IsUrl, Length } from "class-validator";

@InputType()
export class AddNewsSourceInput {
  @Field({ description: "Endereço do feed RSS ou Atom." })
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @Length(10, 1000)
  url!: string;

  @Field({ description: "Ex.: geral, tecnologia, economia, Goiânia." })
  @IsString()
  @Length(2, 40)
  category!: string;

  @Field({ nullable: true, description: "Sem ele, usa o título do feed." })
  @IsOptional()
  @IsString()
  @Length(2, 60)
  name?: string;
}
