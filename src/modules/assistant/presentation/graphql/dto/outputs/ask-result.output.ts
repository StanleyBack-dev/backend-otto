import { Field, ObjectType } from "@nestjs/graphql";
import { ConversationOutput } from "@/modules/assistant/presentation/graphql/dto/outputs/conversation.output";
import { MessageOutput } from "@/modules/assistant/presentation/graphql/dto/outputs/message.output";

@ObjectType()
export class AskResultOutput {
  @Field(() => ConversationOutput)
  conversation!: ConversationOutput;

  @Field(() => MessageOutput)
  question!: MessageOutput;

  @Field(() => MessageOutput, { description: "A resposta, pronta para falar." })
  answer!: MessageOutput;

  @Field(() => [String], {
    description: "Ferramentas consultadas (clima, agenda…).",
  })
  toolsUsed!: string[];
}
