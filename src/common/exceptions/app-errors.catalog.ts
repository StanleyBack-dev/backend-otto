import { agendaErrors } from "@/common/exceptions/catalogs/agenda-errors.catalog";
import type { AppErrorDefinition } from "@/common/exceptions/app-error-definition.type";
import { assistantErrors } from "@/common/exceptions/catalogs/assistant-errors.catalog";
import { authErrors } from "@/common/exceptions/catalogs/auth-errors.catalog";
import { identityErrors } from "@/common/exceptions/catalogs/identity-errors.catalog";
import { weatherErrors } from "@/common/exceptions/catalogs/weather-errors.catalog";

// One catalog per area (common/exceptions/catalogs). Messages are
// user-facing, so they are written in Portuguese.
export const APP_ERRORS = {
  auth: authErrors,
  assistant: assistantErrors,
  identity: identityErrors,
  agenda: agendaErrors,
  weather: weatherErrors,
} as const satisfies Record<string, Record<string, AppErrorDefinition<never>>>;
