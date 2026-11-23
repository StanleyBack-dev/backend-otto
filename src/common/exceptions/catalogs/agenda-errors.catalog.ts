import { HttpStatus } from "@nestjs/common";

export const agendaErrors = {
  notConnected: {
    code: "AGENDA_NOT_CONNECTED",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: "A agenda ainda não está conectada ao Otto.",
  },
  unavailable: {
    code: "AGENDA_UNAVAILABLE",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: "Não consegui ler a sua agenda agora. Tente de novo.",
  },
} as const;
