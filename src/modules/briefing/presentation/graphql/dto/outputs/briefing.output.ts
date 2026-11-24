import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Paginated } from "@/common/graphql/pagination.graphql";

@ObjectType()
export class BriefingOutput {
  @Field(() => ID)
  id!: string;

  @Field({ description: "Data local (YYYY-MM-DD)." })
  date!: string;

  @Field({ description: "Texto pronto para falar." })
  text!: string;

  @Field({ description: "false: escrito sem a IA (modelo indisponível)." })
  writtenByModel!: boolean;

  @Field(() => [String], {
    description: "Partes que não puderam ser lidas (agenda, weather, news).",
  })
  unavailable!: string[];

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class BriefingPage extends Paginated(BriefingOutput, "BriefingPage") {}
