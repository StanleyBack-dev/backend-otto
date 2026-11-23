import { HttpStatus } from "@nestjs/common";

export const authErrors = {
  invalidClientKey: {
    code: "AUTH_INVALID_CLIENT_KEY",
    status: HttpStatus.UNAUTHORIZED,
    message: "Requisição não autorizada.",
  },
  invalidCronSecret: {
    code: "AUTH_INVALID_CRON_SECRET",
    status: HttpStatus.UNAUTHORIZED,
    message: "Requisição de agendamento não autorizada.",
  },
} as const;
