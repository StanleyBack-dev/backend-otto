import { HttpStatus } from "@nestjs/common";

export const newsErrors = {
  invalidFeedUrl: {
    code: "NEWS_INVALID_FEED_URL",
    status: HttpStatus.BAD_REQUEST,
    message: "Informe o endereço público (http ou https) do feed RSS.",
  },
  unreadableFeed: {
    code: "NEWS_UNREADABLE_FEED",
    status: HttpStatus.BAD_REQUEST,
    message:
      "Não consegui ler um feed RSS ou Atom nesse endereço. Confira o link do feed.",
  },
  duplicateSource: {
    code: "NEWS_DUPLICATE_SOURCE",
    status: HttpStatus.CONFLICT,
    message: "Você já segue esse feed.",
  },
  tooManySources: {
    code: "NEWS_TOO_MANY_SOURCES",
    status: HttpStatus.BAD_REQUEST,
    message: ({ max }: { max: number }) =>
      `Você pode seguir até ${max} fontes de notícias.`,
  },
  invalidSource: {
    code: "NEWS_INVALID_SOURCE",
    status: HttpStatus.BAD_REQUEST,
    message: ({ reason }: { reason: string }) => reason,
  },
  sourceNotFound: {
    code: "NEWS_SOURCE_NOT_FOUND",
    status: HttpStatus.NOT_FOUND,
    message: "Fonte de notícias não encontrada.",
  },
} as const;
