import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Paginated } from "@/common/graphql/pagination.graphql";
import { MessageRole } from "@/modules/assistant/presentation/graphql/assistant.graphql-enums";

@ObjectType()
export class MessageOutput {
  @Field(() => ID)
  id!: string;

  @Field(() => MessageRole)
  role!: MessageRole;

  @Field()
  text!: string;

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class MessagePage extends Paginated(MessageOutput, "MessagePage") {}
