import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Paginated } from "@/common/graphql/pagination.graphql";

@ObjectType()
export class ConversationOutput {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  createdAt!: Date;

  @Field({ description: "Último uso." })
  updatedAt!: Date;
}

@ObjectType()
export class ConversationPage extends Paginated(
  ConversationOutput,
  "ConversationPage",
) {}
