import { HttpStatus } from "@nestjs/common";

export const assistantErrors = {
  invalidQuestion: {
    code: "ASSISTANT_INVALID_QUESTION",
    status: HttpStatus.BAD_REQUEST,
    message: "Não entendi a pergunta. Tente de novo.",
  },
  conversationNotFound: {
    code: "ASSISTANT_CONVERSATION_NOT_FOUND",
    status: HttpStatus.NOT_FOUND,
    message: "Conversa não encontrada.",
  },
  quotaExceeded: {
    code: "ASSISTANT_QUOTA_EXCEEDED",
    status: HttpStatus.TOO_MANY_REQUESTS,
    message:
      "Atingi o limite gratuito de perguntas por agora. Tente de novo mais tarde.",
  },
  unavailable: {
    code: "ASSISTANT_UNAVAILABLE",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: "Não consegui pensar numa resposta agora. Tente de novo.",
  },
} as const;
