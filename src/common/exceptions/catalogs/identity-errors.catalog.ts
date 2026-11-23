import { HttpStatus } from "@nestjs/common";

export const identityErrors = {
  invalidCredentials: {
    code: "IDENTITY_INVALID_CREDENTIALS",
    status: HttpStatus.UNAUTHORIZED,
    message: "E-mail ou senha incorretos.",
  },
  accountLocked: {
    code: "IDENTITY_ACCOUNT_LOCKED",
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: ({ minutes }: { minutes: number }) =>
      `Muitas tentativas. Tente de novo em ${minutes} minuto(s).`,
  },
  userInactive: {
    code: "IDENTITY_USER_INACTIVE",
    status: HttpStatus.FORBIDDEN,
    message: "Esta conta está desativada.",
  },
  sessionRequired: {
    code: "IDENTITY_SESSION_REQUIRED",
    status: HttpStatus.UNAUTHORIZED,
    message: "Faça login para continuar.",
  },
  sessionExpired: {
    code: "IDENTITY_SESSION_EXPIRED",
    status: HttpStatus.UNAUTHORIZED,
    message: "Sua sessão expirou.",
  },
  refreshInvalid: {
    code: "IDENTITY_REFRESH_INVALID",
    status: HttpStatus.UNAUTHORIZED,
    message: "Sessão encerrada. Faça login de novo.",
  },
  wrongCurrentPassword: {
    code: "IDENTITY_WRONG_CURRENT_PASSWORD",
    status: HttpStatus.BAD_REQUEST,
    message: "A senha atual está incorreta.",
  },
  weakPassword: {
    code: "IDENTITY_WEAK_PASSWORD",
    status: HttpStatus.BAD_REQUEST,
    message: ({ rules }: { rules: string }) =>
      `A nova senha precisa ter: ${rules}.`,
  },
  deviceNotFound: {
    code: "IDENTITY_DEVICE_NOT_FOUND",
    status: HttpStatus.NOT_FOUND,
    message: "Dispositivo não encontrado.",
  },
  invalidSettings: {
    code: "IDENTITY_INVALID_SETTINGS",
    status: HttpStatus.BAD_REQUEST,
    message: ({ reason }: { reason: string }) => reason,
  },
} as const;
