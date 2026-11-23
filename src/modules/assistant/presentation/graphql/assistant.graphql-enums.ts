import { registerEnumType } from "@nestjs/graphql";
import { MessageRole } from "@/modules/assistant/domain/conversation";

registerEnumType(MessageRole, {
  name: "MessageRole",
  description: "Quem disse a mensagem.",
});

export { MessageRole };
